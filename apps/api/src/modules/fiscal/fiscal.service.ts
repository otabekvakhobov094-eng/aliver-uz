import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OfdProvider } from './ofd.provider';
import { backoffMs } from './backoff';
import {
  DEFAULT_SHIPPING_IKPU,
  FiscalBuildError,
  buildReceipt,
  buildRefundReceipt,
  receiptTotals,
  type FiscalReceiptPayload,
} from './receipt-builder';

/** Chek quruvchiga kerak bo'ladigan buyurtma pozitsiyasi maydonlari. */
interface OrderItemRow {
  productName: string;
  variantName: string | null;
  barcode: string | null;
  ikpuCode: string;
  unitCode: string;
  quantity: number;
  unitPrice: bigint;
  discountAmount: bigint;
  vatRate: number;
}

/** Admin ro'yxati uchun chek yozuvi. */
interface ReceiptRow {
  id: string;
  orderId: string;
  order: { number: string } | null;
  type: string;
  status: string;
  totalAmount: bigint;
  vatAmount: bigint;
  fiscalSign: string | null;
  receiptUrl: string | null;
  attempts: number;
  lastError: string | null;
  nextRetryAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
}

/**
 * Fiskal cheklar.
 *
 * Asosiy qoida: chek YO'QOLMAYDI. OFD ishlamayotgan bo'lsa ham yozuv
 * bazada `PENDING` bo'lib qoladi va cron qayta uradi. Chek berilmasa
 * to'lov ham, buyurtma ham to'xtatilmaydi — mijozni OFD nosozligi
 * uchun kutdirib qo'yish noto'g'ri bo'lardi (ekspertiza A-1).
 */
@Injectable()
export class FiscalService {
  private readonly logger = new Logger(FiscalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ofd: OfdProvider,
    private readonly config: ConfigService,
  ) {}

  private maxAttempts(): number {
    return this.config.get<number>('OFD_MAX_ATTEMPTS') ?? 8;
  }

  private async setting<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return (row?.value as T) ?? fallback;
  }

  /* ======================================================================
     NAVBATGA QO'YISH
     ====================================================================== */

  /**
   * Sotuv cheki. To'lov qabul qilingan paytda chaqiriladi.
   * Bitta buyurtmaga bitta sotuv cheki — takroriy chaqiruv yangi chek
   * yaratmaydi.
   */
  async enqueueSale(orderId: string, paymentId: string | null): Promise<void> {
    const existing = await this.prisma.fiscalReceipt.findFirst({
      where: { orderId, type: 'SALE', status: { in: ['PENDING', 'SENT'] } },
    });
    if (existing) return;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        payments: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    const shippingIkpu = await this.setting<string>('fiscal.shippingIkpu', DEFAULT_SHIPPING_IKPU);
    const shippingVat = await this.setting<number>('fiscal.shippingVatRate', 12);

    let payload: FiscalReceiptPayload;
    try {
      payload = buildReceipt({
        orderId: order.id,
        orderNumber: order.number,
        paymentProvider: order.payments[0]?.provider ?? 'CASH_ON_DELIVERY',
        items: order.items.map((i: OrderItemRow) => ({
          productName: i.productName,
          variantName: i.variantName,
          barcode: i.barcode,
          ikpuCode: i.ikpuCode,
          unitCode: i.unitCode,
          packageCode: null,
          quantity: i.quantity,
          unitPrice: i.unitPrice as bigint,
          discountAmount: i.discountAmount as bigint,
          vatRate: i.vatRate,
        })),
        shippingTotal: order.shippingTotal as bigint,
        shippingIkpu,
        shippingVatRate: shippingVat,
      });
    } catch (e) {
      // Chekni qurib bo'lmasa (masalan IKPU yo'q) — yozuv baribir
      // yaratiladi, lekin darrov FAILED bo'ladi va admin ko'radi.
      await this.prisma.fiscalReceipt.create({
        data: {
          orderId,
          paymentId,
          type: 'SALE',
          status: 'FAILED',
          totalAmount: order.grandTotal as bigint,
          vatAmount: order.vatTotal as bigint,
          payload: { error: (e as Error).message } as never,
          lastError: (e as Error).message,
        },
      });
      this.logger.error(`Buyurtma ${order.number}: chek qurilmadi — ${(e as Error).message}`);
      return;
    }

    const totals = receiptTotals(payload);
    await this.prisma.fiscalReceipt.create({
      data: {
        orderId,
        paymentId,
        type: 'SALE',
        status: 'PENDING',
        totalAmount: totals.total,
        vatAmount: totals.vat,
        payload: payload as never,
        nextRetryAt: new Date(),
      },
    });
  }

  /** Qaytarish cheki. */
  async enqueueRefund(
    orderId: string,
    paymentId: string | null,
    amount: bigint,
    /** Qaytarish yozuvi — chek qaytarish kartochkasida ko'rinishi uchun. */
    returnId?: string | null,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { take: 1, orderBy: { createdAt: 'asc' } },
        payments: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    const first = order.items[0];
    if (!first) return;

    let payload: FiscalReceiptPayload;
    try {
      payload = buildRefundReceipt({
        orderId: order.id,
        orderNumber: order.number,
        paymentProvider: order.payments[0]?.provider ?? 'CASH_ON_DELIVERY',
        amount,
        ikpuCode: first.ikpuCode,
        vatRate: first.vatRate,
      });
    } catch (e) {
      this.logger.error(
        `Buyurtma ${order.number}: qaytarish cheki qurilmadi — ${(e as Error).message}`,
      );
      return;
    }

    const totals = receiptTotals(payload);
    await this.prisma.fiscalReceipt.create({
      data: {
        orderId,
        paymentId,
        returnId: returnId ?? null,
        type: 'REFUND',
        status: 'PENDING',
        totalAmount: totals.total,
        vatAmount: totals.vat,
        payload: payload as never,
        nextRetryAt: new Date(),
      },
    });
  }

  /* ======================================================================
     YUBORISH
     ====================================================================== */

  /** Bitta chekni yuborishga urinadi. Cron va admin tugmasi shuni chaqiradi. */
  async sendOne(receiptId: string): Promise<{ status: string; error?: string }> {
    const receipt = await this.prisma.fiscalReceipt.findUnique({ where: { id: receiptId } });
    if (!receipt) throw new NotFoundException('Chek topilmadi');
    if (receipt.status === 'SENT') return { status: 'SENT' };
    if (receipt.status === 'CANCELLED') {
      throw new BadRequestException('Bekor qilingan chekni yuborib bo‘lmaydi');
    }

    const payload = receipt.payload as unknown as FiscalReceiptPayload;
    if (!payload?.Items) {
      return this.fail(
        receipt.id,
        receipt.attempts,
        'Chek payload’i yo‘q — chekni QAYTA QURISH kerak (buyurtma sahifasidagi tugma)',
        false,
      );
    }

    const result = await this.ofd.send(payload);

    if (result.ok) {
      await this.prisma.fiscalReceipt.update({
        where: { id: receipt.id },
        data: {
          status: 'SENT',
          fiscalSign: result.fiscalSign ?? null,
          receiptUrl: result.receiptUrl ?? null,
          terminalId: result.terminalId ?? null,
          providerCode: this.ofd.driver,
          sentAt: new Date(),
          attempts: receipt.attempts + 1,
          lastError: null,
          nextRetryAt: null,
        },
      });
      return { status: 'SENT' };
    }

    return this.fail(
      receipt.id,
      receipt.attempts,
      result.error ?? 'Noma’lum xato',
      result.retryable ?? true,
    );
  }

  private async fail(
    id: string,
    attempts: number,
    error: string,
    retryable: boolean,
  ): Promise<{ status: string; error: string }> {
    const next = attempts + 1;
    const giveUp = !retryable || next >= this.maxAttempts();

    await this.prisma.fiscalReceipt.update({
      where: { id },
      data: {
        status: giveUp ? 'FAILED' : 'PENDING',
        attempts: next,
        lastError: error,
        nextRetryAt: giveUp ? null : new Date(Date.now() + backoffMs(next)),
      },
    });

    if (giveUp) {
      this.logger.error(`Chek ${id} yuborilmadi (${next} urinish): ${error}`);
    } else {
      this.logger.warn(`Chek ${id} yuborilmadi, qayta uriniladi: ${error}`);
    }
    return { status: giveUp ? 'FAILED' : 'PENDING', error };
  }

  /** Navbatdagi cheklarni yuboradi (cron chaqiradi). */
  async processQueue(limit = 50): Promise<{ sent: number; failed: number }> {
    const due = await this.prisma.fiscalReceipt.findMany({
      where: { status: 'PENDING', nextRetryAt: { lte: new Date() } },
      orderBy: { nextRetryAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    let sent = 0;
    let failed = 0;
    for (const row of due) {
      try {
        const res = await this.sendOne(row.id);
        if (res.status === 'SENT') sent += 1;
        else failed += 1;
      } catch (e) {
        failed += 1;
        this.logger.error(`Chek ${row.id}: ${(e as Error).message}`);
      }
    }
    return { sent, failed };
  }

  /**
   * Sotuv chekini QAYTA QURADI.
   *
   * Chek qurilishida xato bo'lsa (masalan, pozitsiyada IKPU kodi bo'lmasa),
   * yozuv darrov `FAILED` bo'ladi va navbat uni olmaydi — `payload` da
   * chek emas, xato matni yotadi. Muammo tuzatilgach (IKPU qo'shilgach)
   * chekni qaytadan qurish kerak, aks holda pul olingan, chek esa hech
   * qachon berilmagan bo'lib qolardi.
   *
   * Eski `FAILED` yozuv `CANCELLED` ga o'tkaziladi — iz saqlanadi.
   */
  async rebuildSale(orderId: string): Promise<{ rebuilt: boolean; message: string }> {
    const sent = await this.prisma.fiscalReceipt.findFirst({
      where: { orderId, type: 'SALE', status: { in: ['PENDING', 'SENT'] } },
    });
    if (sent) {
      return {
        rebuilt: false,
        message:
          sent.status === 'SENT'
            ? 'Bu buyurtmaning cheki allaqachon yuborilgan'
            : 'Chek allaqachon navbatda',
      };
    }

    const broken = await this.prisma.fiscalReceipt.findMany({
      where: { orderId, type: 'SALE', status: 'FAILED' },
      select: { id: true, paymentId: true },
    });

    const paymentId =
      broken[0]?.paymentId ??
      (
        await this.prisma.payment.findFirst({
          where: { orderId, status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
      )?.id ??
      null;

    if (broken.length > 0) {
      await this.prisma.fiscalReceipt.updateMany({
        where: { id: { in: broken.map((b) => b.id) } },
        data: { status: 'CANCELLED', lastError: 'Chek qayta qurildi' },
      });
    }

    await this.enqueueSale(orderId, paymentId);

    const created = await this.prisma.fiscalReceipt.findFirst({
      where: { orderId, type: 'SALE', status: { in: ['PENDING', 'FAILED'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!created || created.status === 'FAILED') {
      return {
        rebuilt: false,
        message: `Chek baribir qurilmadi: ${created?.lastError ?? 'noma’lum sabab'}`,
      };
    }
    return { rebuilt: true, message: 'Chek qayta qurildi va navbatga qo‘yildi' };
  }

  /* ======================================================================
     ADMIN
     ====================================================================== */

  async list(query: { status?: string; type?: string; page?: number; perPage?: number }) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 30;
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.fiscalReceipt.count({ where: where as never }),
      this.prisma.fiscalReceipt.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { order: { select: { number: true, contactPhone: true } } },
      }),
    ]);

    return {
      items: rows.map((r: ReceiptRow) => ({
        id: r.id,
        orderId: r.orderId,
        orderNumber: r.order?.number ?? null,
        type: r.type,
        status: r.status,
        totalAmount: (r.totalAmount as bigint).toString(),
        vatAmount: (r.vatAmount as bigint).toString(),
        fiscalSign: r.fiscalSign,
        receiptUrl: r.receiptUrl,
        attempts: r.attempts,
        lastError: r.lastError,
        nextRetryAt: r.nextRetryAt,
        sentAt: r.sentAt,
        createdAt: r.createdAt,
      })),
      total,
      page,
      perPage,
      /** Interfeys maket rejimini ochiq ko'rsatishi uchun. */
      mock: this.ofd.isMock,
    };
  }

  async get(id: string) {
    const receipt = await this.prisma.fiscalReceipt.findUnique({
      where: { id },
      include: { order: { select: { number: true } } },
    });
    if (!receipt) throw new NotFoundException('Chek topilmadi');
    return receipt;
  }

  /** Muddati o'tgan yoki keraksiz chekni yopish. */
  async cancel(id: string, reason: string) {
    const receipt = await this.get(id);
    if (receipt.status === 'SENT') {
      throw new BadRequestException('Yuborilgan chekni bekor qilib bo‘lmaydi');
    }
    return this.prisma.fiscalReceipt.update({
      where: { id },
      data: { status: 'CANCELLED', lastError: reason, nextRetryAt: null },
    });
  }
}

export { FiscalBuildError, backoffMs };
