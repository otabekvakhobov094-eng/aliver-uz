/**
 * Excel/CSV import shabloni va satr validatsiyasi.
 *
 * TZ 97 importni talab qiladi, lekin ekspertiza B-12 bandida uchta savol
 * ochiq qolgani ko'rsatilgan: mavjud SKU yangilanadimi, variantlar qanday
 * import qilinadi, rasmlar-chi. Bu yerda uchalasi ham yopilgan:
 *
 *  - rejim: PREVIEW / CREATE_ONLY / UPDATE_ONLY / CREATE_AND_UPDATE
 *  - variantlar `product_slug` ustuni bo'yicha guruhlanadi: bir mahsulotning
 *    har bir varianti — alohida satr
 *  - rasm `image_url` ustuni orqali beriladi (havola bo'yicha yuklab olinadi)
 *
 * IKPU ustuni MAJBURIY (ekspertiza A-1): busiz fiskal chek yuborib bo'lmaydi,
 * shuning uchun uni "keyin to'ldiramiz" deyish mumkin emas.
 */

export interface ImportColumn {
  key: string;
  header: string;
  required: boolean;
  example: string;
  note?: string;
}

export const IMPORT_COLUMNS: ImportColumn[] = [
  {
    key: 'product_slug',
    header: 'product_slug',
    required: true,
    example: 'rosemary-soch-moyi',
    note: 'Bir mahsulotning variantlari bir xil qiymatga ega bo‘ladi',
  },
  { key: 'name_uz', header: 'name_uz', required: true, example: 'ALIVER Rosemary soch moyi' },
  { key: 'name_ru', header: 'name_ru', required: true, example: 'ALIVER Rosemary масло для волос' },
  {
    key: 'ikpu',
    header: 'ikpu',
    required: true,
    example: '03302001001000000',
    note: 'MXIK kodi — fiskal chek uchun majburiy',
  },
  { key: 'vat', header: 'vat', required: false, example: '12', note: 'QQS foizi, bo‘sh bo‘lsa 12' },
  { key: 'unit', header: 'unit', required: false, example: '1', note: 'O‘lchov birligi kodi' },
  { key: 'sku', header: 'sku', required: true, example: 'ALV-RSM-060' },
  { key: 'barcode', header: 'barcode', required: false, example: '4780012345678' },
  { key: 'size', header: 'size', required: false, example: '60 ml', note: 'Variant o‘lchami' },
  { key: 'color', header: 'color', required: false, example: 'Rose Nude' },
  { key: 'price', header: 'price', required: true, example: '189000', note: 'So‘mda, butun son' },
  {
    key: 'old_price',
    header: 'old_price',
    required: false,
    example: '249000',
    note: 'Chizilgan narx',
  },
  { key: 'cost_price', header: 'cost_price', required: false, example: '120000' },
  {
    key: 'stock',
    header: 'stock',
    required: false,
    example: '24',
    note: '3-etapda omborga yoziladi',
  },
  {
    key: 'category',
    header: 'category',
    required: false,
    example: 'soch-parvarishi',
    note: 'Kategoriya slug',
  },
  {
    key: 'collections',
    header: 'collections',
    required: false,
    example: 'best-sellers;yangi',
    note: 'Nuqtali vergul bilan',
  },
  { key: 'tags', header: 'tags', required: false, example: 'soch;moy' },
  { key: 'brand', header: 'brand', required: false, example: 'ALIVER' },
  {
    key: 'status',
    header: 'status',
    required: false,
    example: 'ACTIVE',
    note: 'DRAFT | ACTIVE | HIDDEN',
  },
  {
    key: 'short_desc_uz',
    header: 'short_desc_uz',
    required: false,
    example: 'Soch ildizi uchun moy',
  },
  {
    key: 'short_desc_ru',
    header: 'short_desc_ru',
    required: false,
    example: 'Масло для корней волос',
  },
  {
    key: 'ingredients_uz',
    header: 'ingredients_uz',
    required: true,
    example: 'Ricinus Communis Seed Oil…',
  },
  {
    key: 'ingredients_ru',
    header: 'ingredients_ru',
    required: true,
    example: 'Ricinus Communis Seed Oil…',
  },
  {
    key: 'warnings_uz',
    header: 'warnings_uz',
    required: true,
    example: 'Faqat tashqi qo‘llash uchun',
  },
  {
    key: 'warnings_ru',
    header: 'warnings_ru',
    required: true,
    example: 'Только для наружного применения',
  },
  { key: 'image_url', header: 'image_url', required: false, example: 'https://…/oil.jpg' },
  { key: 'volume_ml', header: 'volume_ml', required: false, example: '60' },
  { key: 'weight_g', header: 'weight_g', required: false, example: '120' },
];

export type RawRow = Record<string, string | number | null | undefined>;

export interface RowError {
  row: number;
  column: string;
  message: string;
}

export interface ParsedVariant {
  sku: string;
  barcode?: string;
  options: Record<string, string>;
  price: number;
  oldPrice?: number;
  costPrice?: number;
  stock: number;
  volumeMl?: number;
  weightGrams?: number;
  rowNumber: number;
}

export interface ParsedProduct {
  productSlug: string;
  nameUz: string;
  nameRu: string;
  ikpuCode: string;
  vatRate: number;
  unitCode: string;
  shortDescUz?: string;
  shortDescRu?: string;
  ingredientsUz: string;
  ingredientsRu: string;
  warningsUz: string;
  warningsRu: string;
  brand?: string;
  categorySlug?: string;
  collectionSlugs: string[];
  tagSlugs: string[];
  status: string;
  imageUrls: string[];
  variants: ParsedVariant[];
  firstRow: number;
}

export interface ParseResult {
  products: ParsedProduct[];
  errors: RowError[];
  totalRows: number;
}

const STATUSES = new Set(['DRAFT', 'ACTIVE', 'HIDDEN', 'OUT_OF_STOCK', 'ARCHIVED']);

function str(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function splitList(value: unknown): string[] {
  return str(value)
    .split(/[;,]/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

function parseIntOrNull(value: unknown): number | null {
  const s = str(value).replace(/[\s ]/g, '');
  if (s === '') return null;
  if (!/^-?\d+$/.test(s)) return NaN;
  return Number(s);
}

/**
 * Satrlarni tekshiradi va mahsulotlar bo'yicha guruhlaydi.
 * Bazaga tegmaydi — shuning uchun "Preview" rejimi ham shu funksiyani chaqiradi.
 */
export function parseRows(rows: RawRow[]): ParseResult {
  const errors: RowError[] = [];
  const byProduct = new Map<string, ParsedProduct>();
  const seenSkus = new Map<string, number>();

  rows.forEach((raw, index) => {
    const rowNumber = index + 2; // 1-satr — sarlavha
    const add = (column: string, message: string) =>
      errors.push({ row: rowNumber, column, message });

    // --- majburiy ustunlar ---
    const productSlug = str(raw.product_slug).toLowerCase();
    const sku = str(raw.sku).toUpperCase();
    const nameUz = str(raw.name_uz);
    const nameRu = str(raw.name_ru);
    const ikpu = str(raw.ikpu);

    let ok = true;
    for (const col of IMPORT_COLUMNS.filter((c) => c.required)) {
      if (str(raw[col.key]) === '') {
        add(col.header, 'Majburiy ustun bo‘sh');
        ok = false;
      }
    }

    if (ikpu && !/^\d{6,20}$/.test(ikpu)) {
      add('ikpu', 'IKPU kodi 6–20 raqamdan iborat bo‘lishi kerak');
      ok = false;
    }

    if (sku) {
      const prev = seenSkus.get(sku);
      if (prev !== undefined) {
        add('sku', `SKU faylda takrorlanmoqda (avval ${prev}-satrda)`);
        ok = false;
      } else {
        seenSkus.set(sku, rowNumber);
      }
    }

    const price = parseIntOrNull(raw.price);
    if (price === null || Number.isNaN(price) || price < 0) {
      add('price', 'Narx butun musbat son bo‘lishi kerak (so‘mda)');
      ok = false;
    }

    const oldPrice = parseIntOrNull(raw.old_price);
    if (oldPrice !== null && Number.isNaN(oldPrice)) {
      add('old_price', 'Eski narx butun son bo‘lishi kerak');
      ok = false;
    } else if (
      oldPrice !== null &&
      price !== null &&
      !Number.isNaN(price) &&
      oldPrice > 0 &&
      oldPrice <= price
    ) {
      add('old_price', 'Eski narx joriy narxdan yuqori bo‘lishi kerak');
      ok = false;
    }

    const costPrice = parseIntOrNull(raw.cost_price);
    if (costPrice !== null && Number.isNaN(costPrice)) {
      add('cost_price', 'Tannarx butun son bo‘lishi kerak');
      ok = false;
    }

    const stock = parseIntOrNull(raw.stock);
    if (stock !== null && (Number.isNaN(stock) || stock < 0)) {
      add('stock', 'Qoldiq manfiy bo‘lmagan butun son bo‘lishi kerak');
      ok = false;
    }

    const vat = parseIntOrNull(raw.vat);
    if (vat !== null && (Number.isNaN(vat) || vat < 0 || vat > 30)) {
      add('vat', 'QQS 0–30 oralig‘ida bo‘lishi kerak');
      ok = false;
    }

    const status = str(raw.status).toUpperCase() || 'DRAFT';
    if (!STATUSES.has(status)) {
      add('status', `Noma'lum status: ${status}`);
      ok = false;
    }

    if (!ok) return;

    // --- guruhlash ---
    const existing = byProduct.get(productSlug);
    if (!existing) {
      byProduct.set(productSlug, {
        productSlug,
        nameUz,
        nameRu,
        ikpuCode: ikpu,
        vatRate: vat ?? 12,
        unitCode: str(raw.unit) || '1',
        shortDescUz: str(raw.short_desc_uz) || undefined,
        shortDescRu: str(raw.short_desc_ru) || undefined,
        ingredientsUz: str(raw.ingredients_uz),
        ingredientsRu: str(raw.ingredients_ru),
        warningsUz: str(raw.warnings_uz),
        warningsRu: str(raw.warnings_ru),
        brand: str(raw.brand) || undefined,
        categorySlug: str(raw.category) || undefined,
        collectionSlugs: splitList(raw.collections),
        tagSlugs: splitList(raw.tags),
        status,
        imageUrls: str(raw.image_url) ? [str(raw.image_url)] : [],
        variants: [],
        firstRow: rowNumber,
      });
    } else {
      // Bir mahsulotning variantlari mahsulot darajasidagi maydonlarda
      // farq qilmasligi kerak — aks holda qaysi qiymat to'g'ri ekani noaniq.
      if (existing.nameUz !== nameUz) {
        add('name_uz', `"${productSlug}" uchun nom ${existing.firstRow}-satrdagidan farq qiladi`);
      }
      if (existing.ikpuCode !== ikpu) {
        add('ikpu', `"${productSlug}" uchun IKPU ${existing.firstRow}-satrdagidan farq qiladi`);
      }
      const url = str(raw.image_url);
      if (url && !existing.imageUrls.includes(url)) existing.imageUrls.push(url);
    }

    const target = byProduct.get(productSlug)!;
    const options: Record<string, string> = {};
    if (str(raw.size)) options.size = str(raw.size);
    if (str(raw.color)) options.color = str(raw.color);

    target.variants.push({
      sku,
      barcode: str(raw.barcode) || undefined,
      options,
      price: price!,
      oldPrice: oldPrice && oldPrice > 0 ? oldPrice : undefined,
      costPrice: costPrice && costPrice > 0 ? costPrice : undefined,
      stock: stock ?? 0,
      volumeMl: parseIntOrNull(raw.volume_ml) || undefined,
      weightGrams: parseIntOrNull(raw.weight_g) || undefined,
      rowNumber,
    });
  });

  // Bir mahsulot ichida bir xil variant kombinatsiyasi ikki marta bo'lmasligi kerak
  for (const product of byProduct.values()) {
    const combos = new Map<string, number>();
    for (const v of product.variants) {
      const key = JSON.stringify(v.options);
      const prev = combos.get(key);
      if (prev !== undefined) {
        errors.push({
          row: v.rowNumber,
          column: 'size',
          message: `Variant kombinatsiyasi ${prev}-satrda allaqachon bor`,
        });
      } else {
        combos.set(key, v.rowNumber);
      }
    }
  }

  return { products: [...byProduct.values()], errors, totalRows: rows.length };
}
