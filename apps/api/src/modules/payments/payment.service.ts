import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../orders/order.service';
import { FiscalService } from '../fiscal/fiscal.service';
import { NotificationService } from '../notifications/notification.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { MetaCapiService } from '../marketing/meta-capi.service';
import { amountVar, type Lang } from '../notifications/templates';
import {
  type PaymentStatus,
  assertPaymentTransition,
} from '../../common/state-machine/order-state-machine';
import { sanitizePayload } from './webhook.util';
import type { ProviderCode } from './payment-gateway';

/**
 * Webhook hodisasini "band qilish" natijasi.
 *
 *  - `fresh`     — birinchi marta, ishlov berish kerak;
 *  - `done`      — allaqachon ishlangan, avvalgi javobni qaytarish kifoya;
 *  - `in_flight` — aynan shu payt boshqa so'rov ishlab turibdi.
 */
export type WebhookClaim = {
  status: 'fresh' | 'done' | 'in_flight';
  id: string | null;
  previousResponse: unknown;
};

/** Prisma unikal cheklov xatosi. */
function isUniqueViolation(e: unknown): boolean {
  return (e as { code?: string })?.code === 'P2002';
}

/**
 * To'lovlarning yagona kirish nuqtasi.
 *
 * Provayderlar (Click, Payme, naqd) turlicha gaplashadi, lekin BAZAGA
 * yozish faqat shu yerdan bo'ladi. Sabab oddiy: pul holati bir necha
 * joydan o'zgartirilsa, ertami-kechmi ikki joyda ikki xil mantiq paydo
 * bo'ladi va "to'landi, lekin buyurtma yangi" holati yuzaga keladi.
 */
/**
 * Buyurtma to'lovni qabul qila olmaydigan holatda.
 *
 * Bu ODATIY holat, dastur xatosi emas: mijoz to'lov oynasini ochiq
 * qoldirib, rezerv muddati tugagan bo'lishi mumkin. Provayderga aniq
 * xato qaytarish kerak — shunda PUL UMUMAN YECHILMAYDI.
 */
export class OrderNotPayableError extends Error {
  constructor(readonly orderStatus: string) {
    super(`Buyurtma "${orderStatus}" holatida — to‘lov qabul qilinmaydi`);
    this.name = 'OrderNotPayableError';
  }
}

/**
 * To'lovni qabul qilish mumkin bo'lgan buyurtma holatlari.
 *
 * `DELIVERED` ham bor: naqd to'lov aynan yetkazib berilganda yopiladi.
 * Bekor qilingan, qaytarilgan va puli qaytarilgan buyurtmalar yo'q.
 */
const PAYABLE_ORDER_STATUSES = new Set([
  'NEW',
  'CONFIRMED',
  'PROCESSING',
  'PACKING',
  'READY',
  'SHIPPED',
  'DELIVERED',
]);

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrderService,
    private readonly fiscal: FiscalService,
    private readonly notifications: NotificationService,
    private readonly loyalty: LoyaltyService,
    private readonly meta: MetaCapiService,
  ) {}

  /* ======================================================================
     O'QISH
     ====================================================================== */

  async byOrder(orderId: string) {
    return this.prisma.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      include: { transactions: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async byId(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true, transactions: true, fiscal: true },
    });
    if (!payment) throw new NotFoundException('To‘lov topilmadi');
    return payment;
  }

  /**
   * Buyurtma raqami bo'yicha to'lovni topadi.
   * Click `merchant_trans_id` sifatida AYNAN buyurtma raqamini yuboradi.
   */
  async byOrderNumber(number: string) {
    const order = await this.prisma.order.findFirst({
      where: { number: number.trim().toUpperCase(), deletedAt: null },
      select: { id: true },
    });
    if (!order) return null;
    return this.byOrder(order.id);
  }

  /* ======================================================================
     HOLATNI O'ZGARTIRISH
     ====================================================================== */

  /**
   * To'lov holatini o'zgartiradi.
   *
   * Uchta himoya:
   *  1. Holat mashinasi — `PAID` dan `PENDING` ga qaytish mumkin emas.
   *  2. Shartli `UPDATE` — bir vaqtda kelgan ikki webhook ikki marta
   *     ishlamaydi (ikkinchisi `false` oladi).
   *  3. `expect` — chaqiruvchi qaysi holatdan o'tayotganini bilishi shart.
   */
  private async transition(params: {
    paymentId: string;
    from: PaymentStatus;
    to: PaymentStatus;
    data?: Record<string, unknown>;
    /**
     * Qo'shimcha shart. Qaytarishda MAJBURIY: `PARTIALLY_REFUNDED` dan
     * yana `PARTIALLY_REFUNDED` ga o'tishda holatning o'zi qulf bo'lmaydi
     * (u o'zgarmaydi), shuning uchun `refundedAmount` ham shartga kiradi.
     */
    expect?: Record<string, unknown>;
  }): Promise<boolean> {
    assertPaymentTransition(params.from, params.to);

    const res = await this.prisma.payment.updateMany({
      where: {
        id: params.paymentId,
        status: params.from as never,
        ...(params.expect ?? {}),
      },
      data: { status: params.to as never, ...(params.data ?? {}) },
    });
    return res.count === 1;
  }

  /**
   * "To'lov boshlandi" — provayder tranzaksiya yaratdi, lekin pul hali
   * yechilmagan. Payme da bu `CreateTransaction`, Click da `Prepare`.
   */
  async markWaiting(paymentId: string, providerTxnId: string): Promise<void> {
    const payment = await this.byId(paymentId);
    if (payment.status === 'PAID') {
      throw new ConflictException({
        code: 'PAYMENT_ALREADY_PAID',
        message: 'To‘lov allaqachon qabul qilingan',
      });
    }

    // Mijoz to'lov sahifasini yopib, qaytadan boshlashi mumkin — o'shanda
    // provayder YANGI tranzaksiya identifikatori bilan keladi. Bu xato
    // emas: eski urinish tashlab yuboriladi, yangisi yoziladi.
    // Holat mashinasida WAITING -> WAITING o'tishi yo'q, shuning uchun
    // bu holatda faqat identifikator yangilanadi.
    if (payment.status === 'WAITING') {
      if (payment.providerTxnId !== providerTxnId) {
        this.logger.log(
          `To‘lov ${paymentId}: yangi urinish (${payment.providerTxnId} -> ${providerTxnId})`,
        );
        await this.prisma.payment.updateMany({
          where: { id: paymentId, status: 'WAITING' },
          data: { providerTxnId },
        });
      }
      return;
    }

    const ok = await this.transition({
      paymentId,
      from: payment.status as PaymentStatus,
      to: 'WAITING',
      data: { providerTxnId },
    });
    if (!ok) {
      throw new ConflictException('To‘lov holati o‘zgargan — qayta urinib ko‘ring');
    }
  }

  /**
   * To'lov qabul qilindi.
   *
   * Bu metod IDEMPOTENT: bir xil `providerTxnId` bilan ikkinchi marta
   * chaqirilsa hech narsa o'zgarmaydi va xato ham bermaydi — provayderlar
   * webhookni bir necha marta yuborishi normal hol.
   */
  async markPaid(params: {
    paymentId: string;
    providerTxnId: string;
    paidAt?: Date;
    /** Naqd to'lovda operator kim ekani. */
    adminId?: string;
  }): Promise<{ changed: boolean }> {
    const payment = await this.byId(params.paymentId);

    if (payment.status === 'PAID') {
      // Takroriy webhook. Tranzaksiya identifikatori boshqacha bo'lsa —
      // bu allaqachon jiddiy nomuvofiqlik, logga chiqaramiz.
      if (payment.providerTxnId && payment.providerTxnId !== params.providerTxnId) {
        this.logger.error(
          `To‘lov ${payment.id}: boshqa tranzaksiya bilan takroriy tasdiq ` +
            `(${payment.providerTxnId} != ${params.providerTxnId})`,
        );
      }
      return { changed: false };
    }

    /*
     * BUYURTMA HOLATI shu yerda tekshiriladi.
     *
     * Ilgari faqat to'lov holati tekshirilardi. Natijada quyidagi
     * ketma-ketlik pul yo'qotardi:
     *
     *   14:00  buyurtma yaratildi, rezerv 14:30 gacha
     *   14:05  Payme tranzaksiyasi ochildi (uning muddati 12 SOAT)
     *   14:31  cron rezervni bo'shatdi va buyurtmani BEKOR QILDI
     *   14:33  mijoz SMS kodini tasdiqladi -> pul yechildi
     *
     * Natijada pul olingan, tovar boshqa mijozga sotilgan, bekor
     * qilingan buyurtmaga esa fiskal chek berilgan. Moslashtirish
     * hisoboti ham buni ko'rmasdi: ikkala tomonda ham "to'langan".
     *
     * Tekshiruv ATAYLAB shu yerda — provayder darajasida emas: har bir
     * gateway uni unutishi mumkin, bu yer esa yagona o'tish nuqtasi.
     */
    const orderBefore = await this.prisma.order.findUnique({
      where: { id: payment.orderId },
      select: { status: true },
    });
    if (!orderBefore) throw new NotFoundException('Buyurtma topilmadi');
    if (!PAYABLE_ORDER_STATUSES.has(orderBefore.status)) {
      this.logger.warn(
        `To‘lov ${payment.id}: buyurtma "${orderBefore.status}" holatida, to‘lov rad etildi`,
      );
      throw new OrderNotPayableError(orderBefore.status);
    }

    const paidAt = params.paidAt ?? new Date();
    const ok = await this.transition({
      paymentId: payment.id,
      from: payment.status as PaymentStatus,
      to: 'PAID',
      data: { providerTxnId: params.providerTxnId, paidAt, failureReason: null },
    });
    if (!ok) return { changed: false };

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: 'PAID',
        paidAt,
        // To'langan buyurtma rezervi endi muddatsiz: uni cron bekor
        // qilmasligi kerak (3-etapdagi qoida).
        reservationExpiresAt: null,
      },
    });
    await this.prisma.stockReservation.updateMany({
      where: { orderId: payment.orderId, status: 'HELD' },
      data: { expiresAt: null },
    });

    // To'lov kelgach buyurtma avtomatik tasdiqlanadi: operator qo'lida
    // "to'landi, lekin hali yangi" holati qolib ketmasligi kerak.
    const order = await this.prisma.order.findUnique({
      where: { id: payment.orderId },
      select: { status: true, number: true },
    });
    if (order?.status === 'NEW') {
      try {
        await this.orders.changeStatus({
          orderId: payment.orderId,
          to: 'CONFIRMED',
          source: 'PAYMENT',
          comment: `To‘lov qabul qilindi (${payment.provider})`,
          adminId: params.adminId,
        });
      } catch (e) {
        this.logger.warn(
          `Buyurtma ${order.number} to‘lovdan keyin tasdiqlanmadi: ${(e as Error).message}`,
        );
      }
    }

    // Fiskal chek — to'lov qabul qilingan paytda (ekspertiza A-1).
    await this.fiscal.enqueueSale(payment.orderId, payment.id);

    /*
     * Sodiqlik ballari — AYNAN shu yerda, buyurtma yaratilganda emas.
     *
     * Aks holda ball ishlab chiqarish uchun buyurtma berib, to'lamay
     * qo'yish yetarli bo'lardi.
     *
     * Xato butun to'lovni YIQITMAYDI: pul allaqachon qabul qilingan va
     * uni ball tufayli orqaga qaytarish nomutanosib. Takrorlanishdan
     * himoya bazadagi unikal indeksda.
     */
    try {
      await this.loyalty.earnForOrder(payment.orderId);
    } catch (e) {
      this.logger.error(
        `Ball berilmadi (buyurtma ${payment.orderId}): ${(e as Error).message}`,
      );
    }

    // Mijozga "pul yechildi" xabari SHOSHILINCH: u tunda ham yuboriladi,
    // chunki bu uning puliga tegishli.
    await this.notify(
      payment.orderId,
      'PAYMENT_RECEIVED',
      { amount: amountVar(payment.amount as bigint) },
      params.providerTxnId,
    );

    /*
     * Facebook «Purchase» hodisasi — AYNAN shu yerda.
     *
     * Sabab `markPaid` ning idempotentligi: takroriy webhook yuqorida
     * `changed: false` bilan qaytadi va bu qatorga yetib kelmaydi.
     * Ya'ni bir buyurtma uchun hodisa BIR MARTA ketadi. Agar uni
     * buyurtma yaratilganda yoki «rahmat» sahifasida yuborsak,
     * to'lanmagan buyurtmalar ham xarid bo'lib hisoblanardi va
     * reklama byudjeti xato raqamga qarab taqsimlanardi.
     *
     * Xato bu yerda ham sotuvni to'xtatmaydi: `send` fonda ishlaydi.
     */
    void this.reportPurchase(payment.orderId);

    this.logger.log(`To‘lov qabul qilindi: ${payment.id} (${payment.provider})`);
    return { changed: true };
  }

  /**
   * Xarid hodisasini Meta ga yuboradi.
   *
   * `eventId` brauzerdagi piksel bilan BIR XIL (`order-<id>`) —
   * Facebook ikkalasini shu bo'yicha birlashtiradi va bitta xaridni
   * ikki marta hisoblamaydi.
   */
  private async reportPurchase(orderId: string): Promise<void> {
    if (!this.meta.configured) return;
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          grandTotal: true,
          contactPhone: true,
          firstName: true,
          lastName: true,
          customerId: true,
          // E-pochta buyurtmada emas, mijoz kartasida.
          customer: { select: { email: true } },
          items: { select: { sku: true, quantity: true, unitPrice: true } },
        },
      });
      if (!order) return;

      this.meta.send({
        eventName: 'Purchase',
        eventId: `order-${order.id}`,
        identity: {
          phone: order.contactPhone,
          email: order.customer?.email ?? null,
          firstName: order.firstName,
          lastName: order.lastName,
          externalId: order.customerId,
        },
        // Pul bazada TIYINDA. Facebook'ga so'mda yuboriladi, aks holda
        // har bir xarid 100 barobar katta ko'rinardi.
        value: Number((order.grandTotal as bigint) / 100n),
        items: order.items.map((i) => ({
          id: i.sku,
          quantity: i.quantity,
          price: Number((i.unitPrice as bigint) / 100n),
        })),
      });
    } catch (e) {
      this.logger.warn(`Purchase hodisasi yuborilmadi (${orderId}): ${(e as Error).message}`);
    }
  }

  /** To'lov bekor qilindi yoki muvaffaqiyatsiz tugadi. */
  async markCancelled(params: {
    paymentId: string;
    reason: string;
    to?: 'CANCELLED' | 'FAILED';
  }): Promise<{ changed: boolean }> {
    const payment = await this.byId(params.paymentId);
    const to = params.to ?? 'CANCELLED';
    if (payment.status === to) return { changed: false };
    if (payment.status === 'PAID') {
      // To'langan to'lovni "bekor qilingan" ga o'tkazib bo'lmaydi —
      // buning uchun QAYTARISH bor.
      throw new ConflictException({
        code: 'PAYMENT_ALREADY_PAID',
        message: 'To‘lov qabul qilingan — bekor qilish o‘rniga qaytarish rasmiylashtiriladi',
      });
    }

    const ok = await this.transition({
      paymentId: payment.id,
      from: payment.status as PaymentStatus,
      to,
      data: { cancelledAt: new Date(), failureReason: params.reason },
    });
    if (!ok) return { changed: false };

    await this.prisma.order.updateMany({
      where: { id: payment.orderId, paymentStatus: { not: 'PAID' } },
      data: { paymentStatus: to as never },
    });

    // To'lov o'tmagani haqida mijozga xabar — u qayta urinishi kerak.
    // Har bir urinish alohida hodisa: ikkinchi rad etish ham xabar beradi.
    const attemptKey = payment.providerTxnId ?? `try-${Date.now()}`;
    await this.notify(payment.orderId, 'PAYMENT_FAILED', { reason: params.reason }, attemptKey);
    await this.notifications.notifyStaff(
      'STAFF_PAYMENT_FAILED',
      { number: payment.order?.number ?? payment.orderId, reason: params.reason },
      payment.orderId,
      attemptKey,
    );

    this.logger.log(`To‘lov ${to}: ${payment.id} — ${params.reason}`);
    return { changed: true };
  }

  /**
   * Click uchun butun sonli `merchant_prepare_id` beradi.
   *
   * Click bu maydonni imzoga qo'shib qaytaradi va o'z tomonida sonli
   * maydonga yozadi — UUID yubormaymiz. Qiymat bir marta beriladi va
   * keyin o'zgarmaydi (`complete` da aynan shu son solishtiriladi).
   */
  async ensurePrepareId(paymentId: string): Promise<number> {
    const current = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { prepareId: true },
    });
    if (current?.prepareId) return current.prepareId;

    for (let i = 0; i < 8; i += 1) {
      // 9 xonali tasodifiy son: ketma-ket bermaymiz (kunlik buyurtmalar
      // sonini oshkor qilmaslik uchun, buyurtma raqamidagi kabi).
      const candidate = 100_000_000 + Math.floor(Math.random() * 899_999_999);
      /*
       * `prepareId` BUTUN JADVAL bo'yicha unikal. Tasodifiy son
       * to'qnashganda Prisma P2002 TASHLAYDI — `count: 0` qaytarmaydi.
       * Ushlanmasa, bu istisno webhookni yakunlamay uzib qo'yardi va
       * Click ning har bir keyingi urinishi "in flight" ga tushardi:
       * buyurtmani umuman to'lab bo'lmay qolardi.
       *
       * Endi to'qnashuv shunchaki keyingi urinishga o'tkazadi — sikl
       * aynan shuning uchun yozilgan edi.
       */
      let res: { count: number };
      try {
        res = await this.prisma.payment.updateMany({
          where: { id: paymentId, prepareId: null },
          data: { prepareId: candidate },
        });
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002') continue;
        throw error;
      }
      if (res.count === 1) return candidate;

      const again = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        select: { prepareId: true },
      });
      if (again?.prepareId) return again.prepareId;
    }
    throw new ConflictException('merchant_prepare_id yaratib bo‘lmadi');
  }

  /**
   * Rad etilgan to'lovni QAYTA OCHADI.
   *
   * Karta rad etilsa yoki mijoz to'lovni bekor qilsa, to'lov `CANCELLED`
   * bo'ladi — bu esa yakuniy holat. Buyurtmaga esa ikkinchi `Payment`
   * yozuvi yaratilmaydi, natijada mijoz qayta to'lay olmay qolardi.
   * Shuning uchun "qayta to'lash" bosilganda yozuv `PENDING` ga
   * qaytariladi va provayder identifikatori tozalanadi.
   *
   * To'langan to'lov HECH QACHON qayta ochilmaydi.
   */
  async reopen(paymentId: string): Promise<boolean> {
    const payment = await this.byId(paymentId);
    if (payment.status === 'PAID' || payment.status === 'REFUNDED') return false;
    if (payment.status !== 'CANCELLED' && payment.status !== 'FAILED') return false;

    const ok = await this.transition({
      paymentId,
      from: payment.status as PaymentStatus,
      to: 'PENDING',
      data: { providerTxnId: null, cancelledAt: null, failureReason: null },
    });
    if (!ok) return false;

    await this.prisma.order.updateMany({
      where: { id: payment.orderId, paymentStatus: { not: 'PAID' } },
      data: { paymentStatus: 'PENDING' },
    });

    this.logger.log(`To‘lov qayta ochildi: ${paymentId}`);
    return true;
  }

  /**
   * Qaytarish. Qisman ham, to'liq ham.
   *
   * Provayder API si qaytarishni qo'llab-quvvatlamasa (Click da odatda
   * shunday), yozuv baribir yaratiladi va "qo'lda bajarilishi kerak" deb
   * belgilanadi — buxgalteriya uchun iz qolishi shart.
   */
  async refund(params: {
    paymentId: string;
    amount: bigint;
    reason: string;
    adminId?: string;
    /** Qaytarish yozuvi (6-etap) — chek unga bog'lanadi. */
    returnId?: string | null;
    gatewayRefund?: (p: {
      paymentId: string;
      providerTxnId: string | null;
      amount: bigint;
      reason: string;
    }) => Promise<{ supported: boolean; externalId?: string | null; message?: string }>;
  }) {
    const payment = await this.byId(params.paymentId);

    if (payment.status !== 'PAID' && payment.status !== 'PARTIALLY_REFUNDED') {
      throw new BadRequestException('Faqat to‘langan to‘lovni qaytarish mumkin');
    }
    if (params.amount <= 0n)
      throw new BadRequestException('Qaytarish summasi musbat bo‘lishi kerak');

    const already = payment.refundedAmount as bigint;
    const remaining = (payment.amount as bigint) - already;
    if (params.amount > remaining) {
      throw new BadRequestException(
        `Qaytarish summasi qolgan summadan katta. Qolgan: ${remaining} tiyin`,
      );
    }

    let external: string | null = null;
    let note = params.reason;
    if (params.gatewayRefund) {
      const res = await params.gatewayRefund({
        paymentId: payment.id,
        providerTxnId: payment.providerTxnId,
        amount: params.amount,
        reason: params.reason,
      });
      external = res.externalId ?? null;
      if (!res.supported) {
        note = `${params.reason} — provayder API orqali qaytarishni qo‘llab-quvvatlamaydi, QO‘LDA bajarilsin`;
      }
    }

    const total = already + params.amount;
    const to: PaymentStatus =
      total >= (payment.amount as bigint) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

    // `refundedAmount` shartga kiritilgani uchun ikki parallel qaytarish
    // ikkalasi ham o'tib keta olmaydi: ikkinchisi nol qator o'zgartiradi.
    const ok = await this.transition({
      paymentId: payment.id,
      from: payment.status as PaymentStatus,
      to,
      expect: { refundedAmount: already },
      data: { refundedAmount: total },
    });
    if (!ok) {
      throw new ConflictException(
        'To‘lov holati o‘zgardi (boshqa joyda qaytarish bajarilgan bo‘lishi mumkin) — sahifani yangilang',
      );
    }

    await this.prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        state: 'CANCELLED',
        amount: params.amount,
        cancelledAt: new Date(),
      },
    });

    await this.prisma.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: to as never },
    });

    await this.log({
      paymentId: payment.id,
      provider: payment.provider,
      direction: 'OUT',
      endpoint: 'refund',
      request: { amount: params.amount.toString(), reason: note, adminId: params.adminId ?? null },
      response: { externalId: external },
    });

    // Qaytarish cheki — QQS ni qaytarish uchun majburiy.
    await this.fiscal.enqueueRefund(payment.orderId, payment.id, params.amount, params.returnId);

    // Qisman qaytarish bir necha marta bo'ladi — har biri alohida xabar.
    // Kalit sifatida qaytarishdan KEYINGI umumiy summa ishlatiladi:
    // u har safar boshqacha va takroriy so'rovda o'zgarmaydi.
    await this.notify(
      payment.orderId,
      'REFUND_DONE',
      { amount: amountVar(params.amount) },
      `total-${total.toString()}`,
    );

    this.logger.log(`Qaytarish: ${payment.id} — ${params.amount} tiyin (${to})`);
    return this.byId(payment.id);
  }

  /** Buyurtma bo'yicha mijozga xabar. Xato butun to'lovni buzmaydi. */
  private async notify(
    orderId: string,
    template: 'PAYMENT_RECEIVED' | 'PAYMENT_FAILED' | 'REFUND_DONE',
    vars: Record<string, string>,
    /**
     * Hodisani ajratuvchi kalit. To'lov bir necha marta rad etilishi va
     * qaytarish bir necha marta bo'lishi mumkin — kalitsiz ikkinchi
     * xabar takrorlanish himoyasiga tushib jim yo'qolardi.
     */
    eventKey?: string,
  ): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          number: true,
          contactPhone: true,
          firstName: true,
          customer: { select: { locale: true, telegramChatId: true } },
        },
      });
      if (!order) return;

      const lang: Lang = order.customer?.locale === 'RU' ? 'ru' : 'uz';
      await this.notifications.notifyCustomer({
        template,
        lang,
        phone: order.contactPhone,
        telegramChatId: order.customer?.telegramChatId ?? null,
        orderId,
        eventKey,
        vars: { number: order.number, name: order.firstName, ...vars },
      });
    } catch (e) {
      this.logger.error(`Bildirishnoma yuborilmadi (${template}): ${(e as Error).message}`);
    }
  }

  /* ======================================================================
     WEBHOOK IDEMPOTENTLIGI VA LOG
     ====================================================================== */

  /**
   * Webhook hodisasini bir marta qayd etadi.
   *
   * Qaytaradi:
   *  - `fresh: true`  — birinchi marta, ishlov berish kerak;
   *  - `fresh: false` — bu hodisa allaqachon ishlangan, oldingi javobni
   *                     qaytarish kifoya (ekspertiza A-7).
   */
  async claimWebhook(params: {
    provider: string;
    externalId: string;
    method: string;
    payload: unknown;
    signatureOk: boolean;
  }): Promise<WebhookClaim> {
    // AVVAL yozamiz, keyin o'qiymiz.
    //
    // "Oldin qidirib ko'r, topilmasa yoz" ishlamaydi: ikki bir xil webhook
    // bir vaqtda kelsa, ikkalasi ham "topilmadi" deb ko'radi va ikkalasi
    // ham ishlov beradi. Unikal indeks (provider+externalId+method) —
    // bizning qulfimiz: ikkinchisi P2002 oladi.
    try {
      const created = await this.prisma.webhookEvent.create({
        data: {
          provider: params.provider,
          externalId: params.externalId,
          method: params.method,
          signatureOk: params.signatureOk,
          payload: sanitizePayload(params.payload) as never,
        },
      });
      return { status: 'fresh', id: created.id, previousResponse: null };
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }

    const existing = await this.prisma.webhookEvent.findUnique({
      where: {
        provider_externalId_method: {
          provider: params.provider,
          externalId: params.externalId,
          method: params.method,
        },
      },
    });

    // Yozuv bor, lekin javob hali yo'q — birinchi so'rov AYNAN SHU PAYTDA
    // ishlab turibdi. Ikkinchisiga ishlov bermaymiz: provayder qayta
    // urinsin, o'shanda tayyor javobni oladi.
    if (!existing) return { status: 'in_flight', id: null, previousResponse: null };
    if (existing.processedAt === null) {
      return { status: 'in_flight', id: existing.id, previousResponse: null };
    }

    return { status: 'done', id: existing.id, previousResponse: existing.response ?? null };
  }

  /**
   * Hodisani navbatdan olib tashlaydi.
   *
   * Ishlov XATO bilan tugaganda chaqiriladi: xato javobni "yakuniy" deb
   * saqlab qo'ysak, vaziyat tuzalgandan keyin ham provayder o'sha xatoni
   * olaverardi. Muvaffaqiyatli javob esa saqlanadi va takrorlanganda
   * o'zgarmaydi.
   */
  async releaseWebhook(id: string): Promise<void> {
    await this.prisma.webhookEvent.delete({ where: { id } }).catch(() => undefined);
  }

  async finishWebhook(params: {
    id: string;
    response: unknown;
    httpStatus: number;
    error?: string;
  }): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id: params.id },
      data: {
        response: sanitizePayload(params.response) as never,
        httpStatus: params.httpStatus,
        processedAt: new Date(),
        error: params.error ?? null,
      },
    });
  }

  /** Provayder bilan har bir gaplashuv logga tushadi — nizoda dalil bo'ladi. */
  async log(params: {
    paymentId?: string | null;
    provider: string;
    direction: 'IN' | 'OUT';
    endpoint?: string;
    request?: unknown;
    response?: unknown;
    httpStatus?: number;
    durationMs?: number;
  }): Promise<void> {
    await this.prisma.paymentLog.create({
      data: {
        paymentId: params.paymentId ?? null,
        provider: params.provider,
        direction: params.direction,
        endpoint: params.endpoint ?? null,
        request: sanitizePayload(params.request ?? null) as never,
        response: sanitizePayload(params.response ?? null) as never,
        httpStatus: params.httpStatus ?? null,
        durationMs: params.durationMs ?? null,
      },
    });
  }

  /** Provayder tranzaksiyasi (Payme uchun alohida yozuv talab qilinadi). */
  async upsertTransaction(params: {
    paymentId: string;
    state: 'CREATED' | 'PERFORMED' | 'CANCELLED' | 'FAILED';
    amount: bigint;
    reason?: number | null;
  }) {
    const existing = await this.prisma.paymentTransaction.findFirst({
      where: { paymentId: params.paymentId },
      orderBy: { createdAt: 'desc' },
    });

    const data = {
      state: params.state as never,
      amount: params.amount,
      reason: params.reason ?? null,
      ...(params.state === 'PERFORMED' ? { performedAt: new Date() } : {}),
      ...(params.state === 'CANCELLED' ? { cancelledAt: new Date() } : {}),
    };

    if (existing) {
      return this.prisma.paymentTransaction.update({ where: { id: existing.id }, data });
    }
    return this.prisma.paymentTransaction.create({
      data: { paymentId: params.paymentId, ...data },
    });
  }

  /** Provayder kodini enum ga aylantiradi. */
  static providerOf(value: string): ProviderCode {
    const upper = value.toUpperCase();
    if (upper === 'CLICK' || upper === 'PAYME' || upper === 'UZUM' || upper === 'CASH_ON_DELIVERY')
      return upper;
    throw new BadRequestException(`Noma’lum to‘lov provayderi: ${value}`);
  }
}
