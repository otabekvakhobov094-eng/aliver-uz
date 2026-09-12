import { RU } from './ru';

/**
 * Adminka ikki tilda: o'zbek va rus.
 *
 * TANLANGAN YO'L. Lug'at kaliti — O'ZBEKCHA MATNNING O'ZI, sun'iy
 * kod emas (`products.title` kabi). Sabab amaliy: kodda matn o'qiladi
 * holida qoladi, tarjima yo'q bo'lsa sahifa buzilmaydi — shunchaki
 * o'zbekcha ko'rinadi. Kalitli tizimda esa unutilgan kalit ekranda
 * `products.title` bo'lib chiqadi va bu foydalanuvchi uchun xatodan
 * ham battar.
 *
 * TIL COOKIE DA. Server ham, brauzer ham bir xil qiymatni o'qiydi,
 * ya'ni birinchi chizishda til to'g'ri bo'ladi va sahifa «o'zbekchadan
 * ruschaga sakramaydi».
 */

export type AdminLocale = 'uz' | 'ru';

export const LOCALE_COOKIE = 'alv_adm_lang';
export const LOCALES: Array<{ value: AdminLocale; label: string }> = [
  { value: 'uz', label: "O'zbekcha" },
  { value: 'ru', label: 'Русский' },
];

export function normaliseLocale(value: string | undefined | null): AdminLocale {
  return value === 'ru' ? 'ru' : 'uz';
}

/*
 * Joriy til modul darajasida turadi.
 *
 * Nega hook emas: matn kodning HAMMA joyida uchraydi — jadval ustuni
 * ta'rifida, yordamchi funksiyada, `catch` ichidagi xabarda. Ularning
 * hammasini React kontekstiga bog'lash sahifalarni butunlay qayta
 * yozishni talab qilardi.
 *
 * Qiymat har chizishning BOSHIDA, `AdminLocaleProvider` ichida
 * o'rnatiladi — ya'ni bolalar chizilgunga qadar.
 */
let current: AdminLocale = 'uz';

export function setCurrentLocale(locale: AdminLocale): void {
  current = locale;
}

export function currentLocale(): AdminLocale {
  return current;
}

/** Tarjima. Topilmasa — o'zbekchasi qaytadi, ekran hech qachon bo'sh qolmaydi. */
export function t(uz: string): string {
  if (current === 'uz') return uz;
  return RU[uz] ?? uz;
}

/**
 * Tilni almashtirish. Cookie yoziladi va sahifa QAYTA yuklanadi.
 *
 * Qayta yuklash ataylab: ba'zi ro'yxatlar modul darajasida bir marta
 * hisoblanadi va ular tilni faqat yangi yuklashda oladi. Til kuniga
 * bir marta ham o'zgartirilmaydi, shuning uchun bu narx arzon —
 * yarmi tarjima qilingan ekrandan esa ancha yaxshi.
 */
export function switchLocale(locale: AdminLocale): void {
  if (typeof document === 'undefined') return;
  const year = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${year}; samesite=lax`;
  window.location.reload();
}

export { RU };
