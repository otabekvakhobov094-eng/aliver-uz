import {
  clampRating,
  mapProduct,
  mapReview,
  matchProduct,
  pick,
  sumToTiyin,
  summariseImport,
} from './uzum-mapping';

describe('Maydonni tanlash', () => {
  it('birinchi to‘ldirilgan nomni oladi', () => {
    expect(pick({ a: '', b: null, c: 'bor' }, 'a', 'b', 'c')).toBe('bor');
  });

  it('hech biri bo‘lmasa undefined', () => {
    expect(pick({ x: 1 }, 'a', 'b')).toBeUndefined();
  });

  /**
   * Nom o'zgarganda BUTUN import yiqilmasligi kerak — shuning uchun
   * bir nechta mumkin bo'lgan nom sinaladi.
   */
  it('nol ham qiymat hisoblanadi emas, bo‘sh satr esa o‘tkaziladi', () => {
    expect(pick({ a: '', b: 0 }, 'a', 'b')).toBe(0);
  });
});

describe('Narxni o‘girish', () => {
  /**
   * Uzum narxni SO'MDA beradi, bizda pul TIYINDA. Bu o'girishni
   * unutish 100 barobar xatoga olib keladi va uni faqat birinchi
   * buyurtmada sezish mumkin.
   */
  it('so‘m tiyinga o‘giriladi', () => {
    expect(sumToTiyin(189000)).toBe(18900000n);
  });

  it('kasr tiyingacha yaxlitlanadi', () => {
    expect(sumToTiyin(189000.4)).toBe(18900040n);
  });

  it('manfiy va noto‘g‘ri qiymat null', () => {
    expect(sumToTiyin(-5)).toBeNull();
    expect(sumToTiyin(null)).toBeNull();
  });

  it('nol haqiqiy narx — null emas', () => {
    expect(sumToTiyin(0)).toBe(0n);
  });
});

describe('Mahsulotni xaritalash', () => {
  it('asosiy maydonlarni oladi', () => {
    const m = mapProduct({
      id: 'u-1',
      title: 'Batana moyi 60 ml',
      sku: 'ALV-BAT-060',
      barcode: '4780012345678',
      price: '189 000',
      quantity: 12,
      images: ['https://cdn/1.jpg', { url: 'https://cdn/2.jpg' }],
    });
    expect(m).toMatchObject({
      externalId: 'u-1',
      sku: 'ALV-BAT-060',
      barcode: '4780012345678',
      nameUz: 'Batana moyi 60 ml',
      priceTiyin: 18900000n,
      stock: 12,
    });
    expect(m!.imageUrls).toEqual(['https://cdn/1.jpg', 'https://cdn/2.jpg']);
  });

  it('probel bilan yozilgan narxni ham tushunadi', () => {
    expect(mapProduct({ id: '1', title: 'X', price: '1 250 000' })!.priceTiyin).toBe(125000000n);
  });

  /**
   * Nomsiz yozuv katalogda «null» bo'lib turardi va uni keyin topish
   * qiyin bo'lardi. Identifikatorsiz yozuv esa takroriy importdan
   * himoyalanmaydi.
   */
  it('nomsiz yoki identifikatorsiz yozuv o‘tkazib yuboriladi', () => {
    expect(mapProduct({ id: 'u-1' })).toBeNull();
    expect(mapProduct({ title: 'Nom bor, id yo‘q' })).toBeNull();
  });

  it('rasm ro‘yxati bo‘lmasa bo‘sh massiv', () => {
    expect(mapProduct({ id: '1', title: 'X' })!.imageUrls).toEqual([]);
  });
});

describe('Reytingni qisish', () => {
  /**
   * Uzum boshqa shkala ishlatsa yoki bo'sh qiymat kelsa, bizdagi
   * o'rtacha reyting 5 dan oshib ketardi va yulduz taqsimoti mos
   * kelmay qolardi.
   */
  it('1..5 dan tashqarisi rad etiladi', () => {
    expect(clampRating(0)).toBeNull();
    expect(clampRating(6)).toBeNull();
    expect(clampRating(10)).toBeNull();
  });

  it('chegaralar qabul qilinadi', () => {
    expect(clampRating(1)).toBe(1);
    expect(clampRating(5)).toBe(5);
  });

  it('kasr yaxlitlanadi', () => {
    expect(clampRating(4.6)).toBe(5);
  });

  it('matn va bo‘sh qiymat null', () => {
    expect(clampRating('zo‘r')).toBeNull();
    expect(clampRating(null)).toBeNull();
  });
});

describe('Sharhni xaritalash', () => {
  it('asosiy maydonlarni oladi', () => {
    const r = mapReview({
      id: 'r-1',
      productId: 'u-1',
      rating: 5,
      text: 'Qishda ham yetarli namlaydi.',
      author: 'Nilufar A.',
      createdAt: '2026-08-01T10:00:00Z',
      photos: [{ url: 'https://cdn/r1.jpg' }],
    });
    expect(r).toMatchObject({
      externalId: 'r-1',
      productExternalId: 'u-1',
      rating: 5,
      body: 'Qishda ham yetarli namlaydi.',
      author: 'Nilufar A.',
    });
    expect(r!.mediaUrls).toEqual(['https://cdn/r1.jpg']);
    expect(r!.createdAt?.toISOString()).toBe('2026-08-01T10:00:00.000Z');
  });

  it('matnsiz sharh ham qabul qilinadi — reyting o‘zi ma’lumot', () => {
    expect(mapReview({ id: 'r-2', rating: 4 })!.body).toBeNull();
  });

  it('reytingsiz yoki identifikatorsiz sharh o‘tkazib yuboriladi', () => {
    expect(mapReview({ id: 'r-3', text: 'zo‘r' })).toBeNull();
    expect(mapReview({ rating: 5 })).toBeNull();
  });

  it('noto‘g‘ri sana null bo‘ladi, sharh esa qoladi', () => {
    const r = mapReview({ id: 'r-4', rating: 5, createdAt: 'kecha' });
    expect(r).not.toBeNull();
    expect(r!.createdAt).toBeNull();
  });
});

describe('Mahsulotni moslashtirish', () => {
  const targets = [
    { productId: 'p1', sku: 'ALV-BAT-060', barcode: '4780012345678' },
    { productId: 'p2', sku: 'ALV-BAT-100', barcode: null },
  ];

  /**
   * Shtrix-kod BIRINCHI: u global va noyob. SKU ikkinchi: uni qo'lda
   * yozishadi va xato bo'lishi mumkin.
   */
  it('shtrix-kod SKU dan ustun', () => {
    const hit = matchProduct({ sku: 'ALV-BAT-100', barcode: '4780012345678' }, targets);
    expect(hit?.productId).toBe('p1');
  });

  it('shtrix-kod bo‘lmasa SKU ishlaydi', () => {
    expect(matchProduct({ sku: 'ALV-BAT-100', barcode: null }, targets)?.productId).toBe('p2');
  });

  it('SKU katta-kichik harf va probelga sezgir emas', () => {
    expect(matchProduct({ sku: ' alv-bat-100 ', barcode: null }, targets)?.productId).toBe('p2');
  });

  /**
   * Nom bo'yicha moslashtirish ATAYLAB yo'q: «Batana moyi 60 ml» va
   * «Batana moyi 100 ml» juda o'xshash va noto'g'ri moslashtirish
   * sharhni BOSHQA mahsulotga yopishtirib qo'yardi.
   */
  it('mos kelmasa null — taxmin qilmaydi', () => {
    expect(matchProduct({ sku: 'BOSHQA', barcode: '999' }, targets)).toBeNull();
  });

  it('bo‘sh qiymatlar bilan yiqilmaydi', () => {
    expect(matchProduct({ sku: null, barcode: null }, targets)).toBeNull();
  });
});

describe('Import hisoboti', () => {
  const targets = [{ productId: 'p1', sku: 'ALV-1', barcode: null }];

  it('mos kelgan va kelmaganlarni ajratadi', () => {
    const res = summariseImport(
      [{ sku: 'ALV-1' }, { sku: 'YO‘Q' }],
      targets,
    );
    expect(res.matched).toHaveLength(1);
    expect(res.matched[0]!.productId).toBe('p1');
    expect(res.unmatched).toHaveLength(1);
  });

  it('bo‘sh ro‘yxat xato bermaydi', () => {
    expect(summariseImport([], targets).matched).toHaveLength(0);
  });
});

describe('Javobdan ro‘yxatni ajratish', () => {
  /**
   * Marketpleyslar ro'yxatni turlicha o'raydi. Hammasini bir joyda
   * hisobga olish — hujjat kelgach kod o'zgarmasligini anglatadi.
   */
  const { normaliseList } = require('./uzum.client') as typeof import('./uzum.client');

  it('to‘g‘ridan-to‘g‘ri massiv', () => {
    expect(normaliseList([{ id: 1 }])).toHaveLength(1);
  });

  it('items, content, list, result ichida', () => {
    for (const key of ['items', 'content', 'list', 'result']) {
      expect(normaliseList({ [key]: [{ id: 1 }, { id: 2 }] })).toHaveLength(2);
    }
  });

  it('ichma-ich joylashgan bo‘lsa ham topadi', () => {
    expect(normaliseList({ data: { content: [{ id: 1 }] } })).toHaveLength(1);
  });

  it('ro‘yxat bo‘lmasa bo‘sh massiv — yiqilmaydi', () => {
    expect(normaliseList(null)).toEqual([]);
    expect(normaliseList({ ok: true })).toEqual([]);
    expect(normaliseList('matn')).toEqual([]);
  });
});
