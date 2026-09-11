import {
  type CartLine,
  type DiscountRule,
  applyDiscounts,
  computeAmount,
  eligibleLines,
  validateDiscount,
} from './discount-engine';

const NOW = new Date('2026-09-10T12:00:00Z');

const line = (over: Partial<CartLine> = {}): CartLine => ({
  variantId: 'v1',
  productId: 'p1',
  categoryIds: ['c-hair'],
  collectionIds: ['col-best'],
  quantity: 1,
  lineTotal: 10_000_000n, // 100 000 so'm
  ...over,
});

const rule = (over: Partial<DiscountRule> = {}): DiscountRule => ({
  id: 'd1',
  code: 'ALIVER10',
  type: 'PERCENT',
  scope: 'CART',
  value: 10,
  stackable: false,
  priority: 100,
  isActive: true,
  targetProductIds: [],
  targetCategoryIds: [],
  targetCollectionIds: [],
  ...over,
});

const usage = { totalUsed: 0, customerUsed: 0 };

describe('promo-kod tekshiruvi', () => {
  const lines = [line()];

  it('faol kodni qabul qiladi', () => {
    expect(validateDiscount(rule(), lines, usage, NOW)).toEqual({ ok: true });
  });

  it('o‘chirilgan kodni rad etadi', () => {
    expect(validateDiscount(rule({ isActive: false }), lines, usage, NOW)).toEqual({
      ok: false,
      reason: 'INACTIVE',
    });
  });

  it('muddati tugagan kodni rad etadi', () => {
    const r = rule({ endsAt: new Date('2026-09-01T00:00:00Z') });
    expect(validateDiscount(r, lines, usage, NOW)).toEqual({ ok: false, reason: 'EXPIRED' });
  });

  it('hali boshlanmagan kodni rad etadi', () => {
    const r = rule({ startsAt: new Date('2026-10-01T00:00:00Z') });
    expect(validateDiscount(r, lines, usage, NOW)).toEqual({ ok: false, reason: 'NOT_STARTED' });
  });

  it('minimal summaga yetmasa rad etadi', () => {
    const r = rule({ minOrderAmount: 50_000_000n });
    expect(validateDiscount(r, lines, usage, NOW)).toEqual({ ok: false, reason: 'MIN_ORDER' });
  });

  it('minimal miqdorga yetmasa rad etadi', () => {
    const r = rule({ minQuantity: 3 });
    expect(validateDiscount(r, lines, usage, NOW)).toEqual({ ok: false, reason: 'MIN_QUANTITY' });
  });

  it('umumiy limit tugasa rad etadi', () => {
    const r = rule({ usageLimit: 100 });
    expect(validateDiscount(r, lines, { totalUsed: 100, customerUsed: 0 }, NOW)).toEqual({
      ok: false,
      reason: 'USAGE_LIMIT',
    });
  });

  it('mijoz limiti tugasa rad etadi', () => {
    const r = rule({ usagePerCustomer: 1 });
    expect(validateDiscount(r, lines, { totalUsed: 5, customerUsed: 1 }, NOW)).toEqual({
      ok: false,
      reason: 'CUSTOMER_LIMIT',
    });
  });

  it('savatda mos mahsulot bo‘lmasa rad etadi', () => {
    const r = rule({ scope: 'PRODUCT', targetProductIds: ['boshqa'] });
    expect(validateDiscount(r, lines, usage, NOW)).toEqual({
      ok: false,
      reason: 'NO_ELIGIBLE_ITEMS',
    });
  });
});

describe('qamrov', () => {
  const lines = [
    line({ variantId: 'v1', productId: 'p1', categoryIds: ['c-hair'] }),
    line({ variantId: 'v2', productId: 'p2', categoryIds: ['c-face'], collectionIds: [] }),
  ];

  it('CART — barcha pozitsiyalar', () => {
    expect(eligibleLines(rule({ scope: 'CART' }), lines)).toHaveLength(2);
  });

  it('PRODUCT — faqat ko‘rsatilgan mahsulot', () => {
    const r = rule({ scope: 'PRODUCT', targetProductIds: ['p2'] });
    expect(eligibleLines(r, lines).map((l) => l.productId)).toEqual(['p2']);
  });

  it('CATEGORY — kategoriya bo‘yicha', () => {
    const r = rule({ scope: 'CATEGORY', targetCategoryIds: ['c-hair'] });
    expect(eligibleLines(r, lines).map((l) => l.productId)).toEqual(['p1']);
  });

  it('COLLECTION — kolleksiya bo‘yicha', () => {
    const r = rule({ scope: 'COLLECTION', targetCollectionIds: ['col-best'] });
    expect(eligibleLines(r, lines).map((l) => l.productId)).toEqual(['p1']);
  });
});

describe('summa hisobi', () => {
  const lines = [line({ lineTotal: 20_000_000n })]; // 200 000 so'm

  it('foizni hisoblaydi', () => {
    expect(computeAmount(rule({ value: 10 }), lines)).toBe(2_000_000n);
  });

  it('qat’iy summani qo‘llaydi', () => {
    const r = rule({ type: 'FIXED_AMOUNT', value: 5_000_000 });
    expect(computeAmount(r, lines)).toBe(5_000_000n);
  });

  it('maksimal chegirma chegarasini hisobga oladi', () => {
    const r = rule({ value: 50, maxDiscountAmount: 3_000_000n });
    expect(computeAmount(r, lines)).toBe(3_000_000n);
  });

  it('chegirma savat summasidan oshmaydi', () => {
    const r = rule({ type: 'FIXED_AMOUNT', value: 99_000_000 });
    expect(computeAmount(r, lines)).toBe(20_000_000n);
  });

  it('bepul yetkazish pozitsiya summasiga tegmaydi', () => {
    expect(computeAmount(rule({ type: 'FREE_SHIPPING' }), lines)).toBe(0n);
  });
});

describe('bir nechta chegirma — ustuvorlik (B-3)', () => {
  const lines = [
    line({ lineTotal: 18_900_000n }),
    line({ variantId: 'v2', lineTotal: 29_600_000n }),
  ];

  it('stacking o‘chiq bo‘lsa faqat bittasi qo‘llanadi', () => {
    const res = applyDiscounts(
      lines,
      [rule({ id: 'a', priority: 10, value: 10 }), rule({ id: 'b', priority: 20, value: 20 })],
      { allowStacking: false },
    );
    expect(res.applied).toHaveLength(1);
    expect(res.applied[0]!.id).toBe('a');
  });

  it('ustuvorlik tartibi kichik sondan boshlanadi', () => {
    const res = applyDiscounts(
      lines,
      [rule({ id: 'past', priority: 90 }), rule({ id: 'yuqori', priority: 5 })],
      { allowStacking: false },
    );
    expect(res.applied[0]!.id).toBe('yuqori');
  });

  it('stacking yoqilganda va qoida ruxsat bersa jamlanadi', () => {
    const res = applyDiscounts(
      lines,
      [
        rule({ id: 'a', priority: 10, value: 10, stackable: true }),
        rule({ id: 'b', priority: 20, value: 5, stackable: true }),
      ],
      { allowStacking: true, maxTotalPercent: 90 },
    );
    expect(res.applied).toHaveLength(2);
    expect(res.discountTotal).toBeGreaterThan(0n);
  });

  it('stackable: false zanjirni to‘xtatadi', () => {
    const res = applyDiscounts(
      lines,
      [
        rule({ id: 'a', priority: 10, value: 10, stackable: false }),
        rule({ id: 'b', priority: 20, value: 5, stackable: true }),
      ],
      { allowStacking: true },
    );
    expect(res.applied).toHaveLength(1);
  });

  it('umumiy chegara har qanday kombinatsiyani cheklaydi', () => {
    const res = applyDiscounts(
      lines,
      [
        rule({ id: 'a', priority: 10, value: 40, stackable: true }),
        rule({ id: 'b', priority: 20, value: 40, stackable: true }),
      ],
      { allowStacking: true, maxTotalPercent: 40 },
    );
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0n);
    expect(res.cappedByLimit).toBe(true);
    expect(res.discountTotal).toBeLessThanOrEqual((subtotal * 40n) / 100n + 1n);
  });

  it('bepul yetkazish alohida bayroq sifatida qaytadi', () => {
    const res = applyDiscounts(lines, [rule({ type: 'FREE_SHIPPING', stackable: true })], {
      allowStacking: true,
    });
    expect(res.freeShipping).toBe(true);
    expect(res.discountTotal).toBe(0n);
  });
});

describe('taqsimot', () => {
  it('pozitsiyalar yig‘indisi umumiy chegirmaga aynan teng', () => {
    const lines = [
      line({ lineTotal: 18_900_000n }),
      line({ variantId: 'v2', lineTotal: 29_600_000n }),
      line({ variantId: 'v3', lineTotal: 8_900_000n }),
    ];
    const res = applyDiscounts(lines, [rule({ value: 10 })]);
    expect(res.perLine.reduce((a, b) => a + b, 0n)).toBe(res.discountTotal);
    expect(res.perLine).toHaveLength(3);
  });

  it('bo‘sh savatda chegirma yo‘q', () => {
    const res = applyDiscounts([], [rule()]);
    expect(res.discountTotal).toBe(0n);
    expect(res.applied).toHaveLength(0);
  });

  it('qoida bo‘lmasa chegirma yo‘q', () => {
    const res = applyDiscounts([line()], []);
    expect(res.discountTotal).toBe(0n);
  });
});

describe('chegara qo‘llanganda hisobot', () => {
  it('applied summasi discountTotal dan katta bo‘lmaydi', () => {
    const lines = [
      line({ lineTotal: 18_900_000n }),
      line({ variantId: 'v2', lineTotal: 29_600_000n }),
    ];
    const res = applyDiscounts(
      lines,
      [
        rule({ id: 'a', value: 30, stackable: true, priority: 1 }),
        rule({ id: 'b', value: 30, stackable: true, priority: 2 }),
      ],
      { allowStacking: true, maxTotalPercent: 40 },
    );

    expect(res.cappedByLimit).toBe(true);
    // Hisobot uchun yozilgan summalar ham qisqartirilgan bo'lishi kerak,
    // aks holda DiscountUsage.amount haqiqiy chegirmadan katta chiqardi.
    const reported = res.applied.reduce((a, b) => a + b.amount, 0n);
    expect(reported).toBe(res.discountTotal);
  });

  it('chegara ishlamasa summalar o‘zgarmaydi', () => {
    const res = applyDiscounts([line({ lineTotal: 10_000_000n })], [rule({ value: 10 })], {
      maxTotalPercent: 40,
    });
    expect(res.cappedByLimit).toBe(false);
    expect(res.applied.reduce((a, b) => a + b.amount, 0n)).toBe(res.discountTotal);
  });
});

/**
 * Quyidagi testlar ikkita HAQIQIY nosozlikni qo'riqlaydi. Ikkalasi ham
 * jimgina ishlagan: savat jamisi to'g'ri chiqqani uchun ular faqat
 * qaytarish paytida yoki kupon ishlamaganda sezilardi.
 */
describe('chegirma taqsimoti — regressiya', () => {
  const line = (id: string, total: bigint, productId = id) => ({
    variantId: id,
    productId,
    categoryIds: [] as string[],
    collectionIds: [] as string[],
    quantity: 1,
    unitPrice: total,
    lineTotal: total,
    vatRate: 12,
  });

  const rule = (over: Record<string, unknown>) => ({
    id: 'r1',
    code: null,
    type: 'PERCENT' as const,
    scope: 'CART' as const,
    value: 20,
    minOrderAmount: null,
    maxDiscountAmount: null,
    minQuantity: null,
    targetProductIds: [] as string[],
    targetCategoryIds: [] as string[],
    targetCollectionIds: [] as string[],
    stackable: false,
    priority: 0,
    ...over,
  });

  it('chegirma FAQAT o‘ziga tegishli qatorga tushadi', () => {
    // P = 50 000, Q = 1 000 000. 20% chegirma faqat P ga tegishli.
    // Ilgari uning 10 000 tiyini butun savat bo'ylab tarqalib, 9 524 si
    // Q ga tushib ketardi — va shu holda `order_items` ga muzlatilardi.
    const lines = [line('P', 50_000n), line('Q', 1_000_000n)];
    const res = applyDiscounts(lines, [
      rule({ scope: 'PRODUCT', targetProductIds: ['P'] }) as never,
    ]);

    expect(res.discountTotal).toBe(10_000n);
    expect(res.perLine).toEqual([10_000n, 0n]);
  });

  it('bepul yetkazish kuponni to‘sib qo‘ymaydi', () => {
    // Birikish o'chirilgan. Avtomatik "bepul yetkazish" qoidasi
    // ilgari yagona slotni egallab, mijozning kuponini nolga
    // aylantirardi — xato ko'rsatmasdan.
    const lines = [line('A', 1_500_000n)];
    const res = applyDiscounts(
      lines,
      [
        rule({ id: 'ship', type: 'FREE_SHIPPING', priority: 0 }) as never,
        rule({ id: 'coupon', code: 'ALIVER20', value: 20, priority: 10 }) as never,
      ],
      { allowStacking: false },
    );

    expect(res.freeShipping).toBe(true);
    expect(res.discountTotal).toBe(300_000n);
    expect(res.perLine).toEqual([300_000n]);
  });

  it('umumiy chegara ishlaganda qator taqsimoti ham qisqaradi', () => {
    const lines = [line('A', 100_000n), line('B', 100_000n)];
    const res = applyDiscounts(lines, [rule({ value: 90 }) as never], {
      maxTotalPercent: 40,
    });

    expect(res.cappedByLimit).toBe(true);
    expect(res.discountTotal).toBe(80_000n);
    // Qator bo'yicha yig'indi umumiy chegirmaga TENG bo'lishi shart.
    expect(res.perLine.reduce((a, b) => a + b, 0n)).toBe(res.discountTotal);
  });

  it('har qanday holatda sum(perLine) === discountTotal', () => {
    const lines = [line('A', 33_333n), line('B', 66_667n), line('C', 1n)];
    for (const value of [5, 17, 33, 40]) {
      const res = applyDiscounts(lines, [rule({ value }) as never]);
      expect(res.perLine.reduce((a, b) => a + b, 0n)).toBe(res.discountTotal);
    }
  });
});
