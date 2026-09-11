/**
 * Bu modul ataylab Prisma dan mustaqil: domen qoidalari ma'lumotlar bazasi
 * generatsiyasisiz ham testlanadi. Tiplar Prisma enumlari bilan bir xil
 * bo'lishi kerak — mos kelmasa prisma-enum-compat.spec.ts xato beradi.
 */
export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKING'
  | 'READY'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED';

export type PaymentStatus =
  'PENDING' | 'WAITING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

/**
 * Buyurtma va to'lov holat mashinalari.
 *
 * TZ 31 va 35-bo'limlarda statuslar sanab o'tilgan, lekin ular o'rtasidagi
 * RUXSAT ETILGAN O'TISHLAR yozilmagan. Natijada har bir dasturchi o'zicha
 * hal qiladi va "yetkazilgan" buyurtma yana "yangi" bo'lib qolishi mumkin.
 * Ekspertiza A-7.
 */

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKING', 'CANCELLED'],
  PACKING: ['READY', 'CANCELLED'],
  READY: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURN_REQUESTED', 'CANCELLED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'], // rad etilsa DELIVERED ga qaytadi
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
  CANCELLED: [],
};

/** Bu statuslardan keyin buyurtma yakunlangan hisoblanadi. */
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = ['REFUNDED', 'CANCELLED'];

/** Rezerv shu statuslarda ushlab turiladi. */
export const RESERVING_STATUSES: OrderStatus[] = [
  'NEW',
  'CONFIRMED',
  'PROCESSING',
  'PACKING',
  'READY',
];

/**
 * To'lov holatlari.
 *
 * `CANCELLED` va `FAILED` dan `PENDING` ga QAYTISH mumkin: karta rad
 * etilgan mijoz qayta to'lay olishi kerak, aks holda buyurtma abadiy
 * to'lanmay qolardi. `PAID` va `REFUNDED` esa yakuniy — to'langan pulni
 * "to'lanmagan" holatiga qaytarib bo'lmaydi.
 */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['WAITING', 'PAID', 'FAILED', 'CANCELLED'],
  WAITING: ['PAID', 'FAILED', 'CANCELLED'],
  PAID: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  PARTIALLY_REFUNDED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  FAILED: ['PENDING'],
  CANCELLED: ['PENDING'],
  REFUNDED: [],
};

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: string,
    readonly to: string,
    kind: 'buyurtma' | 'to‘lov',
  ) {
    super(`Ruxsat etilmagan ${kind} holati o‘tishi: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return (ORDER_TRANSITIONS[from] ?? []).includes(to);
}

export function assertOrderTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) throw new InvalidTransitionError(from, to, 'buyurtma');
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return (PAYMENT_TRANSITIONS[from] ?? []).includes(to);
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransitionPayment(from, to)) throw new InvalidTransitionError(from, to, 'to‘lov');
}
