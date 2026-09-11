import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaymentService } from '../payments/payment.service';
import { PaymentRegistry } from '../payments/payment-registry';
import { NotificationService } from '../notifications/notification.service';
import { amountVar, type Lang } from '../notifications/templates';
import { generateReturnNumber } from '../../common/order-number';
import {
  CUSTOMER_CANCELLABLE,
  OPEN_RETURN_STATUSES,
  type ReturnStatus,
  assertReturnTransition,
} from './return-state';
import {
  DEFAULT_POLICY,
  type ReasonCode,
  type ReturnPolicy,
  ReturnPolicyError,
  acceptsOpened,
  daysLeft,
  deadlineFor,
  quoteRefund,
  returnableLines,
  type OrderItemSnapshot,
  type RequestedLine,
} from './return-policy';
import type { ProviderCode } from '../payments/payment-gateway';

/**
 * Qaytarish moduli.
 *
 * Uchta qoida:
 *
 *  1. HISOB MUZLATILGAN NUSXADAN. Qaytariladigan summa `order_items`
 *     dagi narx va chegirmadan hisoblanadi, katalogdan emas.
 *
 *  2. BITTA BUYURTMAGA BITTA OCHIQ SO'ROV. Aks holda ikki so'rov bir
 *     xil pozitsiyani qaytarib, pul ikki marta ketardi.
 *
 *  3. TOVAR OLINMAGUNCHA PUL QAYTARILMAYDI. `RECEIVED` bo'lmasdan
 *     `REFUNDED` ga o'tib bo'lmaydi.
 */
@Injectable()
export class ReturnService {
  private readonly logger = new Logger(ReturnService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly payments: PaymentService,
    private readonly registry: PaymentRegistry,
    private readonly notifications: NotificationService,
  ) {}

  /* ======================================================================
     SIYOSAT
     ====================================================================== */

  private async policy(): Promise<ReturnPolicy> {
    const rows = await this.prisma.setting.findMany({
      where: {
        key: { in: ['returns.windowDays', 'returns.acceptOpened', 'returns.refundShipping'] },
      },
    });
    const byKey = new Map(rows.map((r: { key: string; value: unknown }) => [r.key, r.value]));
    return {
      windowDays: Number(byKey.get('returns.windowDays') ?? DEFAULT_POLICY.windowDays),
      acceptOpened: byKey.get('returns.acceptOpened') === true,
      refundShipping:
        (byKey.get('returns.refundShipping') as ReturnPolicy['refundShipping']) ??
        DEFAULT_POLICY.refundShipping,
    };
  }

  private snapshot(items: OrderItemRow[]): OrderItemSnapshot[] {
    return items.map((i) => ({
      id: i.id,
      productName: i.productName,
      variantName: i.variantName,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice as bigint,
      discountAmount: i.discountAmount as bigint,
      lineTotal: i.lineTotal as bigint,
      refundedQuantity: i.refundedQuantity,
    }));
  }

  /**
   * Buyurtma bo'yicha qaytarish imkoni.
   *
   * Mijozga "qaytarish" tugmasi ko'rinishidan OLDIN shu javob
   * so'raladi: sabab tushunarli bo'lsin, tugma bosilgach 400 chiqmasin.
   */
  /**
   * Buyurtma bo'yicha qaytarish imkoni.
   *
   * Egalik: mijoz uchun `customerId`, mehmon uchun `phone`. Ikkalasi
   * ham bo'lmasa javob QISQARTIRILADI — faqat "mumkin/mumkin emas",
   * pozitsiyalarsiz. Aks holda buyurtma id sini bilgan har kim begona
   * buyurtmaning tarkibini va summalarini ko'rardi.
   */
  async eligibility(orderId: string, customerId?: string, phone?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    const owns = customerId
      ? order.customerId === customerId
      : phone
        ? order.contactPhone === phone
        : false;
    if (!owns) {
      if (customerId || phone) throw new ForbiddenException('Bu buyurtma sizga tegishli emas');
    }

    const policy = await this.policy();

    if (order.status !== 'DELIVERED' && order.status !== 'RETURN_REQUESTED') {
      return this.notEligible('NOT_DELIVERED', policy);
    }

    const deliveredAt = order.deliveredAt ?? order.placedAt;
    const now = new Date();
    if (now > deadlineFor(deliveredAt, policy)) {
      return this.notEligible('WINDOW_EXPIRED', policy);
    }

    const open = await this.prisma.return.findFirst({
      where: { orderId, status: { in: OPEN_RETURN_STATUSES as never[] } },
      select: { id: true, number: true, status: true },
    });
    if (open) {
      return { ...this.notEligible('ALREADY_RETURNED', policy), openReturn: open };
    }

    const lines = returnableLines(this.snapshot(order.items));
    if (lines.length === 0) return this.notEligible('NOTHING_TO_RETURN', policy);

    return {
      eligible: true,
      reason: 'OK' as const,
      policy,
      deadline: deadlineFor(deliveredAt, policy),
      daysLeft: daysLeft(deliveredAt, now, policy),
      // Tarkib va summalar FAQAT egasiga ko'rsatiladi.
      shippingTotal: owns ? (order.shippingTotal as bigint).toString() : '0',
      lines: (owns ? lines : []).map((l) => ({
        orderItemId: l.id,
        productName: l.productName,
        variantName: l.variantName,
        sku: l.sku,
        quantity: l.quantity,
        returnableQuantity: l.returnableQuantity,
        refundPerUnit: l.refundPerUnit.toString(),
      })),
      openReturn: null,
    };
  }

  private notEligible(reason: string, policy: ReturnPolicy) {
    return {
      eligible: false,
      reason,
      policy,
      deadline: null,
      daysLeft: 0,
      shippingTotal: '0',
      lines: [],
      openReturn: null,
    };
  }

  /* ======================================================================
     SO'ROV YARATISH
     ====================================================================== */

  async create(params: {
    orderId: string;
    customerId?: string;
    /** Mehmon uchun: buyurtmadagi telefon bilan tasdiqlanadi. */
    phone?: string;
    reasonCode: ReasonCode;
    comment?: string;
    items: RequestedLine[];
    /** Mijoz qadoq ochilganini aytdimi. */
    opened?: boolean;
  }) {
    const order = await this.prisma.order.findFirst({
      where: { id: params.orderId, deletedAt: null },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        customer: { select: { id: true, locale: true, telegramChatId: true } },
      },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    // Egalik tekshiruvi: mijoz o'z buyurtmasini, mehmon esa telefon
    // bo'yicha qaytaradi.
    if (params.customerId) {
      if (order.customerId !== params.customerId) {
        throw new ForbiddenException('Bu buyurtma sizga tegishli emas');
      }
    } else if (params.phone) {
      if (order.contactPhone !== params.phone) {
        throw new ForbiddenException('Telefon raqami mos kelmadi');
      }
    } else {
      throw new ForbiddenException('Buyurtma egasi aniqlanmadi');
    }

    const check = await this.eligibility(order.id, params.customerId, params.phone);
    if (!check.eligible) {
      throw new BadRequestException({
        code: check.reason,
        message: eligibilityMessage(check.reason),
      });
    }

    const policy = await this.policy();
    if (params.opened && !acceptsOpened(params.reasonCode, policy)) {
      throw new BadRequestException({
        code: 'OPENED_NOT_ACCEPTED',
        message:
          'Ochilgan kosmetika sifatli bo‘lsa qaytarilmaydi. Nuqson yoki noto‘g‘ri tovar bo‘lsa — sababni o‘zgartiring.',
      });
    }

    // Yetkazib berish narxi bitta buyurtmada FAQAT BIR MARTA
    // qaytariladi. Siyosat "always" bo'lsa ham ikkinchi qaytarishda
    // uni qayta qaytarsak, umumiy summa to'langanidan oshib ketardi.
    const shippingAlreadyRefunded = await this.prisma.return.findFirst({
      where: {
        orderId: order.id,
        shippingRefunded: true,
        status: { notIn: ['REJECTED', 'CANCELLED'] },
      },
      select: { id: true },
    });

    let quote;
    try {
      quote = quoteRefund({
        items: this.snapshot(order.items),
        requested: params.items,
        shippingTotal: shippingAlreadyRefunded ? 0n : (order.shippingTotal as bigint),
        reason: params.reasonCode,
        policy,
      });
    } catch (e) {
      if (e instanceof ReturnPolicyError) {
        throw new BadRequestException({ code: e.code, message: e.message });
      }
      throw e;
    }

    const created = await this.prisma.$transaction(async (tx) => {
      // Ochiq so'rov yo'qligini TRANZAKSIYA ICHIDA qayta tekshiramiz:
      // mijoz ikki oynadan bir vaqtda yuborishi mumkin.
      const open = await tx.return.findFirst({
        where: { orderId: order.id, status: { in: OPEN_RETURN_STATUSES as never[] } },
        select: { id: true },
      });
      if (open) {
        throw new ConflictException({
          code: 'ALREADY_RETURNED',
          message: 'Bu buyurtma bo‘yicha qaytarish so‘rovi allaqachon ochilgan',
        });
      }

      const row = await tx.return.create({
        data: {
          number: generateReturnNumber(),
          orderId: order.id,
          customerId: order.customerId,
          status: 'REQUESTED',
          reasonCode: params.reasonCode,
          comment: params.comment?.trim() || null,
          refundAmount: quote.total,
          shippingRefunded: quote.shippingRefund > 0n,
        },
      });

      for (const line of quote.lines) {
        await tx.returnItem.create({
          data: {
            returnId: row.id,
            orderItemId: line.orderItemId,
            quantity: line.quantity,
            refundAmount: line.amount,
            condition: params.opened ? 'OPENED' : 'RESELLABLE',
          },
        });
      }

      return row;
    });

    // Buyurtma holatini "qaytarish so'raldi" ga o'tkazamiz — operator
    // ro'yxatda ko'rib turishi uchun. Holat mashinasi ruxsat bermasa
    // (masalan allaqachon RETURN_REQUESTED) — jim o'tkazamiz.
    await this.prisma.order
      .updateMany({
        where: { id: order.id, status: 'DELIVERED' },
        data: { status: 'RETURN_REQUESTED' },
      })
      .catch(() => undefined);

    await this.notifications.notifyStaff(
      'STAFF_RETURN_REQUESTED',
      { number: order.number, reason: params.reasonCode, amount: amountVar(quote.total) },
      order.id,
      created.number,
    );

    this.logger.log(
      `Qaytarish so‘rovi: ${created.number} (buyurtma ${order.number}, ${quote.total} tiyin)`,
    );
    return this.view(created.id);
  }

  /* ======================================================================
     KO'RISH
     ====================================================================== */

  async view(returnId: string) {
    const row = await this.prisma.return.findUnique({
      where: { id: returnId },
      include: {
        items: { include: { orderItem: true } },
        order: { select: { id: true, number: true, contactPhone: true, shippingTotal: true } },
        handledBy: { select: { fullName: true } },
        fiscalReceipts: { select: { id: true, status: true, receiptUrl: true, fiscalSign: true } },
      },
    });
    if (!row) throw new NotFoundException('Qaytarish topilmadi');

    return {
      id: row.id,
      number: row.number,
      status: row.status,
      reasonCode: row.reasonCode,
      comment: row.comment,
      resolutionNote: row.resolutionNote,
      refundAmount: (row.refundAmount as bigint).toString(),
      refundedAt: row.refundedAt,
      refundMethod: row.refundMethod,
      handledBy: row.handledBy?.fullName ?? null,
      createdAt: row.createdAt,
      order: {
        id: row.order.id,
        number: row.order.number,
        shippingTotal: (row.order.shippingTotal as bigint).toString(),
      },
      items: row.items.map((i: ReturnItemRow) => ({
        id: i.id,
        orderItemId: i.orderItemId,
        productName: i.orderItem.productName,
        variantName: i.orderItem.variantName,
        sku: i.orderItem.sku,
        imageUrl: i.orderItem.imageUrl,
        quantity: i.quantity,
        refundAmount: (i.refundAmount as bigint).toString(),
        condition: i.condition,
        restocked: i.restocked,
      })),
      receipts: row.fiscalReceipts,
    };
  }

  async myReturns(customerId: string) {
    const rows = await this.prisma.return.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { order: { select: { number: true } }, items: { select: { id: true } } },
    });
    return rows.map((r: ReturnRow) => ({
      id: r.id,
      number: r.number,
      status: r.status,
      orderNumber: r.order?.number ?? null,
      refundAmount: (r.refundAmount as bigint).toString(),
      itemsCount: r.items.length,
      createdAt: r.createdAt,
    }));
  }

  /** Mijoz o'z so'rovini bekor qiladi. */
  async cancelByCustomer(returnId: string, customerId: string) {
    const row = await this.prisma.return.findFirst({
      where: { id: returnId, customerId },
      select: { id: true, status: true, orderId: true },
    });
    if (!row) throw new NotFoundException('Qaytarish topilmadi');
    if (!CUSTOMER_CANCELLABLE.includes(row.status as ReturnStatus)) {
      throw new BadRequestException(
        'Bu bosqichda so‘rovni bekor qilib bo‘lmaydi — operatorga murojaat qiling',
      );
    }
    return this.changeStatus({ returnId, to: 'CANCELLED', comment: 'Mijoz bekor qildi' });
  }

  /* ======================================================================
     ADMIN
     ====================================================================== */

  async list(query: { status?: string; q?: string; page?: number; perPage?: number }) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 30;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.q) {
      const q = query.q.trim().toUpperCase();
      where.OR = [{ number: { contains: q } }, { order: { is: { number: { contains: q } } } }];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.return.count({ where: where as never }),
      this.prisma.return.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          order: { select: { number: true, contactPhone: true } },
          items: { select: { id: true } },
        },
      }),
    ]);

    return {
      items: rows.map((r: ReturnRow) => ({
        id: r.id,
        number: r.number,
        status: r.status,
        reasonCode: r.reasonCode,
        orderNumber: r.order?.number ?? null,
        contactPhone: r.order?.contactPhone ?? null,
        refundAmount: (r.refundAmount as bigint).toString(),
        itemsCount: r.items.length,
        createdAt: r.createdAt,
      })),
      total,
      page,
      perPage,
    };
  }

  /**
   * Holatni o'zgartiradi.
   *
   * Yon ta'sirlar holatga qarab:
   *  - `RECEIVED` — pozitsiyalar holatiga qarab omborga qaytarish;
   *  - `REFUNDED` — pul qaytarish va qaytarish cheki;
   *  - `REJECTED`/`CANCELLED` — buyurtmani yetkazilgan holatiga tiklash.
   */
  async changeStatus(params: {
    returnId: string;
    to: ReturnStatus;
    adminId?: string;
    comment?: string;
    /** `RECEIVED` uchun: qaysi pozitsiya qanday holatda kelgani. */
    conditions?: Array<{ returnItemId: string; condition: 'RESELLABLE' | 'DAMAGED' | 'OPENED' }>;
  }) {
    const row = await this.prisma.return.findUnique({
      where: { id: params.returnId },
      include: { items: { include: { orderItem: true } }, order: true },
    });
    if (!row) throw new NotFoundException('Qaytarish topilmadi');

    const from = row.status as ReturnStatus;
    assertReturnTransition(from, params.to);

    // Holatni BAND QILAMIZ — ikki operator bir vaqtda bosmasin.
    //
    // Operator izohi ALOHIDA maydonga yoziladi: `comment` da mijozning
    // tushuntirishi turadi va uni yo'qotib bo'lmaydi.
    const claimed = await this.prisma.return.updateMany({
      where: { id: row.id, status: from as never },
      data: {
        status: params.to as never,
        handledById: params.adminId ?? row.handledById,
        ...(params.comment ? { resolutionNote: params.comment } : {}),
      },
    });
    if (claimed.count !== 1) {
      throw new ConflictException('Qaytarish holati boshqa joyda o‘zgardi — sahifani yangilang');
    }

    try {
      if (params.to === 'RECEIVED') await this.receive(row, params.conditions, params.adminId);
      if (params.to === 'REFUNDED') await this.refund(row, params.adminId);
      if (params.to === 'REJECTED' || params.to === 'CANCELLED') await this.restoreOrder(row);
      if (params.to === 'RECEIVED' || params.to === 'REFUNDED') {
        await this.syncOrderAfterReturn(row.orderId, params.to);
      }
    } catch (e) {
      // Yon ta'sir bajarilmasa HOLAT ORQAGA QAYTARILADI.
      //
      // Aks holda qaytarish "pul qaytarildi" bo'lib qolar, pul esa
      // ketmasdi — va `REFUNDED` dan boshqa holatga o'tish mumkin
      // bo'lmagani uchun buni tuzatib ham bo'lmasdi.
      await this.prisma.return.updateMany({
        where: { id: row.id, status: params.to as never },
        data: { status: from as never },
      });
      this.logger.error(
        `Qaytarish ${row.number}: ${from} -> ${params.to} bekor qilindi — ${(e as Error).message}`,
      );
      throw e;
    }

    await this.notifyCustomer(row, params.to, params.comment);

    this.logger.log(`Qaytarish ${row.number}: ${from} -> ${params.to}`);
    return this.view(row.id);
  }

  /**
   * Tovar qabul qilindi.
   *
   * Qayta sotiladigan tovar omborga qaytadi, yaroqsizi esa faqat
   * harakatlar jurnalida qoladi — qoldiqqa qo'shilmaydi.
   */
  private async receive(
    row: ReturnWithItems,
    conditions?: Array<{ returnItemId: string; condition: 'RESELLABLE' | 'DAMAGED' | 'OPENED' }>,
    adminId?: string,
  ): Promise<void> {
    const byId = new Map((conditions ?? []).map((c) => [c.returnItemId, c.condition]));

    for (const item of row.items) {
      // Har bir pozitsiya BIR MARTA hisobga olinadi. `restocked`
      // bayrog'i ham omborga qaytarishni, ham buyurtmadagi
      // "qaytarilgan miqdor" ni qo'riqlaydi: ilgari ular ikki alohida
      // siklda edi va birinchisi yiqilsa, ikkinchisi umuman
      // ishlamasdi — natijada bir xil donani ikkinchi marta qaytarish
      // mumkin bo'lib qolardi.
      if (item.restocked) continue;

      const condition =
        byId.get(item.id) ?? (item.condition as 'RESELLABLE' | 'DAMAGED' | 'OPENED');

      // OPENED — ochilgan, lekin buzilmagan: qayta sotilmaydi.
      const resellable = condition === 'RESELLABLE';

      if (item.orderItem.variantId) {
        await this.inventory.restock({
          variantId: item.orderItem.variantId,
          quantity: item.quantity,
          resellable,
          orderId: row.orderId,
          returnId: row.id,
          adminId,
        });
      }

      // Bayroq va buyurtmadagi hisob BITTA tranzaksiyada: ikkisi
      // bir-biridan ajralib qolmasligi kerak.
      await this.prisma.$transaction([
        this.prisma.returnItem.update({
          where: { id: item.id },
          data: { condition: condition as never, restocked: true },
        }),
        this.prisma.orderItem.update({
          where: { id: item.orderItemId },
          data: {
            refundedQuantity: { increment: item.quantity },
            refundedAmount: { increment: item.refundAmount as bigint },
          },
        }),
      ]);
    }
  }

  /** Pul qaytarish: to'lov moduli orqali, qaytarish cheki bilan. */
  private async refund(row: ReturnWithItems, adminId?: string): Promise<void> {
    const amount = row.refundAmount as bigint;
    if (amount <= 0n) return;

    const payment = await this.prisma.payment.findFirst({
      where: { orderId: row.orderId, status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      // To'lov topilmadi (masalan naqd to'lov yopilmagan) — pul
      // qaytarish QO'LDA bajariladi, lekin yozuv qoladi.
      await this.prisma.return.update({
        where: { id: row.id },
        data: { refundedAt: new Date(), refundMethod: 'MANUAL' },
      });
      this.logger.warn(`Qaytarish ${row.number}: to‘lov yozuvi topilmadi — pul QO‘LDA qaytarilsin`);
      return;
    }

    const gateway = this.registry.get(payment.provider as ProviderCode);
    await this.payments.refund({
      paymentId: payment.id,
      amount,
      reason: `Qaytarish ${row.number}: ${row.reasonCode}`,
      adminId,
      returnId: row.id,
      gatewayRefund: gateway.refund ? (p) => gateway.refund!(p) : undefined,
    });

    await this.prisma.return.update({
      where: { id: row.id },
      data: { refundedAt: new Date(), refundMethod: payment.provider },
    });
  }

  /**
   * Qaytarishdan keyin buyurtma holatini joyiga qo'yadi.
   *
   * Ilgari buyurtma `RETURN_REQUESTED` da abadiy qolib ketardi: uni
   * `RETURNED` ga o'tkazadigan kod umuman yo'q edi.
   *
   *  - hamma pozitsiya to'liq qaytarilgan bo'lsa → `RETURNED`,
   *    pul ham qaytarilgach → `REFUNDED`;
   *  - qisman bo'lsa → `DELIVERED` ga qaytadi, chunki mijoz muddat
   *    ichida qolganini ham qaytarishi mumkin.
   */
  private async syncOrderAfterReturn(orderId: string, to: ReturnStatus): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, items: { select: { quantity: true, refundedQuantity: true } } },
    });
    if (!order) return;

    const fully = order.items.every((i) => i.refundedQuantity >= i.quantity);

    if (!fully) {
      await this.prisma.order.updateMany({
        where: { id: orderId, status: 'RETURN_REQUESTED' },
        data: { status: 'DELIVERED' },
      });
      return;
    }

    if (to === 'RECEIVED') {
      await this.prisma.order.updateMany({
        where: { id: orderId, status: 'RETURN_REQUESTED' },
        data: { status: 'RETURNED' },
      });
      return;
    }

    // Pul qaytarilgach — yakuniy holat.
    await this.prisma.order.updateMany({
      where: { id: orderId, status: { in: ['RETURNED', 'RETURN_REQUESTED'] } },
      data: { status: 'REFUNDED' },
    });
  }

  /**
   * Rad etilgan yoki bekor qilingan so'rovdan keyin buyurtma
   * "yetkazilgan" holatiga qaytadi — mijoz keyinroq qayta so'rashi
   * mumkin (muddat ichida bo'lsa).
   */
  private async restoreOrder(row: ReturnWithItems): Promise<void> {
    await this.prisma.order.updateMany({
      where: { id: row.orderId, status: 'RETURN_REQUESTED' },
      data: { status: 'DELIVERED' },
    });
  }

  private async notifyCustomer(
    row: ReturnWithItems,
    to: ReturnStatus,
    /** Operator izohi — rad etish sababi aynan shu matn bo'lishi kerak. */
    resolutionNote?: string,
  ): Promise<void> {
    const template =
      to === 'APPROVED'
        ? 'RETURN_APPROVED'
        : to === 'REJECTED'
          ? 'RETURN_REJECTED'
          : to === 'RECEIVED'
            ? 'RETURN_RECEIVED'
            : null;
    if (!template) return;

    try {
      const customer = row.customerId
        ? await this.prisma.customer.findUnique({
            where: { id: row.customerId },
            select: { locale: true, telegramChatId: true },
          })
        : null;

      const lang: Lang = customer?.locale === 'RU' ? 'ru' : 'uz';
      await this.notifications.notifyCustomer({
        template,
        lang,
        phone: row.order?.contactPhone ?? null,
        telegramChatId: customer?.telegramChatId ?? null,
        orderId: row.orderId,
        eventKey: row.number,
        vars: {
          number: row.number,
          amount: amountVar(row.refundAmount as bigint),
          // Mijozga OPERATOR sababi ko'rsatiladi, uning o'z izohi emas.
          reason: resolutionNote ?? row.comment ?? undefined,
        },
      });
    } catch (e) {
      this.logger.error(`Qaytarish ${row.number}: bildirishnoma xatosi — ${(e as Error).message}`);
    }
  }
}

/* ------------------------------- Tiplar ------------------------------- */

interface OrderItemRow {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  unitPrice: bigint;
  discountAmount: bigint;
  lineTotal: bigint;
  refundedQuantity: number;
}

interface ReturnItemRow {
  id: string;
  orderItemId: string;
  quantity: number;
  refundAmount: bigint;
  condition: string;
  restocked: boolean;
  orderItem: {
    productName: string;
    variantName: string | null;
    sku: string;
    imageUrl: string | null;
    variantId: string | null;
  };
}

interface ReturnRow {
  id: string;
  number: string;
  status: string;
  reasonCode: string;
  refundAmount: bigint;
  createdAt: Date;
  order?: { number: string; contactPhone?: string } | null;
  items: Array<{ id: string }>;
}

interface ReturnWithItems {
  id: string;
  number: string;
  status: string;
  reasonCode: string;
  comment: string | null;
  resolutionNote: string | null;
  shippingRefunded: boolean;
  refundAmount: bigint;
  orderId: string;
  customerId: string | null;
  handledById: string | null;
  items: ReturnItemRow[];
  order: { contactPhone: string } | null;
}

function eligibilityMessage(reason: string): string {
  switch (reason) {
    case 'NOT_DELIVERED':
      return 'Buyurtma hali yetkazilmagan — qaytarish yetkazilgandan keyin mumkin';
    case 'WINDOW_EXPIRED':
      return 'Qaytarish muddati tugagan';
    case 'ALREADY_RETURNED':
      return 'Bu buyurtma bo‘yicha qaytarish so‘rovi allaqachon ochilgan';
    case 'NOTHING_TO_RETURN':
      return 'Qaytarish mumkin bo‘lgan pozitsiya qolmagan';
    default:
      return 'Qaytarish mumkin emas';
  }
}
