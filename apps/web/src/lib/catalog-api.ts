import type { Tiyin, Uuid } from '@aliver/types';

import { apiBase } from './api-base';
import { serverGet, serverList } from './server-get';

/* ---------- Server javob tiplari ---------- */

export type Badge = 'SALE' | 'NEW' | 'TOP' | 'LOW_STOCK';

export interface ProductCard {
  id: Uuid;
  slug: string;
  nameUz: string;
  nameRu: string;
  /** Bir qatorli izoh — "bu nima". TZ-3, 2.2. */
  shortUz: string | null;
  shortRu: string | null;
  /** Variant (soya/hajm) soni — kosmetikada bosishga sabab. */
  variantsCount: number;
  price: Tiyin;
  oldPrice: Tiyin | null;
  discountPercent: number;
  ratingAvg: number;
  ratingCount: number;
  availableStock: number;
  imageUrl: string | null;
  /** Hover'da almashadigan ikkinchi rasm; bo'lmasa null. */
  imageHoverUrl: string | null;
  imageAltUz: string | null;
  imageAltRu: string | null;
  badges: Badge[];
}

export interface ProductListResponse {
  items: ProductCard[];
  total: number;
  page: number;
  perPage: number;
  /** true bo‘lsa — aniq moslik topilmadi, imlo xatosi bo‘yicha taxminiy natija. */
  fuzzy: boolean;
}

export interface CategoryNode {
  id: Uuid;
  slug: string;
  nameUz: string;
  nameRu: string;
  productCount?: number;
  imageUrl?: string | null;
  children: CategoryNode[];
}

export interface CollectionItem {
  id: Uuid;
  slug: string;
  nameUz: string;
  nameRu: string;
  productCount: number;
}

export interface ProductVariant {
  id: Uuid;
  sku: string;
  options: Record<string, string>;
  price: Tiyin;
  oldPrice: Tiyin | null;
  discountPercent: number;
  onSale: boolean;
  availableStock: number;
  lowStock: boolean;
}

export interface ProductDetail {
  id: Uuid;
  slug: string;
  nameUz: string;
  nameRu: string;
  brand: { name: string; slug: string } | null;
  shortDescUz: string | null;
  shortDescRu: string | null;
  descUz: string | null;
  descRu: string | null;
  benefitsUz: string | null;
  benefitsRu: string | null;
  ingredientsUz: string;
  ingredientsRu: string;
  /**
   * Uchta asosiy tarkib — TZ-3, 2.3. API dan JSON bo'lib keladi, shakli
   * kafolatlanmaydi, shuning uchun `unknown` va komponent ichida tekshiriladi.
   */
  keyIngredients: unknown;
  claimUz: string | null;
  claimRu: string | null;
  howToUseUz: string | null;
  howToUseRu: string | null;
  warningsUz: string;
  warningsRu: string;
  countryOfOrigin: string | null;
  manufacturer: string | null;
  shelfLifeMonths: number | null;
  ratingAvg: number;
  ratingCount: number;
  seo: {
    titleUz: string | null;
    titleRu: string | null;
    descUz: string | null;
    descRu: string | null;
  };
  images: Array<{
    id: string;
    kind: string;
    url: string;
    altUz: string | null;
    altRu: string | null;
  }>;
  variants: ProductVariant[];
  breadcrumb: Array<{ id: string; slug: string; nameUz: string; nameRu: string }>;
  tags: Array<{ slug: string; nameUz: string; nameRu: string }>;
  related: ProductCard[];
}

export interface Suggestion {
  id: Uuid;
  slug: string;
  nameUz: string;
  nameRu: string;
  price: Tiyin;
  imageUrl: string | null;
  category: { slug: string; nameUz: string; nameRu: string } | null;
}

/* ---------- So‘rovlar ---------- */

/**
 * Katalog ma'lumotlari kamdan-kam o'zgaradi, shuning uchun sahifalar
 * ISR bilan keshlanadi (Next.js `revalidate`). Bu ekspertizadagi
 * arxitektura tavsiyasi: hamma sahifada to'liq SSR shart emas.
 *
 * Uyg'onish va qayta urinish `server-get.ts` da — u saytning hamma
 * server tomonidagi o'qishlari uchun umumiy.
 */
const get = serverGet;

export interface CatalogFacets {
  brands: Array<{ slug: string; name: string; count: number }>;
  colors: Array<{ value: string; count: number }>;
  sizes: Array<{ value: string; count: number }>;
  minPrice: number;
  maxPrice: number;
}

export const catalogApi = {
  categories: () => serverList<CategoryNode>('/catalog/categories', 300),

  /**
   * Filtr qiymatlari. Xato bo'lsa BO'SH ro'yxat — filtr paneli
   * kamayadi, lekin katalog ochiq qoladi.
   */
  facets: async (params: { category?: string; collection?: string } = {}): Promise<CatalogFacets> => {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.collection) qs.set('collection', params.collection);
    const empty: CatalogFacets = { brands: [], colors: [], sizes: [], minPrice: 0, maxPrice: 0 };
    try {
      const raw = await get<Partial<CatalogFacets>>(`/catalog/facets${qs.size ? `?${qs}` : ''}`, 300);
      /*
       * Javob MAYDONMA-MAYDON tekshiriladi.
       *
       * Bu ortiqcha ehtiyotkorlik emas: web va API alohida deploy
       * qilinadi. Yangi sayt eski API bilan bir necha daqiqa ishlashi
       * mumkin, va o'sha API da hali `brands` yo'q. Shunda
       * `facets.brands.length` butun bosh sahifani 500 bilan yiqitardi
       * — men buni aynan shu yerda ko'rdim.
       *
       * Yetishmagan maydon — bo'sh ro'yxat: blok chizilmaydi, sayt
       * ochiq qoladi.
       */
      return {
        brands: Array.isArray(raw?.brands) ? raw.brands : [],
        colors: Array.isArray(raw?.colors) ? raw.colors : [],
        sizes: Array.isArray(raw?.sizes) ? raw.sizes : [],
        minPrice: typeof raw?.minPrice === 'number' ? raw.minPrice : 0,
        maxPrice: typeof raw?.maxPrice === 'number' ? raw.maxPrice : 0,
      };
    } catch {
      return empty;
    }
  },
  collections: () => serverList<CollectionItem>('/catalog/collections', 300),

  products: (params: Record<string, string | number | boolean | undefined>) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '' && v !== false) qs.set(k, String(v));
    }
    return get<ProductListResponse>(`/catalog/products?${qs.toString()}`, 60);
  },

  product: (slug: string) =>
    get<ProductDetail>(`/catalog/products/${encodeURIComponent(slug)}`, 120),

  /** Avtoto‘ldirish — brauzerdan chaqiriladi, keshlanmaydi. */
  async suggest(q: string, signal?: AbortSignal): Promise<Suggestion[]> {
    const res = await fetch(`${apiBase()}/catalog/search/suggest?q=${encodeURIComponent(q)}`, {
      signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items: Suggestion[] };
    return data.items;
  },
};

/** Interfeys tili bo‘yicha nomni tanlash. */
export function pick<T extends Record<string, unknown>>(
  obj: T,
  base: string,
  locale: 'uz' | 'ru',
): string {
  const key = locale === 'ru' ? `${base}Ru` : `${base}Uz`;
  return String(obj[key] ?? obj[`${base}Uz`] ?? '');
}
