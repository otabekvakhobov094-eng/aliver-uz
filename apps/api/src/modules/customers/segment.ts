/**
 * Mijoz segmentlari.
 *
 * TZ 41 da segmentlar sanab o'tilgan ("yangi", "takroriy", "sodiq"),
 * lekin CHEGARALAR yozilmagan (ekspertiza C-6). Natijada har bir
 * hisobotda o'z chegarasi paydo bo'lardi. Bu yerda ular bitta joyda
 * va ataylab Prisma dan mustaqil — testda baza kerak emas.
 */
export type Segment = 'NEW' | 'REPEAT' | 'LOYAL' | 'SLEEPING';

/** Shu kundan ko'p vaqt o'tsa mijoz "uxlab qolgan" hisoblanadi. */
export const SLEEPING_AFTER_DAYS = 90;
export const REPEAT_FROM_ORDERS = 2;
export const LOYAL_FROM_ORDERS = 5;

export const SEGMENT_LABEL: Record<Segment, { uz: string; ru: string }> = {
  NEW: { uz: 'Yangi', ru: 'Новый' },
  REPEAT: { uz: 'Takroriy', ru: 'Повторный' },
  LOYAL: { uz: 'Sodiq', ru: 'Лояльный' },
  SLEEPING: { uz: 'Uxlab qolgan', ru: 'Спящий' },
};

export function segmentOf(
  c: { ordersCount: number; lastOrderAt: Date | null },
  now: Date = new Date(),
): Segment {
  // "Uxlab qolgan" boshqa segmentlardan USTUN: sodiq mijoz ham
  // uch oy kelmasa, uni qaytarish kerak.
  if (
    c.lastOrderAt &&
    now.getTime() - c.lastOrderAt.getTime() > SLEEPING_AFTER_DAYS * 24 * 3600 * 1000
  ) {
    return 'SLEEPING';
  }
  if (c.ordersCount >= LOYAL_FROM_ORDERS) return 'LOYAL';
  if (c.ordersCount >= REPEAT_FROM_ORDERS) return 'REPEAT';
  return 'NEW';
}
