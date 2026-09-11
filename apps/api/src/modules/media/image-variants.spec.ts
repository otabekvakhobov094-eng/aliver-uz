import {
  IMAGE_WIDTHS,
  assertUploadAllowed,
  baseName,
  buildSrcSet,
  planVariants,
} from './image-variants';

describe('fayl nomi', () => {
  it('kengaytmani olib tashlaydi va xavfsiz qiladi', () => {
    expect(baseName('Rosemary Oil 60ml.JPEG')).toBe('rosemary-oil-60ml');
    expect(baseName('../../etc/passwd')).toBe('etc-passwd');
    expect(baseName('!!!.png')).toBe('image');
  });

  it('juda uzun nomni qisqartiradi', () => {
    expect(baseName('a'.repeat(200) + '.png').length).toBeLessThanOrEqual(60);
  });
});

describe('variantlar rejasi', () => {
  it('har o‘lcham uchun webp va avif yaratadi', () => {
    const plan = planVariants({ prefix: 'products', originalName: 'oil.jpg', sourceWidth: 2000 });
    expect(plan.variants).toHaveLength(IMAGE_WIDTHS.length * 2);
    expect(plan.variants.filter((v) => v.format === 'webp')).toHaveLength(IMAGE_WIDTHS.length);
    expect(plan.original).toMatch(/^products\//);
  });

  it('manbadan katta o‘lchamlarni yaratmaydi', () => {
    const plan = planVariants({ prefix: 'products', originalName: 'oil.jpg', sourceWidth: 700 });
    const widths = [...new Set(plan.variants.map((v) => v.width))];
    expect(widths).toEqual([320, 640]);
  });

  it('juda kichik rasmda ham kamida bitta variant bo‘ladi', () => {
    const plan = planVariants({ prefix: 'products', originalName: 'icon.png', sourceWidth: 100 });
    expect(plan.variants.length).toBeGreaterThan(0);
  });
});

describe('srcset', () => {
  it('to‘g‘ri satr yasaydi', () => {
    expect(buildSrcSet('https://cdn.aliver.uz', 'products/abc', 'webp', [320, 640])).toBe(
      'https://cdn.aliver.uz/products/abc/320.webp 320w, https://cdn.aliver.uz/products/abc/640.webp 640w',
    );
  });
});

describe('yuklash cheklovlari', () => {
  it('ruxsat etilgan formatni o‘tkazadi', () => {
    expect(() => assertUploadAllowed({ mimetype: 'image/jpeg', size: 1000 })).not.toThrow();
  });

  it('boshqa formatni rad etadi', () => {
    expect(() => assertUploadAllowed({ mimetype: 'application/pdf', size: 1000 })).toThrow(
      /qo‘llab-quvvatlanmaydi/,
    );
  });

  it('katta faylni rad etadi', () => {
    expect(() => assertUploadAllowed({ mimetype: 'image/png', size: 20 * 1024 * 1024 })).toThrow(
      /juda katta/,
    );
  });
});
