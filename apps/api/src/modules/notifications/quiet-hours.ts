/**
 * "Jim soatlar" — tunda SMS yubormaslik qoidasi.
 *
 * TZ da bunday qoida yo'q edi (ekspertiza C-7). Amalda esa soat 23:00 da
 * "buyurtmangiz qadoqlanmoqda" degan SMS mijozni uyg'otadi va brendga
 * salbiy ta'sir qiladi. Shu sababli:
 *
 *  - SHOSHILINCH xabarlar (to'lov, bekor qilish, kuryer yo'lda) har doim
 *    yuboriladi — ular mijozning puliga tegishli;
 *  - qolganlari ertalabgacha kutadi.
 *
 * Vaqt mintaqasi — Asia/Tashkent (UTC+5), soat siljishi yo'q.
 */
export const TASHKENT_OFFSET_MINUTES = 5 * 60;

export interface QuietHours {
  /** Boshlanish soati, mahalliy vaqt. Standart 22. */
  from: number;
  /** Tugash soati, mahalliy vaqt. Standart 8. */
  to: number;
}

export const DEFAULT_QUIET_HOURS: QuietHours = { from: 22, to: 8 };

/** Toshkent vaqtidagi soat (0–23). */
export function tashkentHour(at: Date): number {
  const local = new Date(at.getTime() + TASHKENT_OFFSET_MINUTES * 60_000);
  return local.getUTCHours();
}

export function isQuiet(at: Date, hours: QuietHours = DEFAULT_QUIET_HOURS): boolean {
  const h = tashkentHour(at);
  // Oraliq yarim tundan o'tadi (22:00–08:00), shuning uchun ikki shart.
  if (hours.from > hours.to) return h >= hours.from || h < hours.to;
  return h >= hours.from && h < hours.to;
}

/**
 * Jim soatlar tugaydigan eng yaqin payt.
 * Xabar shu vaqtga qoldiriladi.
 */
export function nextSendableAt(at: Date, hours: QuietHours = DEFAULT_QUIET_HOURS): Date {
  if (!isQuiet(at, hours)) return at;

  const local = new Date(at.getTime() + TASHKENT_OFFSET_MINUTES * 60_000);
  const target = new Date(local);
  target.setUTCHours(hours.to, 0, 0, 0);

  // Agar hozir tunda, lekin `to` dan keyin bo'lsa — ertangi kunga.
  if (target.getTime() <= local.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return new Date(target.getTime() - TASHKENT_OFFSET_MINUTES * 60_000);
}

/** Shoshilinch shablonlar — jim soatlarga qaramaydi. */
export const URGENT_TEMPLATES = new Set([
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'ORDER_CANCELLED',
  'REFUND_DONE',
  'ORDER_SHIPPED',
  'ORDER_SHIPPED_NO_COURIER',
  'STAFF_NEW_ORDER',
  'STAFF_RETURN_REQUESTED',
  'STAFF_PAYMENT_FAILED',
  'STAFF_LOW_STOCK',
  'STAFF_FISCAL_FAILED',
]);
