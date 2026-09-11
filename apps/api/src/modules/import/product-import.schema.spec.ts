import { IMPORT_COLUMNS, parseRows, type RawRow } from './product-import.schema';

const base: RawRow = {
  product_slug: 'rosemary-moy',
  name_uz: 'ALIVER Rosemary soch moyi',
  name_ru: 'ALIVER Rosemary масло',
  ikpu: '03302001001000000',
  sku: 'ALV-RSM-060',
  price: '189000',
  ingredients_uz: 'Ricinus Communis Seed Oil',
  ingredients_ru: 'Ricinus Communis Seed Oil',
  warnings_uz: 'Faqat tashqi qo‘llash uchun',
  warnings_ru: 'Только для наружного применения',
};

describe('import shabloni', () => {
  it('majburiy ustunlar ro‘yxati aniq', () => {
    const required = IMPORT_COLUMNS.filter((c) => c.required).map((c) => c.key);
    expect(required).toContain('ikpu');
    expect(required).toContain('sku');
    expect(required).toContain('ingredients_uz');
    expect(required).toContain('warnings_uz');
  });

  it('ustun kalitlari takrorlanmaydi', () => {
    const keys = IMPORT_COLUMNS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('to‘g‘ri fayl', () => {
  it('bitta mahsulotni o‘qiydi', () => {
    const res = parseRows([base]);
    expect(res.errors).toHaveLength(0);
    expect(res.products).toHaveLength(1);
    expect(res.products[0]!.variants).toHaveLength(1);
    expect(res.products[0]!.vatRate).toBe(12); // bo'sh bo'lsa standart
  });

  it('bir mahsulotning variantlarini guruhlaydi', () => {
    const res = parseRows([
      { ...base, sku: 'ALV-RSM-030', size: '30 ml', price: '129000' },
      { ...base, sku: 'ALV-RSM-060', size: '60 ml', price: '189000' },
      { ...base, sku: 'ALV-RSM-100', size: '100 ml', price: '259000' },
    ]);
    expect(res.errors).toHaveLength(0);
    expect(res.products).toHaveLength(1);
    expect(res.products[0]!.variants.map((v) => v.options.size)).toEqual([
      '30 ml',
      '60 ml',
      '100 ml',
    ]);
  });

  it('kolleksiya va teglarni ro‘yxatga ajratadi', () => {
    const res = parseRows([{ ...base, collections: 'best-sellers; yangi', tags: 'soch,moy' }]);
    expect(res.products[0]!.collectionSlugs).toEqual(['best-sellers', 'yangi']);
    expect(res.products[0]!.tagSlugs).toEqual(['soch', 'moy']);
  });

  it('narxdagi bo‘shliqlarni qabul qiladi', () => {
    const res = parseRows([{ ...base, price: '189 000' }]);
    expect(res.errors).toHaveLength(0);
    expect(res.products[0]!.variants[0]!.price).toBe(189000);
  });
});

describe('validatsiya', () => {
  it('IKPU bo‘lmasa xato beradi (A-1)', () => {
    const { ikpu, ...noIkpu } = base;
    const res = parseRows([noIkpu]);
    expect(res.errors.some((e) => e.column === 'ikpu')).toBe(true);
    expect(res.products).toHaveLength(0);
  });

  it('noto‘g‘ri IKPU formatini rad etadi', () => {
    const res = parseRows([{ ...base, ikpu: 'ABC123' }]);
    expect(res.errors[0]!.message).toMatch(/6–20 raqam/);
  });

  it('tarkib bo‘lmasa xato beradi (A-4)', () => {
    const res = parseRows([{ ...base, ingredients_uz: '' }]);
    expect(res.errors.some((e) => e.column === 'ingredients_uz')).toBe(true);
  });

  it('takroriy SKU ni ushlaydi', () => {
    const res = parseRows([base, { ...base, product_slug: 'boshqa' }]);
    const err = res.errors.find((e) => e.column === 'sku');
    expect(err).toBeDefined();
    expect(err!.message).toMatch(/takrorlanmoqda/);
  });

  it('eski narx joriy narxdan past bo‘lsa xato', () => {
    const res = parseRows([{ ...base, old_price: '100000' }]);
    expect(res.errors.some((e) => e.column === 'old_price')).toBe(true);
  });

  it('raqam bo‘lmagan narxni rad etadi', () => {
    const res = parseRows([{ ...base, price: 'arzon' }]);
    expect(res.errors.some((e) => e.column === 'price')).toBe(true);
  });

  it('manfiy qoldiqni rad etadi', () => {
    const res = parseRows([{ ...base, stock: '-5' }]);
    expect(res.errors.some((e) => e.column === 'stock')).toBe(true);
  });

  it('noma’lum statusni rad etadi', () => {
    const res = parseRows([{ ...base, status: 'SOTUVDA' }]);
    expect(res.errors.some((e) => e.column === 'status')).toBe(true);
  });

  it('variantlar orasida nom farq qilsa ogohlantiradi', () => {
    const res = parseRows([
      { ...base, sku: 'A-1', size: '30 ml' },
      { ...base, sku: 'A-2', size: '60 ml', name_uz: 'Boshqa nom' },
    ]);
    expect(res.errors.some((e) => e.column === 'name_uz')).toBe(true);
  });

  it('bir xil variant kombinatsiyasini ushlaydi', () => {
    const res = parseRows([
      { ...base, sku: 'A-1', size: '60 ml' },
      { ...base, sku: 'A-2', size: '60 ml' },
    ]);
    expect(res.errors.some((e) => e.message.includes('allaqachon bor'))).toBe(true);
  });

  it('satr raqamlari sarlavhani hisobga oladi', () => {
    const res = parseRows([{ ...base, price: 'xato' }]);
    expect(res.errors[0]!.row).toBe(2);
  });

  it('bitta xato butun faylni to‘xtatmaydi', () => {
    const res = parseRows([
      { ...base, sku: 'A-1', size: '30 ml' },
      { ...base, sku: 'A-2', size: '60 ml', price: 'xato' },
      { ...base, sku: 'A-3', size: '100 ml' },
    ]);
    expect(res.errors).toHaveLength(1);
    expect(res.products[0]!.variants).toHaveLength(2); // xato satr tashlab ketildi
  });
});
