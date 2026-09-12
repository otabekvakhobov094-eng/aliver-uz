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

const TERMS_UZ = new Map<string, string>([
  ['hair', 'soch'], ['nail', 'tirnoq'], ['skin', 'teri'], ['face', 'yuz'], ['body', 'tana'],
  ['hand', 'qo‘l'], ['foot', 'oyoq'], ['cream', 'krem'], ['serum', 'serum'], ['oil', 'moy'],
  ['mask', 'niqob'], ['shampoo', 'shampun'], ['conditioner', 'konditsioner'], ['gel', 'gel'],
  ['spray', 'sprey'], ['brush', 'cho‘tka'], ['powder', 'kukun'], ['set', 'to‘plam'],
  ['kit', 'to‘plam'], ['makeup', 'makiyaj'], ['lip', 'lab'], ['eye', 'ko‘z'], ['eyebrow', 'qosh'],
  ['care', 'parvarish'], ['repair', 'tiklovchi'], ['whitening', 'oqartiruvchi'],
  ['moisturizing', 'namlovchi'], ['cleaning', 'tozalovchi'], ['remover', 'tozalagich'],
]);

const TERMS_RU = new Map<string, string>([
  ['hair', 'волос'], ['nail', 'ногтей'], ['skin', 'кожи'], ['face', 'лица'], ['body', 'тела'],
  ['hand', 'рук'], ['foot', 'ног'], ['cream', 'крем'], ['serum', 'сыворотка'], ['oil', 'масло'],
  ['mask', 'маска'], ['shampoo', 'шампунь'], ['conditioner', 'кондиционер'], ['gel', 'гель'],
  ['spray', 'спрей'], ['brush', 'кисть'], ['powder', 'пудра'], ['set', 'набор'], ['kit', 'набор'],
  ['makeup', 'макияж'], ['lip', 'губ'], ['eye', 'глаз'], ['eyebrow', 'бровей'], ['care', 'уход'],
  ['repair', 'восстанавливающий'], ['whitening', 'отбеливающий'],
  ['moisturizing', 'увлажняющий'], ['cleaning', 'очищающий'], ['remover', 'средство для снятия'],
]);

/** So'zma-so'z tarjima: tanilgan atamalar almashadi, qolgani o'z holicha. */
export function localizeTitle(title: string, dictionary: Map<string, string>): string {
  return title
    .split(/(\s+|[-/(),])/)
    .map((part) => dictionary.get(part.toLowerCase()) ?? part)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export const dictionaries = { uz: TERMS_UZ, ru: TERMS_RU };

/* ------------------------------------------------------------------ *
 * Tasniflash
 * ------------------------------------------------------------------ */

export const TAXONOMY = [
  { slug: 'nail', nameUz: 'Tirnoq parvarishi', nameRu: 'Уход за ногтями', words: ['nail', 'gel polish', 'poly gel', 'acrylic', 'dipping powder', 'base coat', 'top coat', 'manicure'] },
  { slug: 'make-up', nameUz: 'Makiyaj', nameRu: 'Макияж', words: ['makeup', 'make up', 'lip', 'lipstick', 'mascara', 'eyeliner', 'eyebrow', 'foundation', 'concealer', 'blush', 'powder', 'palette'] },
  { slug: 'foot-hand', nameUz: 'Qo‘l va oyoq parvarishi', nameRu: 'Уход за руками и ногами', words: ['foot', 'feet', 'hand', 'heel', 'callus'] },
  { slug: 'hair-care', nameUz: 'Soch parvarishi', nameRu: 'Уход за волосами', words: ['hair', 'shampoo', 'conditioner', 'scalp', 'wig'] },
  { slug: 'skin-care', nameUz: 'Teri parvarishi', nameRu: 'Уход за кожей', words: ['skin', 'face', 'serum', 'cream', 'cleanser', 'mask', 'acne', 'moistur', 'waxing'] },
  { slug: 'mens-care', nameUz: 'Erkaklar parvarishi', nameRu: 'Мужской уход', words: ["men's", 'mens', 'beard', 'shaving'] },
  { slug: 'oral', nameUz: 'Og‘iz parvarishi', nameRu: 'Уход за полостью рта', words: ['oral', 'teeth', 'tooth', 'whitening strips'] },
  { slug: 'other', nameUz: 'Boshqa mahsulotlar', nameRu: 'Другие товары', words: [] },
] as const;

export const CURATED_COLLECTIONS = [
  { slug: 'best-sellers', nameUz: 'Bestsellerlar', nameRu: 'Хиты продаж', words: ['best seller', 'bestseller', 'hot sell', 'hot-sale', 'hot_sale'] },
  { slug: 'new-arrivals', nameUz: 'Yangi kelganlar', nameRu: 'Новинки', words: ['new arrival', 'new-arrival', 'new_arrival', 'new'] },
  { slug: 'editor-choice', nameUz: 'Muharrir tanlovi', nameRu: 'Выбор редакции', words: ['editor choice', 'editor-choice', 'editor_choice'] },
  { slug: 'gifts-sets', nameUz: 'Sovg‘alar va to‘plamlar', nameRu: 'Подарки и наборы', words: ['gift', ' set', 'kit', 'bundle'] },
] as const;

function haystack(p: ShopifyProduct): string {
  const tags = Array.isArray(p.tags) ? p.tags.join(' ') : (p.tags ?? '');
  return `${p.title ?? ''} ${p.handle ?? ''} ${p.product_type ?? ''} ${tags}`.toLowerCase();
}

export function categoryFor(p: ShopifyProduct) {
  const h = haystack(p);
  return (
    TAXONOMY.find((t) => t.slug !== 'other' && t.words.some((w) => h.includes(w))) ??
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
  const newest = CURATED_COLLECTIONS.find((c) => c.slug === 'new-arrivals')!;
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
