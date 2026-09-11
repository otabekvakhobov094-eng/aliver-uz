/**
 * Variant narxi va mahsulot kartochkasidagi belgilar.
 *
 * TZ 15: sale muddati tugaganda chegirma AVTOMATIK tugashi kerak —
 * ya'ni "eski narx" ni ko'rsatish uchun sana oynasi tekshiriladi,
 * cron kutilmaydi. TZ 20: kartochkadagi badge'lar.
 */

export interface VariantPricingInput {
  price: bigint;
  oldPrice?: bigint | null;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
}

export interface EffectivePrice {
  price: bigint;
  oldPrice: bigint | null;
  discountPercent: number;
  onSale: boolean;
}

export function effectivePrice(v: VariantPricingInput, now: Date = new Date()): EffectivePrice {
  const windowOpen =
    (!v.saleStartsAt || v.saleStartsAt.getTime() <= now.getTime()) &&
    (!v.saleEndsAt || v.saleEndsAt.getTime() > now.getTime());

  const hasOld = v.oldPrice != null && v.oldPrice > v.price;
  const onSale = hasOld && windowOpen;

  return {
    price: v.price,
    oldPrice: onSale ? v.oldPrice! : null,
    discountPercent: onSale ? Number(((v.oldPrice! - v.price) * 100n) / v.oldPrice!) : 0,
    onSale,
  };
}

/** Mahsulot kartochkasida ko'rsatiladigan narx — eng arzon faol variant. */
export function minVariantPrice(
  variants: VariantPricingInput[],
  now: Date = new Date(),
): EffectivePrice | null {
  if (variants.length === 0) return null;
  const priced = variants.map((v) => effectivePrice(v, now));
  return priced.reduce((min, cur) => (cur.price < min.price ? cur : min));
}

export type ProductBadge = 'SALE' | 'NEW' | 'TOP' | 'LOW_STOCK';

export interface BadgeInput {
  publishedAt?: Date | null;
  isFeatured?: boolean;
  onSale: boolean;
  availableStock: number;
  lowStockThreshold: number;
}

/**
 * Badge'lar ustuvorligi: kartochkada ko'pi bilan ikkitasi ko'rsatiladi,
 * shuning uchun tartib muhim. "Oz qoldi" har doim ko'rinadi —
 * u sotib olishga turtki beradi.
 */
export function productBadges(input: BadgeInput, now: Date = new Date()): ProductBadge[] {
  const badges: ProductBadge[] = [];

  if (input.availableStock > 0 && input.availableStock <= input.lowStockThreshold) {
    badges.push('LOW_STOCK');
  }
  if (input.onSale) badges.push('SALE');

  const isNew =
    input.publishedAt != null &&
    now.getTime() - input.publishedAt.getTime() < 30 * 24 * 3600 * 1000;
  if (isNew) badges.push('NEW');

  if (input.isFeatured) badges.push('TOP');

  return badges.slice(0, 2);
}
