/**
 * Qaytarish holatlari.
 *
 * TZ 56 da statuslar sanab o'tilgan, lekin o'tishlar yozilmagan —
 * buyurtma holat mashinasidagi kabi (ekspertiza A-7). Ataylab Prisma
 * dan mustaqil: testda baza kerak emas.
 */
export type ReturnStatus =
  'REQUESTED' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'REFUNDED' | 'CANCELLED';

export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  // Tasdiqlangach mijoz tovarni jo'natadi yoki kuryer olib ketadi.
  APPROVED: ['IN_TRANSIT', 'RECEIVED', 'CANCELLED'],
  IN_TRANSIT: ['RECEIVED', 'CANCELLED'],
  // Qabul qilingandan keyin faqat pul qaytariladi: tovar bizda.
  RECEIVED: ['REFUNDED'],
  REFUNDED: [],
  REJECTED: [],
  CANCELLED: [],
};

/** Mijoz o'z so'rovini faqat shu holatlarda bekor qila oladi. */
export const CUSTOMER_CANCELLABLE: ReturnStatus[] = ['REQUESTED', 'APPROVED'];

/** Yakuniy holatlar. */
export const TERMINAL_RETURN_STATUSES: ReturnStatus[] = ['REFUNDED', 'REJECTED', 'CANCELLED'];

/**
 * Shu holatlarda qaytarish "ochiq" hisoblanadi va bitta buyurtmaga
 * ikkinchi so'rov ochilmaydi — aks holda ikkita qaytarish bir xil
 * pozitsiyani qaytarib, pul ikki marta qaytarilardi.
 */
export const OPEN_RETURN_STATUSES: ReturnStatus[] = [
  'REQUESTED',
  'APPROVED',
  'IN_TRANSIT',
  'RECEIVED',
];

export class InvalidReturnTransition extends Error {
  constructor(
    readonly from: ReturnStatus,
    readonly to: ReturnStatus,
  ) {
    super(`Ruxsat etilmagan qaytarish holati o‘tishi: ${from} -> ${to}`);
    this.name = 'InvalidReturnTransition';
  }
}

export function canTransitionReturn(from: ReturnStatus, to: ReturnStatus): boolean {
  return (RETURN_TRANSITIONS[from] ?? []).includes(to);
}

export function assertReturnTransition(from: ReturnStatus, to: ReturnStatus): void {
  if (!canTransitionReturn(from, to)) throw new InvalidReturnTransition(from, to);
}

export const RETURN_STATUS_LABEL: Record<ReturnStatus, { uz: string; ru: string }> = {
  REQUESTED: { uz: 'So‘rov yuborildi', ru: 'Запрос отправлен' },
  APPROVED: { uz: 'Tasdiqlandi', ru: 'Одобрен' },
  REJECTED: { uz: 'Rad etildi', ru: 'Отклонён' },
  IN_TRANSIT: { uz: 'Yo‘lda', ru: 'В пути' },
  RECEIVED: { uz: 'Qabul qilindi', ru: 'Получен' },
  REFUNDED: { uz: 'Pul qaytarildi', ru: 'Деньги возвращены' },
  CANCELLED: { uz: 'Bekor qilindi', ru: 'Отменён' },
};
