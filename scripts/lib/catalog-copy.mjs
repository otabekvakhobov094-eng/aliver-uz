/**
 * Katalog matni va narxi uchun qoidalar.
 *
 * Bu qoidalar API tomonida ham bor
 * (`apps/api/src/modules/import/shopify-catalog.util.ts`) va o'sha
 * yerda testlar bilan qoplangan. Skriptlar TypeScript ni import qila
 * olmagani uchun bu yerda takrorlanadi — va aynan shuning uchun
 * `scripts/catalog-copy.test.mjs` ikkalasidagi bir xil holatlarni
 * sinaydi: ikkita nusxa jimgina bir-biridan uzoqlashmasligi kerak.
 *
 * Ishga tushirish: node --test scripts/
 */

export function stripHtml(html = '') {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Mahsulot nomi — TARJIMA QILINMAYDI.
 *
 * Ilgari nom so'zlarga bo'linib, har bir so'z lug'atdan
 * almashtirilardi. Natija o'qib bo'lmaydigan aralashma edi:
 * «Aliver Bowling lab Tint», «teri Tone Adjusting CC krem».
 * So'zma-so'z tarjima printsipial ravishda to'g'ri nom bermaydi.
 */
export function productTitle(product) {
  return String(product?.title ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Tavsif — manbadan. Matn yo'q bo'lsa `null`.
 *
 * Shablon jumla («Original ALIVER mahsuloti…») 556 ta sahifada bir xil
 * turardi: mijozga foydasiz, Google uchun takroriy kontent.
 */
export function descriptionFrom(html, limit = 2000) {
  const text = stripHtml(html ?? '');
  if (text.length < 20) return null;
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

/**
 * Qoldiq — faqat manba bilsa. `null` «bilmayman» degani.
 *
 * Shopify'ning ochiq fayli qoldiqni bermaydi. O'sha nolni yozish
 * do'konni butunlay sotolmaydigan holatga tushirgan edi.
 */
export function sourceStock(variant) {
  const raw = variant?.inventory_quantity;
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.trunc(n));
}

export function stockUnknown(product) {
  return (product?.variants ?? []).every((v) => (sourceStock(v) ?? 0) <= 0);
}

/**
 * Narxni yaxlitlash. Qadam SO'MDA.
 *
 * «412 303 so'm» — dollardan konvertatsiya izi. O'zbekistonda hech bir
 * do'kon bunday narx qo'ymaydi.
 */
export function roundPriceTiyin(tiyin, stepSum = 1000) {
  if (stepSum <= 0) return tiyin;
  const step = BigInt(Math.trunc(stepSum)) * 100n;
  if (tiyin <= 0n) return tiyin;
  const rounded = ((tiyin + step / 2n) / step) * step;
  return rounded > 0n ? rounded : step;
}
