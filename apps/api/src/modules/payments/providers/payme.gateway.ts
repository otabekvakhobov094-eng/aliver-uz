import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { OrderNotPayableError, PaymentService } from '../payment.service';
import { parseBasicAuth, safeEqual } from '../webhook.util';
import {
  PAYME_ERROR,
  PAYME_MESSAGE,
  PAYME_STATE,
  PaymeError,
  isTransactionExpired,
  normalizePaymeTime,
  paymeAmountToTiyin,
  paymeCheckoutUrl,
  type PaymeRpcRequest,
} from './payme.util';
import type { PaymentGateway, PaymentLink } from '../payment-gateway';

/** Payme buyurtmani shu maydon orqali uzatadi: `ac.order_id`. */
const ORDER_FIELD = 'order_id';

/**
 * Payme Merchant API (JSON-RPC 2.0).
 *
 * Payme oltita metod chaqiradi va HAR BIRIDA bizning javobimizni
 * qat'iy formatda kutadi. Eng ko'p uchraydigan xato — 500 qaytarish:
 * Payme uni "tizim ishlamayapti" deb hisoblaydi va integratsiyani
 * o'chirib qo'yishi mumkin. Shuning uchun bu yerda HAMMA xato JSON-RPC
 * `error` sifatida, HTTP 200 bilan qaytariladi.
 */
@Injectable()
export class PaymeGateway implements PaymentGateway {
  readonly code = 'PAYME' as const;
  private readonly logger = new Logger(PaymeGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService,
    private readonly config: ConfigService,
  ) {}

  private get mode(): 'mock' | 'sandbox' | 'live' {
    return this.config.get<'mock' | 'sandbox' | 'live'>('PAYMENTS_MODE') ?? 'mock';
  }

  private get timeoutMs(): number {
    return this.config.get<number>('PAYME_TRANSACTION_TIMEOUT_MS') ?? 43_200_000;
  }

  /* --------------------------------- Havola -------------------------------- */

  createLink(params: {
    orderId: string;
    orderNumber: string;
    amount: bigint;
    returnUrl: string;
  }): PaymentLink {
    if (this.mode === 'mock') {
      const web = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
      return {
        kind: 'redirect',
        url: `${web}/uz/tolov/maket?order=${encodeURIComponent(params.orderId)}&provider=PAYME`,
        mock: true,
      };
    }

    return {
      kind: 'redirect',
      url: paymeCheckoutUrl({
        baseUrl: this.config.get<string>('PAYME_CHECKOUT_URL') ?? 'https://checkout.paycom.uz',
        merchantId: this.config.get<string>('PAYME_MERCHANT_ID') ?? '',
        orderField: ORDER_FIELD,
        orderValue: params.orderNumber,
        amountTiyin: params.amount,
        returnUrl: params.returnUrl,
      }),
      mock: false,
    };
  }

  /* ---------------------------- Avtorizatsiya ---------------------------- */

  /**
   * Payme `Basic base64("Paycom:KEY")` yuboradi.
   * Sandbox va live uchun kalitlar har xil.
   */
  authorize(header: string | undefined): boolean {
    if (this.mode === 'mock') return true;

    const parsed = parseBasicAuth(header);
    if (!parsed || parsed.login !== 'Paycom') return false;

    const key =
      this.mode === 'sandbox'
        ? (this.config.get<string>('PAYME_TEST_KEY') ?? this.config.get<string>('PAYME_KEY') ?? '')
        : (this.config.get<string>('PAYME_KEY') ?? '');

    if (!key) return false;
    return safeEqual(parsed.password, key);
  }

  /* -------------------------------- Dispatch -------------------------------- */

  async handle(body: PaymeRpcRequest): Promise<unknown> {
    const method = body.method ?? '';
    const params = (body.params ?? {}) as Record<string, unknown>;

    switch (method) {
      case 'CheckPerformTransaction':
        return this.checkPerform(params);
      case 'CreateTransaction':
        return this.createTransaction(params);
      case 'PerformTransaction':
        return this.performTransaction(params);
      case 'CancelTransaction':
        return this.cancelTransaction(params);
      case 'CheckTransaction':
        return this.checkTransaction(params);
      case 'GetStatement':
        return this.getStatement(params);
      default:
        throw new PaymeError(PAYME_ERROR.METHOD_NOT_FOUND, method);
    }
  }

  /* ------------------------------ Yordamchilar ------------------------------ */

  /** `account.order_id` bo'yicha to'lovni topadi va summani tekshiradi. */
  private async resolveOrder(params: Record<string, unknown>) {
    const account = (params.account ?? {}) as Record<string, unknown>;
    const value = account[ORDER_FIELD];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new PaymeError(PAYME_ERROR.ORDER_NOT_FOUND, ORDER_FIELD);
    }

    const payment = await this.payments.byOrderNumber(value);
    if (!payment || payment.provider !== 'PAYME') {
      throw new PaymeError(PAYME_ERROR.ORDER_NOT_FOUND, ORDER_FIELD);
    }

    const amount = paymeAmountToTiyin(params.amount);
    if (amount === null) throw new PaymeError(PAYME_ERROR.INVALID_AMOUNT, 'amount');
    if (amount !== (payment.amount as bigint)) {
      this.logger.warn(
        `Payme: summa mos kelmadi. Kutilgan ${payment.amount}, kelgan ${amount} (${value})`,
      );
      throw new PaymeError(PAYME_ERROR.INVALID_AMOUNT, 'amount');
    }

    return payment;
  }

  /** Payme tranzaksiya id si bo'yicha bizning to'lovimiz. */
  private async byPaymeId(id: unknown) {
    if (typeof id !== 'string' || id.length === 0) {
      throw new PaymeError(PAYME_ERROR.TRANSACTION_NOT_FOUND, 'id');
    }
    const payment = await this.prisma.payment.findFirst({
      where: { provider: 'PAYME', providerTxnId: id },
      include: { transactions: { orderBy: { createdAt: 'asc' } }, order: true },
    });
    if (!payment) throw new PaymeError(PAYME_ERROR.TRANSACTION_NOT_FOUND, 'id');
    return payment;
  }

  /** Bizning holatimizni Payme kodiga o'giradi. */
  private stateOf(payment: { status: string; refundedAmount: bigint | number }): number {
    switch (payment.status) {
      case 'PAID':
        return PAYME_STATE.PERFORMED;
      case 'WAITING':
      case 'PENDING':
        return PAYME_STATE.CREATED;
      case 'REFUNDED':
        return PAYME_STATE.CANCELLED_AFTER_PERFORM;
      case 'PARTIALLY_REFUNDED':
        // Tranzaksiyaning O'ZI bajarilgan; qisman qaytarish Payme
        // tushunchasida alohida hodisa emas. Uni "bekor qilingan" deb
        // ko'rsatsak, Payme butun summa qaytgan deb hisoblardi.
        return PAYME_STATE.PERFORMED;
      default:
        return PAYME_STATE.CANCELLED_BEFORE_PERFORM;
    }
  }

  private ms(value: Date | null | undefined): number {
    return value ? value.getTime() : 0;
  }

  /* --------------------------------- Metodlar -------------------------------- */

  /** Buyurtmani to'lash mumkinmi? */
  private async checkPerform(params: Record<string, unknown>) {
    const payment = await this.resolveOrder(params);

    if (payment.status === 'PAID') {
      throw new PaymeError(
        PAYME_ERROR.ORDER_UNAVAILABLE,
        undefined,
        PAYME_MESSAGE[PAYME_ERROR.ORDER_UNAVAILABLE],
      );
    }
    if (payment.status === 'CANCELLED' || payment.status === 'FAILED') {
      throw new PaymeError(PAYME_ERROR.ORDER_UNAVAILABLE);
    }

    const order = await this.prisma.order.findUnique({
      where: { id: payment.orderId },
      select: { status: true },
    });
    if (!order || order.status === 'CANCELLED') {
      throw new PaymeError(PAYME_ERROR.ORDER_UNAVAILABLE);
    }

    return { allow: true };
  }

  /** Tranzaksiya yaratish. Idempotent: bir xil id bilan qayta kelsa o'shani qaytaradi. */
  private async createTransaction(params: Record<string, unknown>) {
    const id = params.id;
    if (typeof id !== 'string') throw new PaymeError(PAYME_ERROR.TRANSACTION_NOT_FOUND, 'id');

    const existingByTxn = await this.prisma.payment.findFirst({
      where: { provider: 'PAYME', providerTxnId: id },
      include: { transactions: { orderBy: { createdAt: 'asc' }, take: 1 } },
    });

    if (existingByTxn) {
      const createdAt = this.ms(
        existingByTxn.transactions[0]?.createdAt ?? existingByTxn.createdAt,
      );
      // Muddati o'tgan tranzaksiya bajarilmaydi.
      if (
        existingByTxn.status !== 'PAID' &&
        isTransactionExpired(createdAt, Date.now(), this.timeoutMs)
      ) {
        await this.payments.markCancelled({
          paymentId: existingByTxn.id,
          reason: 'Payme: tranzaksiya muddati tugadi',
        });
        throw new PaymeError(PAYME_ERROR.CANT_DO_OPERATION, 'timeout');
      }
      if (existingByTxn.status === 'CANCELLED' || existingByTxn.status === 'FAILED') {
        throw new PaymeError(PAYME_ERROR.CANT_DO_OPERATION);
      }

      return {
        create_time: createdAt,
        transaction: existingByTxn.id,
        state: this.stateOf(existingByTxn as never),
      };
    }

    const payment = await this.resolveOrder(params);

    if (payment.status === 'PAID') throw new PaymeError(PAYME_ERROR.ORDER_UNAVAILABLE);
    if (payment.status === 'CANCELLED' || payment.status === 'FAILED') {
      throw new PaymeError(PAYME_ERROR.ORDER_UNAVAILABLE);
    }
    // Bitta buyurtmaga ikkinchi tranzaksiya ochilmaydi.
    if (payment.providerTxnId && payment.providerTxnId !== id) {
      throw new PaymeError(PAYME_ERROR.ORDER_UNAVAILABLE);
    }

    await this.payments.markWaiting(payment.id, id);
    const txn = await this.payments.upsertTransaction({
      paymentId: payment.id,
      state: 'CREATED',
      amount: payment.amount as bigint,
    });

    return {
      create_time: normalizePaymeTime(params.time, this.ms(txn.createdAt)),
      transaction: payment.id,
      state: PAYME_STATE.CREATED,
    };
  }

  /** Pulni yechish. */
  private async performTransaction(params: Record<string, unknown>) {
    const payment = await this.byPaymeId(params.id);

    if (payment.status === 'PAID') {
      // Takroriy chaqiruv — xato emas, o'sha javob qaytariladi.
      return {
        transaction: payment.id,
        perform_time: this.ms(payment.paidAt),
        state: PAYME_STATE.PERFORMED,
      };
    }
    if (payment.status === 'CANCELLED' || payment.status === 'FAILED') {
      throw new PaymeError(PAYME_ERROR.CANT_DO_OPERATION);
    }

    const createdAt = this.ms(payment.transactions[0]?.createdAt ?? payment.createdAt);
    if (isTransactionExpired(createdAt, Date.now(), this.timeoutMs)) {
      await this.payments.markCancelled({
        paymentId: payment.id,
        reason: 'Payme: tranzaksiya muddati tugadi',
      });
      throw new PaymeError(PAYME_ERROR.CANT_DO_OPERATION, 'timeout');
    }

    /*
     * Buyurtma bekor qilingan bo'lsa, Payme ga XATO qaytaramiz — shunda
     * pul umuman yechilmaydi. `CheckPerformTransaction` buni allaqachon
     * tekshiradi, lekin uning va `PerformTransaction` ning orasida
     * soatlar o'tishi mumkin (tranzaksiya muddati 12 soat, rezerv esa
     * 30 daqiqa), shuning uchun tekshiruv shu yerda ham kerak.
     */
    try {
      await this.payments.markPaid({
        paymentId: payment.id,
        providerTxnId: String(params.id),
      });
    } catch (error) {
      if (error instanceof OrderNotPayableError) {
        await this.payments.markCancelled({
          paymentId: payment.id,
          reason: `Payme: buyurtma ${error.orderStatus} holatida`,
        });
        throw new PaymeError(PAYME_ERROR.CANT_DO_OPERATION, 'order-not-payable');
      }
      throw error;
    }
    await this.payments.upsertTransaction({
      paymentId: payment.id,
      state: 'PERFORMED',
      amount: payment.amount as bigint,
    });

    const fresh = await this.payments.byId(payment.id);
    return {
      transaction: payment.id,
      perform_time: this.ms(fresh.paidAt),
      state: PAYME_STATE.PERFORMED,
    };
  }

  /** Bekor qilish. To'langandan keyin ham bo'lishi mumkin (qaytarish). */
  private async cancelTransaction(params: Record<string, unknown>) {
    const payment = await this.byPaymeId(params.id);
    const reason = typeof params.reason === 'number' ? params.reason : null;
    // Qisman qaytarilgan to'lov ham TO'LANGAN hisoblanadi: bekor qilishda
    // qolgan summa qaytariladi, "bekor qilish" yo'liga tushmaydi.
    const wasPaid = payment.status === 'PAID' || payment.status === 'PARTIALLY_REFUNDED';

    if (payment.status === 'CANCELLED' || payment.status === 'REFUNDED') {
      const txn = payment.transactions[payment.transactions.length - 1];
      return {
        transaction: payment.id,
        cancel_time: this.ms(txn?.cancelledAt ?? payment.cancelledAt),
        state: this.stateOf(payment as never),
      };
    }

    if (wasPaid) {
      // To'langan tranzaksiyani bekor qilish — bu QAYTARISH.
      await this.payments.refund({
        paymentId: payment.id,
        amount: (payment.amount as bigint) - (payment.refundedAmount as bigint),
        reason: `Payme bekor qilish, sabab kodi: ${reason ?? '—'}`,
      });
    } else {
      await this.payments.markCancelled({
        paymentId: payment.id,
        reason: `Payme bekor qilish, sabab kodi: ${reason ?? '—'}`,
      });
    }

    await this.payments.upsertTransaction({
      paymentId: payment.id,
      state: 'CANCELLED',
      amount: payment.amount as bigint,
      reason,
    });

    return {
      transaction: payment.id,
      cancel_time: Date.now(),
      state: wasPaid ? PAYME_STATE.CANCELLED_AFTER_PERFORM : PAYME_STATE.CANCELLED_BEFORE_PERFORM,
    };
  }

  /** Holatni so'rash. */
  private async checkTransaction(params: Record<string, unknown>) {
    const payment = await this.byPaymeId(params.id);
    const txn = payment.transactions[0];
    const last = payment.transactions[payment.transactions.length - 1];

    return {
      create_time: this.ms(txn?.createdAt ?? payment.createdAt),
      perform_time: this.ms(payment.paidAt),
      cancel_time: this.ms(last?.cancelledAt ?? payment.cancelledAt),
      transaction: payment.id,
      state: this.stateOf(payment as never),
      reason: last?.reason ?? null,
    };
  }

  /**
   * Vypiska: berilgan davrdagi tranzaksiyalar.
   * Payme aynan shu metod orqali kunlik moslashtirishni bajaradi.
   */
  private async getStatement(params: Record<string, unknown>) {
    const from = typeof params.from === 'number' ? new Date(params.from) : null;
    const to = typeof params.to === 'number' ? new Date(params.to) : null;
    if (!from || !to) throw new PaymeError(PAYME_ERROR.INVALID_REQUEST, 'from/to');

    const rows = await this.prisma.payment.findMany({
      where: {
        provider: 'PAYME',
        providerTxnId: { not: null },
        createdAt: { gte: from, lte: to },
      },
      include: {
        transactions: { orderBy: { createdAt: 'asc' } },
        order: { select: { number: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 1000,
    });

    return {
      transactions: rows.map((p) => {
        const first = p.transactions[0];
        const last = p.transactions[p.transactions.length - 1];
        return {
          id: p.providerTxnId,
          time: this.ms(first?.createdAt ?? p.createdAt),
          amount: Number(p.amount as bigint),
          account: { [ORDER_FIELD]: p.order?.number ?? null },
          create_time: this.ms(first?.createdAt ?? p.createdAt),
          perform_time: this.ms(p.paidAt),
          cancel_time: this.ms(last?.cancelledAt ?? p.cancelledAt),
          transaction: p.id,
          state: this.stateOf(p as never),
          reason: last?.reason ?? null,
        };
      }),
    };
  }
}
