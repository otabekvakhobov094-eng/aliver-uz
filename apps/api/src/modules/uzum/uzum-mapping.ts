import type { Tiyin } from '../../common/money';

/**
 * Uzum Seller'dan kelgan ma'lumotni bizning shaklga o'tkazish.
 *
 * Bu fayl ATAYLAB tarmoqqa ham, Prisma ga ham bog'liq emas: bu yerda
 * faqat xaritalash mantig'i bor va u to'g'ridan-to'g'ri sinaladi.
 * Uzum javobining aniq maydon nomlari shartnoma bilan keladigan
 * hujjatdan olinadi — o'shanda faqat `pick*` funksiyalari
 * to'g'rilanadi, qolgan hamma narsa joyida qoladi.
 */

/** Uzum javobidagi yozuv — shakli oldindan ma'lum emas. */
export type UzumRaw = Record<string, unknown>;

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim() !== '') return v.trim();
  if (typeof v === 'number') return String(v);
  return null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    // Uzum narxni «189 000» yoki «189000.00» shaklida berishi mumkin.
    const cleaned = v.replace(/\s/g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Maydonni bir nechta mumkin bo'lgan nom bo'yicha izlaydi.
 *
 * Hujjat kelmaguncha aniq nom noma'lum, lekin marketpleyslar odatda
 * shu nomlardan birini ishlatadi. Bir nechtasini sinash — nom
 * o'zgarganda butun import yiqilmasligini anglatadi.
 */
export function pick(row: UzumRaw, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
  }
  return undefined;
}

/* ============================== Mahsulot ============================== */

export interface MappedProduct {
  externalId: string;
  sku: string | null;
  barcode: string | null;
  nameUz: string;
  nameRu: string | null;
  /** So'mda kelgan narx TIYINGA o'girilgan. */
  priceTiyin: Tiyin | null;
  stock: number | null;
  imageUrls: string[];
  descriptionUz: string | null;
}

/**
 * Narx SO'MDAN TIYINGA o'giriladi.
 *
 * Uzum narxni so'mda beradi, bizda esa pul har doim tiyinda. Bu
 * o'girishni unutish 100 barobar xatoga olib keladi va uni faqat
 * birinchi buyurtmada sezish mumkin.
 */
export function sumToTiyin(sum: number | null): Tiyin | null {
  if (sum === null || !Number.isFinite(sum) || sum < 0) return null;
  return BigInt(Math.round(sum * 100));
}

export function mapProduct(row: UzumRaw): MappedProduct | null {
  const externalId = str(pick(row, 'id', 'productId', 'skuId', 'offerId'));
  const nameUz = str(pick(row, 'title', 'name', 'productName', 'titleUz'));
  // Nomsiz yozuvni import qilib bo'lmaydi — u katalogda «null» bo'lib
  // turardi va uni topish keyin qiyin bo'lardi.
  if (!externalId || !nameUz) return null;

  const images = pick(row, 'images', 'photos', 'imageUrls');
  const imageUrls = Array.isArray(images)
    ? images
        .map((i) =>
          typeof i === 'string' ? i : str(pick(i as UzumRaw, 'url', 'link', 'photo')),
        )
        .filter((u): u is string => Boolean(u))
    : [];

  return {
    externalId,
    sku: str(pick(row, 'sku', 'vendorCode', 'article', 'skuTitle')),
    barcode: str(pick(row, 'barcode', 'barCode', 'ean')),
    nameUz,
    nameRu: str(pick(row, 'titleRu', 'nameRu')),
    priceTiyin: sumToTiyin(num(pick(row, 'price', 'sellPrice', 'fullPrice'))),
    stock: num(pick(row, 'quantity', 'stock', 'available', 'amount')),
    imageUrls,
    descriptionUz: str(pick(row, 'description', 'descriptionUz')),
  };
}

/* =============================== Sharh =============================== */

export interface MappedReview {
  externalId: string;
  /** Uzum'dagi mahsulot identifikatori — moslashtirish uchun. */
  productExternalId: string | null;
  sku: string | null;
  rating: number;
  body: string | null;
  author: string | null;
  createdAt: Date | null;
  mediaUrls: string[];
}

/**
 * Reyting 1..5 oralig'iga QISILADI.
 *
 * Uzum boshqa shkala ishlatsa (masalan 0..10) yoki bo'sh qiymat kelsa,
 * bizdagi hisob buziladi: o'rtacha reyting 5 dan oshib ketardi va
 * yulduz taqsimoti mos kelmay qolardi.
 */
export function clampRating(v: unknown): number | null {
  const n = num(v);
  if (n === null) return null;
  const r = Math.round(n);
  if (r < 1 || r > 5) return null;
  return r;
}

export function mapReview(row: UzumRaw): MappedReview | null {
  const externalId = str(pick(row, 'id', 'reviewId', 'feedbackId'));
  const rating = clampRating(pick(row, 'rating', 'stars', 'grade', 'score'));
  // Identifikatorsiz sharhni takroriy importdan himoya qilib bo'lmaydi,
  // reytingsiz sharh esa hisobga hech narsa qo'shmaydi.
  if (!externalId || rating === null) return null;

  const media = pick(row, 'photos', 'images', 'mediaUrls');
  const mediaUrls = Array.isArray(media)
    ? media
        .map((i) => (typeof i === 'string' ? i : str(pick(i as UzumRaw, 'url', 'link'))))
        .filter((u): u is string => Boolean(u))
    : [];

  const dateRaw = str(pick(row, 'createdAt', 'date', 'publishedAt', 'created'));
  const parsed = dateRaw ? new Date(dateRaw) : null;

  return {
    externalId,
    productExternalId: str(pick(row, 'productId', 'skuId', 'offerId')),
    sku: str(pick(row, 'sku', 'vendorCode', 'article')),
    rating,
    body: str(pick(row, 'text', 'comment', 'body', 'review')),
    author: str(pick(row, 'author', 'customerName', 'userName', 'nickname')),
    createdAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed : null,
    mediaUrls,
  };
}

/* ============================ Moslashtirish ============================ */

export interface MatchTarget {
  productId: string;
  sku: string;
  barcode: string | null;
}

/**
 * Uzum yozuvini bizdagi mahsulotga moslashtirish.
 *
 * Tartib ahamiyatli: SHTRIX-KOD birinchi, chunki u global va noyob;
 * SKU ikkinchi, chunki uni qo'lda yozishadi va xato bo'lishi mumkin.
 * Nom bo'yicha moslashtirish ATAYLAB YO'Q — «Batana moyi 60 ml» va
 * «Batana moyi 100 ml» bir-biriga juda o'xshaydi va noto'g'ri
 * moslashtirish sharhni BOSHQA mahsulotga yopishtirib qo'yardi.
 */
export function matchProduct(
  candidate: { sku: string | null; barcode: string | null },
  targets: MatchTarget[],
): MatchTarget | null {
  if (candidate.barcode) {
    const byBarcode = targets.find((t) => t.barcode && t.barcode === candidate.barcode);
    if (byBarcode) return byBarcode;
  }
  if (candidate.sku) {
    const needle = candidate.sku.trim().toUpperCase();
    const bySku = targets.find((t) => t.sku.trim().toUpperCase() === needle);
    if (bySku) return bySku;
  }
  return null;
}

/** Import natijasining qisqacha hisoboti. */
export interface ImportSummary<T> {
  matched: Array<{ row: T; productId: string }>;
  unmatched: T[];
  skipped: number;
}

export function summariseImport<T extends { sku: string | null }>(
  rows: Array<T & { barcode?: string | null }>,
  targets: MatchTarget[],
): ImportSummary<T> {
  const matched: Array<{ row: T; productId: string }> = [];
  const unmatched: T[] = [];
  for (const row of rows) {
    const hit = matchProduct({ sku: row.sku, barcode: row.barcode ?? null }, targets);
    if (hit) matched.push({ row, productId: hit.productId });
    else unmatched.push(row);
  }
  return { matched, unmatched, skipped: 0 };
}
