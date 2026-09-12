/**
 * Buyurtma tugmasi qachon faol bo'ladi.
 *
 * NEGA ALOHIDA FAYL. Bu shart komponent ichida, `&&` bilan bog'langan
 * sakkizta ifoda ko'rinishida edi. Uni o'qib chiqish mumkin, lekin
 * sinab bo'lmasdi — va bu yerdagi xato eng yomon turdagi xato:
 *
 *   — shart noto'g'ri QAT'IY bo'lsa, tugma umuman bosilmaydi va mijoz
 *     nima yetishmayotganini bilmaydi. Server logida hech narsa yo'q,
 *     chunki so'rov umuman yuborilmagan;
 *
 *   — shart noto'g'ri BO'SH bo'lsa, so'rov yuboriladi va server uni
 *     rad etadi. Mijoz «Buyurtma yaratilmadi» degan yozuvni ko'radi.
 *
 * Ikkala holatda ham savdo yo'qoladi va sabab ko'rinmaydi.
 */

export interface CheckoutFormState {
  phone: string;
  firstName: string;
  regionId: string;
  methodCode: string;
  addressLine: string;
  /** Yetkazib berish usuli manzil talab qiladimi (olib ketish — yo'q). */
  needsAddress: boolean;
  /** Naqd to'lovda telefon tasdiqlanishi kerak. */
  needsOtp: boolean;
  otpCode: string;
  /** Ommaviy oferta bilan rozilik. */
  accept: boolean;
  /** Savatda qoldiqdan ko'p buyurtma qilingan tovar bormi. */
  hasBlockingItems: boolean;
  submitting: boolean;
}

/** Nima yetishmayotganini nomlash — mijozga ko'rsatish uchun. */
export type CheckoutBlocker =
  | 'stock'
  | 'submitting'
  | 'phone'
  | 'name'
  | 'region'
  | 'method'
  | 'address'
  | 'otp'
  | 'accept';

/** Telefon raqamida kamida shuncha raqam bo'lishi kerak. */
const MIN_PHONE_DIGITS = 9;
/** Ism kamida shuncha belgidan iborat. */
const MIN_NAME = 2;
/** Manzil kamida shuncha belgidan iborat — «uy» deb yozib bo'lmaydi. */
const MIN_ADDRESS = 5;
/** SMS kodi kamida shuncha raqam. */
const MIN_OTP = 4;

/**
 * To'ldirilmagan shartlar — TARTIB BILAN.
 *
 * Tartib formadagi maydonlar tartibiga mos: mijozga birinchi
 * yetishmayotgan narsani aytish kerak, oxirgisini emas. «Rozilik
 * belgilanmagan» degan xabar ismi ham to'ldirilmagan formada
 * foydasiz.
 */
export function checkoutBlockers(s: CheckoutFormState): CheckoutBlocker[] {
  const out: CheckoutBlocker[] = [];

  if (s.hasBlockingItems) out.push('stock');
  if (s.submitting) out.push('submitting');
  if (s.phone.replace(/\D/g, '').length < MIN_PHONE_DIGITS) out.push('phone');
  if (s.firstName.trim().length < MIN_NAME) out.push('name');
  if (!s.regionId) out.push('region');
  if (!s.methodCode) out.push('method');
  // Olib ketishda manzil so'ralmaydi — punkt manzili o'zi ma'lum.
  if (s.needsAddress && s.addressLine.trim().length < MIN_ADDRESS) out.push('address');
  if (s.needsOtp && s.otpCode.length < MIN_OTP) out.push('otp');
  if (!s.accept) out.push('accept');

  return out;
}

export function canSubmitOrder(s: CheckoutFormState): boolean {
  return checkoutBlockers(s).length === 0;
}

/**
 * Birinchi yetishmayotgan narsa haqida matn.
 *
 * `submitting` uchun matn YO'Q: bu holatda tugmaning o'zi
 * «Yuborilmoqda…» deb turadi va ostiga izoh yozish takror bo'lardi.
 */
export function blockerMessage(
  blocker: CheckoutBlocker | undefined,
  locale: 'uz' | 'ru',
): string | null {
  if (!blocker || blocker === 'submitting') return null;
  const ru = locale === 'ru';
  switch (blocker) {
    case 'stock':
      return ru
        ? 'В корзине есть товар сверх остатка — измените количество'
        : 'Savatda qoldiqdan ko‘p tovar bor — sonini o‘zgartiring';
    case 'phone':
      return ru ? 'Укажите номер телефона' : 'Telefon raqamini kiriting';
    case 'name':
      return ru ? 'Укажите имя' : 'Ismingizni kiriting';
    case 'region':
      return ru ? 'Выберите регион' : 'Viloyatni tanlang';
    case 'method':
      return ru ? 'Выберите способ доставки' : 'Yetkazib berish usulini tanlang';
    case 'address':
      return ru ? 'Укажите адрес доставки' : 'Yetkazib berish manzilini kiriting';
    case 'otp':
      return ru
        ? 'Введите код из SMS — при оплате наличными это обязательно'
        : 'SMS dagi kodni kiriting — naqd to‘lovda bu majburiy';
    case 'accept':
      return ru ? 'Примите условия оферты' : 'Ommaviy oferta shartlarini qabul qiling';
    default:
      return null;
  }
}
