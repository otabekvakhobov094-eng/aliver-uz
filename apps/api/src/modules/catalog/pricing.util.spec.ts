import { effectivePrice, minVariantPrice, productBadges } from './pricing.util';

const T = (iso: string) => new Date(iso);
const NOW = T('2026-09-10T12:00:00Z');

describe('amaldagi narx', () => {
  it('chegirmasiz variantda eski narx ko‘rsatilmaydi', () => {
    const r = effectivePrice({ price: 18900000n }, NOW);
    expect(r.onSale).toBe(false);
    expect(r.oldPrice).toBeNull();
    expect(r.discountPercent).toBe(0);
  });

  it('foizni to‘g‘ri hisoblaydi', () => {
    const r = effectivePrice({ price: 18900000n, oldPrice: 24900000n }, NOW);
    expect(r.onSale).toBe(true);
    expect(r.discountPercent).toBe(24);
  });

  it('muddati tugagan aksiya avtomatik yopiladi (TZ 15)', () => {
    const r = effectivePrice(
      { price: 18900000n, oldPrice: 24900000n, saleEndsAt: T('2026-09-01T00:00:00Z') },
      NOW,
    );
    expect(r.onSale).toBe(false);
    expect(r.oldPrice).toBeNull();
  });

  it('hali boshlanmagan aksiya ko‘rinmaydi', () => {
    const r = effectivePrice(
      { price: 18900000n, oldPrice: 24900000n, saleStartsAt: T('2026-10-01T00:00:00Z') },
      NOW,
    );
    expect(r.onSale).toBe(false);
  });

  it('faol oyna ichidagi aksiya ko‘rinadi', () => {
    const r = effectivePrice(
      {
        price: 18900000n,
        oldPrice: 24900000n,
        saleStartsAt: T('2026-09-01T00:00:00Z'),
        saleEndsAt: T('2026-10-01T00:00:00Z'),
      },
      NOW,
    );
    expect(r.onSale).toBe(true);
  });

  it('eski narx joriy narxdan past bo‘lsa aksiya emas', () => {
    const r = effectivePrice({ price: 24900000n, oldPrice: 18900000n }, NOW);
    expect(r.onSale).toBe(false);
  });
});

describe('kartochka narxi', () => {
  it('eng arzon variantni tanlaydi', () => {
    const r = minVariantPrice(
      [{ price: 25900000n }, { price: 12900000n, oldPrice: 16900000n }, { price: 18900000n }],
      NOW,
    );
    expect(r!.price).toBe(12900000n);
    expect(r!.onSale).toBe(true);
  });

  it('variant bo‘lmasa null', () => {
    expect(minVariantPrice([], NOW)).toBeNull();
  });
});

describe('badge‘lar', () => {
  it('oz qoldi va sale birga chiqadi', () => {
    const b = productBadges({ onSale: true, availableStock: 3, lowStockThreshold: 10 }, NOW);
    expect(b).toEqual(['LOW_STOCK', 'SALE']);
  });

  it('qoldiq nol bo‘lsa "oz qoldi" chiqmaydi', () => {
    const b = productBadges({ onSale: false, availableStock: 0, lowStockThreshold: 10 }, NOW);
    expect(b).not.toContain('LOW_STOCK');
  });

  it('30 kun ichida chiqqan mahsulot yangi hisoblanadi', () => {
    const b = productBadges(
      {
        onSale: false,
        availableStock: 50,
        lowStockThreshold: 10,
        publishedAt: T('2026-09-01T00:00:00Z'),
      },
      NOW,
    );
    expect(b).toContain('NEW');
  });

  it('eski mahsulot yangi emas', () => {
    const b = productBadges(
      {
        onSale: false,
        availableStock: 50,
        lowStockThreshold: 10,
        publishedAt: T('2026-01-01T00:00:00Z'),
      },
      NOW,
    );
    expect(b).not.toContain('NEW');
  });

  it('ikkitadan ko‘p badge ko‘rsatilmaydi', () => {
    const b = productBadges(
      {
        onSale: true,
        availableStock: 2,
        lowStockThreshold: 10,
        publishedAt: NOW,
        isFeatured: true,
      },
      NOW,
    );
    expect(b).toHaveLength(2);
  });
});
