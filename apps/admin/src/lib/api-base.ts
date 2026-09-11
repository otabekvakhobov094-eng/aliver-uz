/**
 * API manzili — brauzer va server uchun alohida.
 *
 * BU FAYL ADMIN LOGIN NOSOZLIGINING YECHIMI. Muammo shunday edi:
 *
 *   admin  →  https://aliver-uz-admin-stage.onrender.com
 *   API    →  https://aliver-uz-api-stage.onrender.com
 *
 * Brauzer uchun bu IKKI XIL SAYT. Login so'rovi cross-site ketardi va
 * API qaytargan `Set-Cookie` ni brauzer QABUL QILMAS edi:
 *
 *   * `SameSite=Lax` cookie cross-site javobda butunlay rad etiladi;
 *   * `SameSite=None` esa uchinchi tomon cookie si hisoblanadi — Safari
 *     uni doim bloklaydi, Chrome bosqichma-bosqich o'chirmoqda.
 *
 * Natijada login 200 qaytarardi, lekin cookie saqlanmasdi. Panel
 * ochilib, birinchi so'rovda 401 olardi va yana login sahifasiga
 * qaytarardi — "ochilib yopilyapti, xato ham chiqmayapti".
 *
 * `.onrender.com` Public Suffix List da, ya'ni `domain=.onrender.com`
 * bilan umumiy cookie qo'yib ham bo'lmaydi.
 *
 * YECHIM: brauzer API ga TO'G'RIDAN-TO'G'RI murojaat qilmaydi. U o'z
 * domenidagi `/api/...` ga so'rov yuboradi, Next.js esa uni serverda
 * API ga uzatadi (`next.config.mjs` dagi `rewrites`). Brauzer uchun
 * cookie o'z domenidan kelgan bo'ladi — ya'ni BIRINCHI TOMON cookie si,
 * uni hech bir brauzer bloklamaydi.
 *
 * Shu sababli bu yerda `NEXT_PUBLIC_API_URL` ATAYLAB ISHLATILMAYDI:
 * u qiymat brauzer paketiga tushadi va kimdir uni yana tashqi manzilga
 * yo'naltirib, xatoni qaytarib keltirishi mumkin edi.
 */

/** Server (SSR, route handler) uchun API ning haqiqiy manzili. */
export function serverApiBase(): string {
  const origin = (process.env.API_ORIGIN ?? 'http://localhost:4000').replace(/\/+$/, '');
  return `${origin}/api`;
}

/**
 * So'rov uchun asos manzil.
 *
 * Brauzerda — nisbiy `/api` (same-origin proxy orqali).
 * Serverda — API ning to'g'ridan-to'g'ri manzili (ortiqcha sakrash yo'q).
 */
export function apiBase(): string {
  return typeof window === 'undefined' ? serverApiBase() : '/api';
}
