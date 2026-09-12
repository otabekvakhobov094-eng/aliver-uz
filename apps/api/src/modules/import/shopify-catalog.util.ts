/**
 * Shopify do'konidan katalogni o'girish qoidalari.
 *
 * NEGA ALOHIDA FAYL. Bu yerda Prisma ham, Nest ham yo'q — faqat sof
 * funksiyalar. Import mantiqi eng xato qiladigan joy: narx, SKU,
 * kategoriya, kolleksiya. Ularni testda to'g'ridan-to'g'ri tekshirish
 * mumkin bo'lishi kerak, chunki xato faqat 500 ta mahsulot bazaga
 * yozilgandan keyin bilinadi.
 *
 * Qoidalar `scripts/import-aliver-shopify.mjs` dan ko'chirildi: u
 * skript sifatida ishlaydi, bu esa admin panelidan.
 */

export interface ShopifyVariant {
  id: number | string;
  title?: string | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  sku?: string | null;
  barcode?: string | null;
  price?: string | number | null;
  compare_at_price?: string | number | null;
  grams?: number | null;
  available?: boolean;
  inventory_quantity?: number | null;
}

export interface ShopifyImage {
  src: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  variant_ids?: Array<number | string>;
}

export interface ShopifyProduct {
  id: number | string;
  title: string;
  handle: string;
  body_html?: string | null;
  vendor?: string | null;
  product_type?: string | null;
  tags?: string | string[] | null;
  published_at?: string | null;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
}

/* ------------------------------------------------------------------ *
 * Matn
 * ------------------------------------------------------------------ */

export function stripHtml(html = ''): string {
  return html
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
 * Mahsulot nomi.
 *
 * NOM TARJIMA QILINMAYDI va bu ataylab.
 *
 * Ilgari bu yerda so'zma-so'z lug'at ishlagan: nom so'zlarga bo'linib,
 * har bir so'z almashtirilgan. Natija o'qib bo'lmaydigan aralashma
 * bo'lgan — «Aliver Bowling lab Tint», «teri Tone Adjusting CC krem»,
 * «ko'z Lash Clusters». 556 ta mahsulotning hammasida.
 *
 * Lug'atni kengaytirish buni tuzatmaydi: so'zma-so'z tarjima printsipial
 * ravishda to'g'ri nom bermaydi — u so'z tartibini, kelishikni va
 * kontekstni bilmaydi. Kosmetika brendlarining nomlari O'zbekiston
 * bozorida lotin yozuvida qoladi, va bu odatiy holat.
 *
 * Tarjima kerak bo'lsa u ALOHIDA ish: odam yozadi yoki tarjima xizmati
 * qiladi, keyin adminda saqlanadi. Import unga aralashmaydi.
 */
export function productTitle(p: ShopifyProduct): string {
  return (p.title ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Mahsulot tavsifi — MANBADAN.
 *
 * Ilgari har bir mahsulotga bir xil jumla yozilardi: «Original ALIVER
 * mahsuloti. Variant va qo'llash tafsilotlari mahsulot kartasida
 * ko'rsatilgan.» Shopify'dagi haqiqiy tavsif esa o'qilardi va tashlab
 * yuborilardi.
 *
 * Bu ikki tomondan zarar: mijoz mahsulot haqida hech narsa bilmaydi,
 * Google esa 556 ta bir xil sahifani takroriy kontent deb baholaydi.
 *
 * Matn bo'lmasa — `null`. Bo'sh joyni shablon bilan to'ldirish
 * yo'qligini yashiradi, ya'ni uni hech kim tuzatmaydi.
 */
export function descriptionFrom(html: string | null | undefined, limit = 2000): string | null {
  const text = stripHtml(html ?? '');
  if (text.length < 20) return null;
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

/**
 * Qoldiq — FAQAT manbada haqiqatan bo'lsa.
 *
 * Shopify'ning ochiq `products.json` fayli qoldiqni bermaydi: u yerda
 * `inventory_quantity` yo yo'q, yo nol. Shu nolni bazaga yozish 556 ta
 * mahsulotni «Tugagan» holatiga tushirgan va do'kon umuman sotolmay
 * qolgan edi.
 *
 * Bundan ham yomoni: importni qayta ishga tushirish xodim qo'lda
 * kiritgan qoldiqni nolga qaytarardi. Ya'ni katalogni yangilash
 * omborni o'chirib yuborardi.
 *
 * `null` — «bilmayman» degani va u «nol» dan butunlay boshqa narsa.
 * Chaqiruvchi `null` bo'lsa qoldiqqa TEGMAYDI.
 */
export function sourceStock(v: ShopifyVariant): number | null {
  const raw = v.inventory_quantity;
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  // Nol ham ma'lumot bo'lishi mumkin, lekin ochiq faylda u deyarli
  // har doim «ko'rsatilmagan» degani. Ishonchli belgi: hech bo'lmasa
  // bitta variantda musbat son bo'lishi.
  return Math.max(0, Math.trunc(n));
}

/** Butun mahsulot bo'yicha qoldiq ma'lum emasmi. */
export function stockUnknown(p: ShopifyProduct): boolean {
  return p.variants.every((v) => (sourceStock(v) ?? 0) <= 0);
}

/**
 * Narxni yaxlitlash.
 *
 * Dollardan kursga ko'paytirilgan narx «412 303 so'm» bo'lib chiqadi.
 * O'zbekistonda hech bir do'kon bunday narx qo'ymaydi va u mijozda
 * «bu avtomatik yig'ilgan sayt» degan taassurot qoldiradi.
 *
 * Qadam SO'MDA beriladi (tiyинda emas): narx siyosati so'mda
 * o'ylanadi. Eng yaqin qadamga yaxlitlanadi, nolga tushib ketmaydi.
 */
export function roundPriceTiyin(tiyin: bigint, stepSum = 1000): bigint {
  if (stepSum <= 0) return tiyin;
  const step = BigInt(Math.trunc(stepSum)) * 100n;
  if (tiyin <= 0n) return tiyin;
  const rounded = ((tiyin + step / 2n) / step) * step;
  // Arzon tovar nolga aylanib qolmasligi kerak: 300 so'm 1 000 ga
  // yaxlitlanganda nol bo'lardi.
  return rounded > 0n ? rounded : step;
}

/* ------------------------------------------------------------------ *
 * Tasniflash
 * ------------------------------------------------------------------ */

export const TAXONOMY = [
  { slug: 'tirnoq', nameUz: 'Tirnoq parvarishi', nameRu: 'Уход за ногтями', words: ['nail', 'gel polish', 'poly gel', 'acrylic', 'dipping powder', 'base coat', 'top coat', 'manicure'] },
  { slug: 'makiyaj', nameUz: 'Makiyaj', nameRu: 'Макияж', words: ['makeup', 'make up', 'lip', 'lipstick', 'mascara', 'eyeliner', 'eyebrow', 'foundation', 'concealer', 'blush', 'powder', 'palette'] },
  { slug: 'qol-oyoq-parvarishi', nameUz: 'Qo‘l va oyoq parvarishi', nameRu: 'Уход за руками и ногами', words: ['foot', 'feet', 'hand', 'heel', 'callus'] },
  { slug: 'soch-parvarishi', nameUz: 'Soch parvarishi', nameRu: 'Уход за волосами', words: ['hair', 'shampoo', 'conditioner', 'scalp', 'wig'] },
  { slug: 'teri-parvarishi', nameUz: 'Teri parvarishi', nameRu: 'Уход за кожей', words: ['skin', 'face', 'serum', 'cream', 'cleanser', 'mask', 'acne', 'moistur', 'waxing'] },
  { slug: 'erkaklar-parvarishi', nameUz: 'Erkaklar parvarishi', nameRu: 'Мужской уход', words: ["men's", 'mens', 'beard', 'shaving'] },
  { slug: 'ogiz-parvarishi', nameUz: 'Og‘iz parvarishi', nameRu: 'Уход за полостью рта', words: ['oral', 'teeth', 'tooth', 'whitening strips'] },
  { slug: 'boshqa', nameUz: 'Boshqa mahsulotlar', nameRu: 'Другие товары', words: [] },
] as const;

export const CURATED_COLLECTIONS = [
  { slug: 'best-sellers', nameUz: 'Bestsellerlar', nameRu: 'Хиты продаж', words: ['best seller', 'bestseller', 'hot sell', 'hot-sale', 'hot_sale'] },
  { slug: 'yangi-kelganlar', nameUz: 'Yangi kelganlar', nameRu: 'Новинки', words: ['new arrival', 'new-arrival', 'new_arrival', 'new'] },
  { slug: 'muharrir-tanlovi', nameUz: 'Muharrir tanlovi', nameRu: 'Выбор редакции', words: ['editor choice', 'editor-choice', 'editor_choice'] },
  { slug: 'sovga-toplamlari', nameUz: 'Sovg‘alar va to‘plamlar', nameRu: 'Подарки и наборы', words: ['gift', ' set', 'kit', 'bundle'] },
] as const;

/** Hech bir so'z mos kelmasa shu kategoriya beriladi. */
const FALLBACK_CATEGORY = 'boshqa';
/** Yaqinda chiqqan mahsulot avtomatik shu kolleksiyaga tushadi. */
const NEW_ARRIVALS = 'yangi-kelganlar';

function haystack(p: ShopifyProduct): string {
  const tags = Array.isArray(p.tags) ? p.tags.join(' ') : (p.tags ?? '');
  return `${p.title ?? ''} ${p.handle ?? ''} ${p.product_type ?? ''} ${tags}`.toLowerCase();
}

export function categoryFor(p: ShopifyProduct) {
  const h = haystack(p);
  return (
    TAXONOMY.find((t) => t.slug !== FALLBACK_CATEGORY && t.words.some((w) => h.includes(w))) ??
    TAXONOMY[TAXONOMY.length - 1]!
  );
}

/** Yaqinda chiqqan mahsulot avtomatik «Yangi kelganlar» ga tushadi. */
const RECENT_DAYS = 180;

export function collectionsFor(p: ShopifyProduct, now = Date.now()) {
  const h = haystack(p);
  const selected = CURATED_COLLECTIONS.filter((c) => c.words.some((w) => h.includes(w)));
  const publishedAt = p.published_at ? new Date(p.published_at).getTime() : 0;
  const cutoff = now - RECENT_DAYS * 24 * 60 * 60 * 1000;
  const newest = CURATED_COLLECTIONS.find((c) => c.slug === NEW_ARRIVALS)!;
  if (publishedAt >= cutoff && !selected.includes(newest)) return [...selected, newest];
  return [...selected];
}

/* ------------------------------------------------------------------ *
 * Pul va SKU
 * ------------------------------------------------------------------ */

/**
 * Shopify narxi (USD, o'nlik satr) → tiyin.
 *
 * Butun yo'l davomida `Number` ishlatilmaydi desak yolg'on bo'ladi:
 * manba narxi satr va uni o'qish kerak. Lekin YAXLITLASH bir marta va
 * oxirida bo'ladi, natija esa `BigInt` — keyingi hamma hisob butun
 * sonda ketadi.
 */
export function toTiyin(price: string | number | null | undefined, usdToUzs: number): bigint {
  const usd = Number(price ?? 0);
  if (!Number.isFinite(usd) || usd < 0) return 0n;
  return BigInt(Math.round(usd * usdToUzs * 100));
}

export function normalizeSku(
  product: ShopifyProduct,
  variant: ShopifyVariant,
  index: number,
  override?: string,
): string {
  const candidate = String(override || variant.sku || `ALV-${product.id}-${index + 1}`)
    .trim()
    .toUpperCase();
  return candidate.slice(0, 120);
}

/**
 * Bir xil SKU li variantlarga barqaror qo'shimcha beradi.
 *
 * Shopify do'konlarida bitta SKU bir necha variantda takrorlanishi
 * mumkin, bizda esa u global unikal. Tasodifiy qo'shimcha yaramaydi:
 * keyingi importda boshqa SKU chiqib, o'sha mahsulot IKKINCHI marta
 * yaratilardi. Shuning uchun qo'shimcha — Shopify variant ID si.
 */
export function resolveSkus(products: ShopifyProduct[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const p of products) {
    for (const [i, v] of p.variants.entries()) {
      const sku = normalizeSku(p, v, i);
      counts.set(sku, (counts.get(sku) ?? 0) + 1);
    }
  }
  const result = new Map<string, string>();
  for (const p of products) {
    for (const [i, v] of p.variants.entries()) {
      const sku = normalizeSku(p, v, i);
      const key = `${p.id}:${v.id}`;
      result.set(key, (counts.get(sku) ?? 0) > 1 ? `${sku}-${v.id}`.slice(0, 120) : sku);
    }
  }
  return result;
}

/** Brend nomidan slug. */
export function brandSlug(vendor?: string | null): { slug: string; name: string } {
  const name = (vendor ?? '').trim() || 'ALIVER';
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'aliver';
  return { slug, name };
}

/** Bir mahsulotning ko'rib chiqish uchun qisqacha tavsifi. */
export interface PreviewRow {
  handle: string;
  title: string;
  brand: string;
  category: string;
  collections: string[];
  variants: number;
  images: number;
  minPriceSum: number;
  maxPriceSum: number;
  published: boolean;
}

export function previewRow(p: ShopifyProduct, usdToUzs: number): PreviewRow {
  const prices = p.variants.map((v) => toTiyin(v.price, usdToUzs));
  const min = prices.length ? prices.reduce((a, b) => (a < b ? a : b)) : 0n;
  const max = prices.length ? prices.reduce((a, b) => (a > b ? a : b)) : 0n;
  return {
    handle: p.handle,
    title: p.title,
    brand: brandSlug(p.vendor).name,
    category: categoryFor(p).nameUz,
    collections: collectionsFor(p).map((c) => c.nameUz),
    variants: p.variants.length,
    images: p.images?.length ?? 0,
    minPriceSum: Number(min / 100n),
    maxPriceSum: Number(max / 100n),
    published: p.published_at !== null && p.published_at !== undefined,
  };
}
