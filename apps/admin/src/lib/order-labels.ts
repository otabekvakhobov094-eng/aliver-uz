/**
 * Buyurtma statuslarining o'zbekcha nomlari va ranglari.
 *
 * Ro'yxat holat mashinasi bilan bir xil (`ORDER_TRANSITIONS`) — yangi status
 * qo'shilsa, bu yerga ham qo'shiladi, aks holda admin xom kodni ko'radi.
 */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: 'Yangi',
  CONFIRMED: 'Tasdiqlangan',
  PROCESSING: 'Tayyorlanmoqda',
  PACKING: 'Qadoqlanmoqda',
  READY: 'Jo‘natishga tayyor',
  SHIPPED: 'Yo‘lda',
  DELIVERED: 'Yetkazilgan',
  CANCELLED: 'Bekor qilingan',
  RETURN_REQUESTED: 'Qaytarish so‘ralgan',
  RETURNED: 'Qaytarilgan',
  REFUNDED: 'Pul qaytarilgan',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Kutilmoqda',
  WAITING: 'Tekshirilmoqda',
  PAID: 'To‘langan',
  FAILED: 'Amalga oshmadi',
  CANCELLED: 'Bekor qilingan',
  REFUNDED: 'Qaytarilgan',
  PARTIALLY_REFUNDED: 'Qisman qaytarilgan',
};

export const PAYMENT_PROVIDER_LABEL: Record<string, string> = {
  CLICK: 'Click',
  PAYME: 'Payme',
  UZUM: 'Uzum',
  CASH_ON_DELIVERY: 'Naqd',
};

export type Tone = 'mint' | 'neutral' | 'low' | 'new';

export const ORDER_STATUS_TONE: Record<string, Tone> = {
  NEW: 'new',
  CONFIRMED: 'mint',
  PROCESSING: 'neutral',
  PACKING: 'neutral',
  READY: 'neutral',
  SHIPPED: 'new',
  DELIVERED: 'mint',
  CANCELLED: 'low',
  RETURN_REQUESTED: 'low',
  RETURNED: 'low',
  REFUNDED: 'low',
};

export const label = (map: Record<string, string>, key: string): string => map[key] ?? key;

export function fmtDateTime(v: string): string {
  return new Date(v).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Rezerv tugashiga qancha qolgani — ro'yxatda "yonib turgan" buyurtmalarni ko'rsatadi. */
export function reservationLeft(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'muddati o‘tgan';
  return `${Math.max(1, Math.round(ms / 60000))} daq.`;
}

/** To'lov provayderi va holatlari — admin ekranlari uchun. */
export const PAYMENT_TONE: Record<string, Tone> = {
  PENDING: 'neutral',
  WAITING: 'new',
  PAID: 'mint',
  FAILED: 'low',
  CANCELLED: 'low',
  REFUNDED: 'low',
  PARTIALLY_REFUNDED: 'low',
};

export const FISCAL_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Navbatda',
  SENT: 'Yuborilgan',
  FAILED: 'Xato',
  CANCELLED: 'Bekor qilingan',
};

export const FISCAL_STATUS_TONE: Record<string, Tone> = {
  PENDING: 'new',
  SENT: 'mint',
  FAILED: 'low',
  CANCELLED: 'neutral',
};

export const FISCAL_TYPE_LABEL: Record<string, string> = {
  SALE: 'Sotuv',
  REFUND: 'Qaytarish',
};

export const MISMATCH_LABEL: Record<string, string> = {
  MISSING_LOCALLY: 'Provayderda bor, bizda yo‘q',
  MISSING_AT_PROVIDER: 'Bizda bor, provayderda yo‘q',
  AMOUNT_MISMATCH: 'Summa mos kelmadi',
  CANCELLED_AT_PROVIDER: 'Provayderda bekor qilingan',
};

/** Tiyindan so'mga — admin formalarida kiritish uchun. */
export function tiyinToSumInput(tiyin: string): string {
  const t = BigInt(tiyin || '0');
  return `${t / 100n}.${String(t % 100n).padStart(2, '0')}`;
}

/** So'm satridan tiyinga. Suzuvchi nuqta ishlatilmaydi. */
export function sumInputToTiyin(value: string): bigint | null {
  const trimmed = value.trim();
  if (!/^\d+([.,]\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ''] = trimmed.replace(',', '.').split('.');
  return BigInt(whole!) * 100n + BigInt(frac.padEnd(2, '0'));
}

/** Qaytarish holatlari — admin ekranlari uchun. */
export const RETURN_STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'So‘rov yuborildi',
  APPROVED: 'Tasdiqlandi',
  REJECTED: 'Rad etildi',
  IN_TRANSIT: 'Yo‘lda',
  RECEIVED: 'Qabul qilindi',
  REFUNDED: 'Pul qaytarildi',
  CANCELLED: 'Bekor qilindi',
};

export const RETURN_STATUS_TONE: Record<string, Tone> = {
  REQUESTED: 'new',
  APPROVED: 'mint',
  REJECTED: 'low',
  IN_TRANSIT: 'new',
  RECEIVED: 'mint',
  REFUNDED: 'mint',
  CANCELLED: 'neutral',
};

export const RETURN_REASON_LABEL: Record<string, string> = {
  WRONG_ITEM: 'Boshqa tovar keldi',
  NOT_SUITABLE: 'To‘g‘ri kelmadi',
  DAMAGED: 'Shikastlangan',
  QUALITY: 'Sifat muammosi',
  OTHER: 'Boshqa sabab',
};

export const CONDITION_LABEL: Record<string, string> = {
  RESELLABLE: 'Qayta sotiladi',
  OPENED: 'Ochilgan',
  DAMAGED: 'Yaroqsiz',
};

export const SEGMENT_LABEL: Record<string, string> = {
  NEW: 'Yangi',
  REPEAT: 'Takroriy',
  LOYAL: 'Sodiq',
  SLEEPING: 'Uxlab qolgan',
};

export const SEGMENT_TONE: Record<string, Tone> = {
  NEW: 'neutral',
  REPEAT: 'new',
  LOYAL: 'mint',
  SLEEPING: 'low',
};
