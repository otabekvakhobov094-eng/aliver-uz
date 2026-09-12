import { createHash } from 'node:crypto';

/**
 * Meta Conversions API uchun ma'lumot tayyorlash.
 *
 * NEGA SERVER TOMONI KERAK. Brauzerdagi piksel endi ishonchli emas:
 * reklama bloklovchilari, iOS cheklovlari va cookie siyosati tufayli
 * hodisalarning sezilarli qismi Facebook'ga yetib bormaydi. Server
 * tomondan yuborilgan hodisa bularning hech biriga bog'liq emas.
 *
 * IKKALASI BIRGA yuboriladi va `event_id` bo'yicha BIRLASHTIRILADI.
 * Agar `event_id` bir xil bo'lmasa, Facebook bitta xaridni ikkita deb
 * hisoblaydi — va reklama byudjeti aynan shu raqamga qarab taqsimlanadi.
 *
 * SHAXSIY MA'LUMOT hech qachon ochiq yuborilmaydi. Telefon va e-pochta
 * SHA-256 bilan xeshlanadi. Lekin xeshlashdan OLDIN normallashtirish
 * shart: «+998 90 123-45-67» va «998901234567» boshqacha xesh beradi,
 * ya'ni moslik topilmaydi va butun ishning ma'nosi qolmaydi.
 */

/** SHA-256, hex. Bo'sh qiymat — `undefined`, ya'ni maydon yuborilmaydi. */
function sha256(value: string): string | undefined {
  if (!value) return undefined;
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * E-pochtani normallashtiradi: bo'shliqlar olib tashlanadi, kichik
 * harfga o'giriladi.
 */
export function hashEmail(email?: string | null): string | undefined {
  const value = (email ?? '').trim().toLowerCase();
  if (!value.includes('@')) return undefined;
  return sha256(value);
}

/**
 * Telefonni normallashtiradi: faqat raqamlar, mamlakat kodi bilan,
 * `+` siz.
 *
 * O'zbekiston uchun alohida qoida bor: mijozlar raqamni turlicha
 * yozadi — «901234567», «901234567» oldida 0 bilan, «+998...».
 * Hammasi bitta ko'rinishga keltiriladi, aks holda bir mijozning ikki
 * xil xeshi chiqadi.
 */
export function hashPhone(phone?: string | null): string | undefined {
  let digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return undefined;

  // Ichki formatdagi boshlang'ich nol: 0 90 123 45 67
  if (digits.length === 10 && digits.startsWith('0')) digits = digits.slice(1);
  // Mamlakat kodisiz 9 xonali raqam — O'zbekiston kodi qo'shiladi.
  if (digits.length === 9) digits = `998${digits}`;
  if (digits.length < 10) return undefined;

  return sha256(digits);
}

/** Ism va familiya — kichik harfda, faqat harflar. */
export function hashName(name?: string | null): string | undefined {
  const value = (name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}]/gu, '');
  return value ? sha256(value) : undefined;
}

export function hashCity(city?: string | null): string | undefined {
  const value = (city ?? '').trim().toLowerCase().replace(/\s+/g, '');
  return value ? sha256(value) : undefined;
}

export interface UserIdentity {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  /** Brauzerdagi `_fbp` cookie qiymati — xeshlanmaydi. */
  fbp?: string | null;
  /** `_fbc` cookie yoki `fbclid` dan yasalgan qiymat — xeshlanmaydi. */
  fbc?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  /** Do'kondagi mijoz identifikatori — xeshlanadi. */
  externalId?: string | null;
}

/** Meta kutadigan `user_data` obyekti. Bo'sh maydonlar tushib qoladi. */
export function buildUserData(identity: UserIdentity): Record<string, unknown> {
  const data: Record<string, unknown> = {
    em: hashEmail(identity.email),
    ph: hashPhone(identity.phone),
    fn: hashName(identity.firstName),
    ln: hashName(identity.lastName),
    ct: hashCity(identity.city),
    external_id: identity.externalId ? sha256(identity.externalId) : undefined,
    // Bular XESHLANMAYDI — Meta ularni o'zi qo'yadi va ochiq kutadi.
    fbp: identity.fbp || undefined,
    fbc: identity.fbc || undefined,
    client_ip_address: identity.clientIp || undefined,
    client_user_agent: identity.userAgent || undefined,
  };
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key];
  }
  return data;
}

/**
 * `fbclid` dan `fbc` qiymatini yasaydi.
 *
 * Format: `fb.1.<vaqt millisekundda>.<fbclid>`. Foydalanuvchi reklamadan
 * kelganda cookie hali yo'q bo'lishi mumkin, lekin manzilda `fbclid`
 * turadi — shundan yasalgan `fbc` moslik sifatini sezilarli oshiradi.
 */
export function fbcFromClickId(fbclid?: string | null, now = Date.now()): string | undefined {
  if (!fbclid) return undefined;
  return `fb.1.${now}.${fbclid}`;
}

export interface CapiItem {
  id: string;
  quantity?: number;
  /** Dona narxi — SO'MDA. */
  price?: number;
}

export interface CapiEvent {
  eventName: string;
  /** Brauzerdagi hodisa bilan BIR XIL bo'lishi shart. */
  eventId: string;
  eventTime?: number;
  eventSourceUrl?: string | null;
  identity: UserIdentity;
  value?: number;
  currency?: string;
  items?: CapiItem[];
}

/** Meta `/events` uchun bitta hodisa obyekti. */
export function buildEvent(event: CapiEvent): Record<string, unknown> {
  const customData: Record<string, unknown> = {
    currency: event.currency ?? 'UZS',
  };
  if (event.value !== undefined) customData.value = event.value;
  if (event.items?.length) {
    customData.contents = event.items.map((i) => ({
      id: i.id,
      quantity: i.quantity ?? 1,
      item_price: i.price,
    }));
    customData.content_type = 'product';
    customData.content_ids = event.items.map((i) => i.id);
  }

  return {
    event_name: event.eventName,
    // Meta soniyada kutadi, millisekundda emas.
    event_time: Math.floor((event.eventTime ?? Date.now()) / 1000),
    event_id: event.eventId,
    action_source: 'website',
    ...(event.eventSourceUrl ? { event_source_url: event.eventSourceUrl } : {}),
    user_data: buildUserData(event.identity),
    custom_data: customData,
  };
}
