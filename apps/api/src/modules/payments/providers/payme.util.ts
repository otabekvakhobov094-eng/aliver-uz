import { base64 } from '../webhook.util';

/**
 * Payme Merchant API xato kodlari.
 * Manba: Payme "Merchant API" hujjatlari, "Ошибки" bo'limi.
 */
export const PAYME_ERROR = {
  /** Tizim xatosi. */
  INTERNAL: -32400,
  /** JSON noto'g'ri. */
  PARSE: -32700,
  /** So'rov formati noto'g'ri. */
  INVALID_REQUEST: -32600,
  /** Bunday metod yo'q. */
  METHOD_NOT_FOUND: -32601,
  /** Avtorizatsiya xatosi (kalit noto'g'ri). */
  INSUFFICIENT_PRIVILEGE: -32504,
  /** Tranzaksiyani bajarib bo'lmaydi. */
  CANT_DO_OPERATION: -31008,
  /** Tranzaksiya topilmadi. */
  TRANSACTION_NOT_FOUND: -31003,
  /** Summa noto'g'ri. */
  INVALID_AMOUNT: -31001,
  /** Buyurtma topilmadi yoki holati mos emas (-31050..-31099 oralig'i). */
  ORDER_NOT_FOUND: -31050,
  /** Buyurtma allaqachon to'langan yoki bekor qilingan. */
  ORDER_UNAVAILABLE: -31051,
} as const;

/** Payme xato matnlari uch tilda bo'lishi shart. */
export interface PaymeErrorMessage {
  uz: string;
  ru: string;
  en: string;
}

export const PAYME_MESSAGE: Record<number, PaymeErrorMessage> = {
  [PAYME_ERROR.ORDER_NOT_FOUND]: {
    uz: 'Buyurtma topilmadi',
    ru: 'Заказ не найден',
    en: 'Order not found',
  },
  [PAYME_ERROR.ORDER_UNAVAILABLE]: {
    uz: 'Buyurtmani to‘lash mumkin emas',
    ru: 'Заказ не может быть оплачен',
    en: 'Order cannot be paid',
  },
  [PAYME_ERROR.INVALID_AMOUNT]: {
    uz: 'To‘lov summasi noto‘g‘ri',
    ru: 'Неверная сумма платежа',
    en: 'Invalid payment amount',
  },
  [PAYME_ERROR.TRANSACTION_NOT_FOUND]: {
    uz: 'Tranzaksiya topilmadi',
    ru: 'Транзакция не найдена',
    en: 'Transaction not found',
  },
  [PAYME_ERROR.CANT_DO_OPERATION]: {
    uz: 'Amalni bajarib bo‘lmaydi',
    ru: 'Невозможно выполнить операцию',
    en: 'Unable to perform operation',
  },
  [PAYME_ERROR.INSUFFICIENT_PRIVILEGE]: {
    uz: 'Ruxsat yetarli emas',
    ru: 'Недостаточно привилегий',
    en: 'Insufficient privilege',
  },
  [PAYME_ERROR.METHOD_NOT_FOUND]: {
    uz: 'Metod topilmadi',
    ru: 'Метод не найден',
    en: 'Method not found',
  },
};

/** Payme tranzaksiya holati. */
export const PAYME_STATE = {
  CREATED: 1,
  PERFORMED: 2,
  CANCELLED_BEFORE_PERFORM: -1,
  CANCELLED_AFTER_PERFORM: -2,
} as const;

export type PaymeState = (typeof PAYME_STATE)[keyof typeof PAYME_STATE];

export interface PaymeRpcRequest {
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

export class PaymeError extends Error {
  constructor(
    readonly code: number,
    readonly data?: string,
    message?: PaymeErrorMessage,
  ) {
    super(message?.en ?? `Payme error ${code}`);
    this.name = 'PaymeError';
    this.payload = message ??
      PAYME_MESSAGE[code] ?? {
        uz: 'Xatolik',
        ru: 'Ошибка',
        en: 'Error',
      };
  }

  readonly payload: PaymeErrorMessage;
}

/** JSON-RPC muvaffaqiyatli javobi. */
export function rpcResult(id: number | string | null | undefined, result: unknown) {
  return { jsonrpc: '2.0', id: id ?? 0, result };
}

/**
 * JSON-RPC xato javobi.
 *
 * Payme HTTP holatini emas, javob ichidagi `error` ni o'qiydi — shuning
 * uchun xatoda ham 200 qaytariladi.
 */
export function rpcError(
  id: number | string | null | undefined,
  code: number,
  data?: string,
  message?: PaymeErrorMessage,
) {
  return {
    jsonrpc: '2.0',
    id: id ?? 0,
    error: {
      code,
      message: message ?? PAYME_MESSAGE[code] ?? { uz: 'Xatolik', ru: 'Ошибка', en: 'Error' },
      ...(data ? { data } : {}),
    },
  };
}

/**
 * Payme summani TIYINDA yuboradi — bizdagi birlik bilan bir xil.
 * Shuning uchun o'girish yo'q, faqat tekshiruv.
 */
export function paymeAmountToTiyin(value: unknown): bigint | null {
  if (typeof value === 'bigint') return value >= 0n ? value : null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  // Kasrli summa Payme da bo'lmaydi; kelsa — bu xato.
  if (!Number.isInteger(value) || value < 0) return null;
  return BigInt(value);
}

/**
 * Checkout havolasi: base64("m=MERCHANT;ac.order_id=ID;a=AMOUNT;c=RETURN_URL").
 * Payme aynan shu ko'rinishni kutadi.
 */
export function paymeCheckoutUrl(params: {
  baseUrl: string;
  merchantId: string;
  orderField: string;
  orderValue: string;
  amountTiyin: bigint;
  returnUrl: string;
}): string {
  const parts = [
    `m=${params.merchantId}`,
    `ac.${params.orderField}=${params.orderValue}`,
    `a=${params.amountTiyin.toString()}`,
    `c=${params.returnUrl}`,
  ].join(';');
  return `${params.baseUrl.replace(/\/+$/, '')}/${base64(parts)}`;
}

/**
 * Tranzaksiya muddati tugaganini aniqlaydi.
 * Payme qoidasi: yaratilgandan 12 soat o'tsa tranzaksiya bajarilmaydi.
 */
export function isTransactionExpired(createdAtMs: number, now: number, timeoutMs: number): boolean {
  return now - createdAtMs > timeoutMs;
}

/**
 * Payme `time` maydonini millisekundda beradi. Kelgan qiymat soniyada
 * bo'lib qolsa (ba'zi test muhitlarida shunday bo'ladi), uni tuzatamiz.
 */
export function normalizePaymeTime(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  // 10 xonali qiymat — soniya, 13 xonali — millisekund.
  return value < 1e11 ? Math.round(value * 1000) : Math.round(value);
}
