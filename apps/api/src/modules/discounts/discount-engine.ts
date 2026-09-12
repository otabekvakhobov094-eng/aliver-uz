import { allocateDiscount, percentOf } from '../../common/money';

/**
 * Chegirmalar dvigateli.
 *
 * TZ 46, 47 va 48-bo'limlarda promo-kod, avtomatik aksiya va bundle alohida
 * ta'riflangan, lekin ular BIRGA qanday ishlashi yozilmagan: ustuvorlik yo'q,
 * jamlanish qoidasi yo'q, maksimal chegirma chegarasi yo'q. Ekspertiza B-3
 * bandida bu "e-commerce da xatolarning eng katta manbai" deb belgilangan.
 *
 * Bu yerdagi qoidalar:
 *   1. Chegirmalar `priority` bo'yicha tartiblanadi (kichik son — avval).
 *   2. `stackable: false` bo'lgan chegirma qo'llansa, keyingilari qo'llanmaydi.
 *   3. Umumiy chegirma `maxTotalPercent` dan oshmaydi.
 *   4. Chegirma pozitsiyalar bo'yicha proporsional taqsimlanadi va
 *      yig'indi AYNAN teng chiqadi — qisman qaytarish shunga tayanadi.
 */

export type DiscountType = 'PERCENT' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
export type DiscountScope = 'CART' | 'PRODUCT' | 'CATEGORY' | 'COLLECTION';

export interface CartLine {
  variantId: string;
  productId: string;
  categoryIds: string[];
  collectionIds: string[];
  quantity: number;
  /** Chegirmasiz pozitsiya summasi, tiyinda. */
  lineTotal: bigint;
}

export interface DiscountRule {
  id: string;
  code: string | null;
  type: DiscountType;
  scope: DiscountScope;
  /** PERCENT uchun foiz, FIXED_AMOUNT uchun tiyin. */
  value: number;
  minOrderAmount?: bigint | null;
  maxDiscountAmount?: bigint | null;
  minQuantity?: number | null;
  stackable: boolean;
  priority: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
  targetProductIds: string[];
  targetCategoryIds: string[];
  targetCollectionIds: string[];
  usageLimit?: number | null;
  usagePerCustomer?: number | null;
}

export interface UsageContext {
  /** Chegirma umuman necha marta ishlatilgan. */
  totalUsed: number;
  /** Shu mijoz (telefon) necha marta ishlatgan. */
  customerUsed: number;
}

export type RejectReason =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'MIN_ORDER'
  | 'MIN_QUANTITY'
  | 'NO_ELIGIBLE_ITEMS'
  | 'USAGE_LIMIT'
  | 'CUSTOMER_LIMIT';

export const REJECT_MESSAGE: Record<RejectReason, string> = {
  NOT_FOUND: 'Bunday promo-kod topilmadi',
  INACTIVE: 'Promo-kod faol emas',
  NOT_STARTED: 'Promo-kod hali ishlamaydi',
  EXPIRED: 'Promo-kod muddati tugagan',
  MIN_ORDER: 'Buyurtma summasi promo-kod uchun yetarli emas',
  MIN_QUANTITY: 'Mahsulotlar soni promo-kod uchun yetarli emas',
  NO_ELIGIBLE_ITEMS: 'Savatda promo-kod amal qiladigan mahsulot yo‘q',
  USAGE_LIMIT: 'Promo-kod ishlatilish limiti tugagan',
  CUSTOMER_LIMIT: 'Siz bu promo-kodni allaqachon ishlatgansiz',
};

export interface ApplyOptions {
  now?: Date;
  /** Sozlamalardan: umumiy chegirma chegarasi, foizda. */
  maxTotalPercent?: number;
  /** Sozlamalardan: chegirmalar jamlanishi umuman ruxsat etilganmi. */
  allowStacking?: boolean;
}

export interface AppliedDiscount {
  id: string;
  code: string | null;
  type: DiscountType;
  amount: bigint;
}

export interface ApplyResult {
  /** Pozitsiyalar bo'yicha taqsimlangan chegirma; yig'indisi discountTotal ga teng. */
  perLine: bigint[];
  discountTotal: bigint;
  applied: AppliedDiscount[];
  freeShipping: boolean;
  /** Chegara ishlagan bo'lsa true — admin panelda ko'rsatish uchun. */
  cappedByLimit: boolean;
}

/** Chegirma savatga umuman mos keladimi. */
export function validateDiscount(
  rule: DiscountRule,
  lines: CartLine[],
  usage: UsageContext,
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: RejectReason } {
  if (!rule.isActive) return { ok: false, reason: 'INACTIVE' };
  if (rule.startsAt && rule.startsAt.getTime() > now.getTime()) {
    return { ok: false, reason: 'NOT_STARTED' };
  }
  if (rule.endsAt && rule.endsAt.getTime() <= now.getTime()) {
    return { ok: false, reason: 'EXPIRED' };
  }
  if (rule.usageLimit != null && usage.totalUsed >= rule.usageLimit) {
    return { ok: false, reason: 'USAGE_LIMIT' };
  }
  if (rule.usagePerCustomer != null && usage.customerUsed >= rule.usagePerCustomer) {
    return { ok: false, reason: 'CUSTOMER_LIMIT' };
  }

  const eligible = eligibleLines(rule, lines);
  if (eligible.length === 0) return { ok: false, reason: 'NO_ELIGIBLE_ITEMS' };

  const subtotal = eligible.reduce((sum, l) => sum + l.lineTotal, 0n);
  if (rule.minOrderAmount != null && subtotal < rule.minOrderAmount) {
    return { ok: false, reason: 'MIN_ORDER' };
  }

  const quantity = eligible.reduce((sum, l) => sum + l.quantity, 0);
  if (rule.minQuantity != null && quantity < rule.minQuantity) {
    return { ok: false, reason: 'MIN_QUANTITY' };
  }

  return { ok: true };
}

/**
 * Chegirma qaysi pozitsiya INDEKSLARIGA tegishli.
 *
 * `eligibleLines` obyektlarni qaytaradi, lekin summani taqsimlash uchun
 * ularning savatdagi o'rni kerak — aks holda chegirma boshqa qatorga
 * tushib qoladi.
 */
export function eligibleIndices(rule: DiscountRule, lines: CartLine[]): number[] {
  const set = new Set(eligibleLines(rule, lines));
  const out: number[] = [];
  lines.forEach((line, i) => {
    if (set.has(line)) out.push(i);
  });
  return out;
}

/** Chegirma qaysi pozitsiyalarga tegishli. */
export function eligibleLines(rule: DiscountRule, lines: CartLine[]): CartLine[] {
  switch (rule.scope) {
    case 'CART':
      return lines;
    case 'PRODUCT':
      return lines.filter((l) => rule.targetProductIds.includes(l.productId));
    case 'CATEGORY':
      return lines.filter((l) => l.categoryIds.some((c) => rule.targetCategoryIds.includes(c)));
    case 'COLLECTION':
      return lines.filter((l) => l.collectionIds.some((c) => rule.targetCollectionIds.includes(c)));
    default:
      return [];
  }
}

/** Bitta chegirmaning summasi (chegaralar hisobga olingan holda). */
export function computeAmount(rule: DiscountRule, lines: CartLine[]): bigint {
  if (rule.type === 'FREE_SHIPPING') return 0n;

  const eligible = eligibleLines(rule, lines);
  const base = eligible.reduce((sum, l) => sum + l.lineTotal, 0n);
  if (base <= 0n) return 0n;

  let amount = rule.type === 'PERCENT' ? percentOf(base, rule.value) : BigInt(rule.value);

  if (rule.maxDiscountAmount != null && amount > rule.maxDiscountAmount) {
    amount = rule.maxDiscountAmount;
  }
  return amount > base ? base : amount;
}

/**
 * Bir nechta chegirmani ustuvorlik bo'yicha qo'llaydi.
 * Kirishga faqat ALLAQACHON tekshirilgan (validateDiscount o'tgan) qoidalar beriladi.
 */
export function applyDiscounts(
  lines: CartLine[],
  rules: DiscountRule[],
  options: ApplyOptions = {},
): ApplyResult {
  const maxPercent = options.maxTotalPercent ?? 40;
  const allowStacking = options.allowStacking ?? false;

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0n);
  const empty: ApplyResult = {
    perLine: lines.map(() => 0n),
    discountTotal: 0n,
    applied: [],
    freeShipping: false,
    cappedByLimit: false,
  };
  if (subtotal <= 0n || rules.length === 0) return empty;

  const ordered = [...rules].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  const applied: AppliedDiscount[] = [];
  // Har bir qatorga tushgan chegirma shu yerda YIG'ILADI: chegirma
  // faqat o'ziga tegishli qatorlarga taqsimlanadi (pastdagi izohga qarang).
  const perLine = lines.map(() => 0n);
  let total = 0n;
  let freeShipping = false;

  /*
   * "Slot" ni faqat QIYMATLI chegirma egallaydi.
   *
   * Ilgari bepul yetkazish ham `applied` ga qo'shilardi va birikish
   * o'chirilganda yagona slotni egallab, keyingi HAMMA qoidani to'sib
   * qo'yardi. Natijada mijozning kuponi "qabul qilindi" deb ko'rinardi,
   * lekin chegirma nol bo'lardi — xato ham chiqmasdi.
   */
  let valueApplied = 0;

  for (const rule of ordered) {
    if (valueApplied > 0 && (!allowStacking || !rule.stackable)) break;

    if (rule.type === 'FREE_SHIPPING') {
      if (freeShipping) continue;
      freeShipping = true;
      applied.push({ id: rule.id, code: rule.code, type: rule.type, amount: 0n });
      continue;
    }

    const amount = computeAmount(rule, lines);
    if (amount <= 0n) continue;

    /*
     * Chegirma FAQAT o'ziga tegishli qatorlarga taqsimlanadi.
     *
     * Ilgari u butun savat bo'ylab tarqatilardi. Masalan 20% chegirma
     * faqat P mahsulotiga tegishli bo'lsa ham, uning summasi qimmatroq
     * Q mahsulotiga tushib ketardi. Bu `order_items` ga MUZLATILGAN
     * holda yozilgani uchun keyin qaytarish summasi ham, fiskal
     * chekdagi QQS ham noto'g'ri chiqardi.
     */
    const indices = eligibleIndices(rule, lines);
    const share = allocateDiscount(
      indices.map((i) => lines[i]!.lineTotal),
      amount,
    );
    indices.forEach((lineIndex, k) => {
      perLine[lineIndex] = perLine[lineIndex]! + (share[k] ?? 0n);
    });

    total += amount;
    applied.push({ id: rule.id, code: rule.code, type: rule.type, amount });
    valueApplied += 1;

    if (!rule.stackable) break;
  }

  // Umumiy chegarani qo'llaymiz: hech qanday kombinatsiya buni buza olmaydi.
  const cap = percentOf(subtotal, maxPercent);
  const uncapped = total;
  let cappedByLimit = false;
  if (total > cap) {
    total = cap;
    cappedByLimit = true;
  }
  if (total > subtotal) total = subtotal;

  // Chegara ishlagan bo'lsa, har bir chegirmaning "qo'llangan summasi" ham
  // qisqartiriladi. Aks holda `sum(applied)` haqiqiy chegirmadan katta
  // bo'lib qolardi va hisobotlar (DiscountUsage.amount) noto'g'ri chiqardi.
  const scaleReported = (to: bigint) =>
    to === uncapped || uncapped === 0n
      ? applied
      : (() => {
          const scaled = allocateDiscount(
            applied.map((a) => a.amount),
            to,
          );
          return applied.map((a, i) => ({ ...a, amount: scaled[i] ?? 0n }));
        })();

  /*
   * Umumiy chegara ishlagan bo'lsa, qator bo'yicha taqsimot ham
   * proporsional qisqartiriladi — aks holda `sum(perLine)` haqiqiy
   * chegirmadan katta bo'lib qolardi.
   */
  const spread = total === uncapped ? perLine : allocateDiscount(perLine, total);

  /*
   * QATOR CHEGIRMASI QATOR SUMMASIDAN KATTA BO'LA OLMAYDI.
   *
   * Har bir qoida alohida o'z bazasidan oshmaydi, umumiy chegara esa
   * SAVAT summasining foizi — ikkalasi ham bitta qatorni himoya
   * qilmaydi. Qoidalar bir-birining ustiga qo'yilsa (`allowStacking`),
   * arzon qatorga ikkita chegirma tushib, uning narxidan oshib
   * ketishi mumkin edi.
   *
   * Bu jimgina xato emas — yomonroq: `computeTotals` oddiy `Error`
   * tashlaydi va u hech qayerda ushlanmaydi, ya'ni SAVAT SAHIFASI
   * va buyurtma berish 500 qaytaradi. Aybdor mahsulot savatda
   * turgan har bir mijoz uchun — admin qoidani o'chirmaguncha.
   *
   * Ortiqchasi shunchaki qirqiladi: qator narxidan ko'p chegirma
   * berish baribir ma'nosiz, umumiy summa esa shunga yarasha
   * kamayadi.
   */
  const finalPerLine = spread.map((value, i) => {
    const lineTotal = lines[i]?.lineTotal ?? 0n;
    return value > lineTotal ? lineTotal : value;
  });
  const clampedTotal = finalPerLine.reduce((sum, v) => sum + v, 0n);

  if (clampedTotal < total) {
    total = clampedTotal;
  }

  return {
    perLine: finalPerLine,
    discountTotal: total,
    // Hisobot summasi qirqishdan KEYINGI umumiy summaga qarab
    // hisoblanadi: aks holda `DiscountUsage.amount` yig'indisi
    // haqiqatda berilgan chegirmadan katta bo'lib qolardi.
    applied: scaleReported(total),
    freeShipping,
    cappedByLimit,
  };
}
