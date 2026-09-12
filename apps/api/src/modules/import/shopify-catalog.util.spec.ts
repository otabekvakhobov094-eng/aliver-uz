import {
  brandSlug,
  categoryFor,
  collectionsFor,
  localizeTitle,
  dictionaries,
  normalizeSku,
  previewRow,
  resolveSkus,
  stripHtml,
  toTiyin,
  type ShopifyProduct,
} from './shopify-catalog.util';

/**
 * `handle` NOMDAN hosil qilinadi.
 *
 * Tasniflash nom, handle, `product_type` va teglarni birga qaraydi.
 * Fixture'da handle qat'iy «hair-growth-oil» bo'lsa, hamma test
 * natijasi soch bo'limiga tortilardi — ya'ni testlar kodni emas,
 * fixture'ni tekshirgan bo'lardi. Haqiqiy Shopify'da ham handle
 * nomdan kelib chiqadi.
 */
const slugify = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const product = (over: Partial<ShopifyProduct> = {}): ShopifyProduct => ({
  id: 1,
  title: 'Hair Growth Oil',
  handle: slugify(over.title ?? 'Hair Growth Oil'),
  vendor: 'ALIVER',
  // Sukut bo'yicha BO'SH: `product_type` tasniflashda ishtirok etadi
  // va uni fixture'da to'ldirib qo'ysak, testlar aslida nomni emas,
  // fixture'ni tekshirgan bo'lardi.
  product_type: '',
  tags: '',
  published_at: '2026-01-01T00:00:00Z',
  variants: [{ id: 11, sku: 'ALV-1', price: '12.50' }],
  images: [],
  ...over,
});

describe('Shopify katalogini o‘girish', () => {
  describe('narx', () => {
    it('USD narxi tiyinga aylanadi', () => {
      // 12.50 USD × 12 800 = 160 000 so'm = 16 000 000 tiyin
      expect(toTiyin('12.50', 12800)).toBe(16_000_000n);
    });

    it('yaxlitlash BIR MARTA, oxirida bo‘ladi', () => {
      // 0.01 × 12345 = 123.45 so'm → 12345 tiyin
      expect(toTiyin('0.01', 12345)).toBe(12_345n);
    });

    it('bo‘sh yoki noto‘g‘ri narx nolga aylanadi, xato tashlamaydi', () => {
      expect(toTiyin(null, 12800)).toBe(0n);
      expect(toTiyin('', 12800)).toBe(0n);
      expect(toTiyin('abc', 12800)).toBe(0n);
      expect(toTiyin('-5', 12800)).toBe(0n);
    });
  });

  describe('SKU', () => {
    it('SKU bo‘lmasa barqaror qiymat yasaydi', () => {
      const p = product({ variants: [{ id: 11, price: '1' }] });
      expect(normalizeSku(p, p.variants[0]!, 0)).toBe('ALV-1-1');
    });

    it('takrorlangan SKU ga variant ID qo‘shiladi, yagonasiga — yo‘q', () => {
      // Bu muhim: qo'shimcha TASODIFIY bo'lsa, keyingi importda boshqa
      // SKU chiqib, o'sha mahsulot ikkinchi marta yaratilardi.
      const a = product({
        id: 1,
        variants: [
          { id: 11, sku: 'DUP', price: '1' },
          { id: 12, sku: 'DUP', price: '2' },
          { id: 13, sku: 'UNIQ', price: '3' },
        ],
      });
      const map = resolveSkus([a]);
      expect(map.get('1:11')).toBe('DUP-11');
      expect(map.get('1:12')).toBe('DUP-12');
      expect(map.get('1:13')).toBe('UNIQ');
    });

    it('ikki marta chaqirilsa bir xil natija beradi', () => {
      const a = product({ variants: [{ id: 11, sku: 'dup', price: '1' }, { id: 12, sku: 'DUP', price: '2' }] });
      expect([...resolveSkus([a]).entries()]).toEqual([...resolveSkus([a]).entries()]);
    });
  });

  describe('tasniflash', () => {
    it('nomiga qarab kategoriya topadi', () => {
      expect(categoryFor(product({ title: 'Gel Polish UV' })).slug).toBe('nail');
      expect(categoryFor(product({ title: 'Keratin Shampoo' })).slug).toBe('hair-care');
      expect(categoryFor(product({ title: 'Vitamin C Serum' })).slug).toBe('skin-care');
    });

    it('`product_type` ham hisobga olinadi', () => {
      // Do'kon turini ko'rsatgan bo'lsa, u nomdan ustun emas, lekin
      // nom hech narsa aytmaganda yagona ishorat bo'lib qoladi.
      expect(categoryFor(product({ title: 'Premium Complex', product_type: 'Hair' })).slug).toBe(
        'hair-care',
      );
    });

    it('bir nechta bo‘limga tushsa, ro‘yxatdagi birinchisi tanlanadi', () => {
      // «Nail» «skin» dan oldin turadi — bu TAXONOMY tartibi bilan
      // belgilanadi va o'zgarsa natija ham o'zgaradi.
      expect(categoryFor(product({ title: 'Nail and Skin Oil' })).slug).toBe('nail');
    });

    it('mos kelmasa «boshqa» ga tushadi, yo‘qolmaydi', () => {
      expect(categoryFor(product({ title: 'Зонтик', product_type: '', tags: '' })).slug).toBe('other');
    });

    it('teglar massiv bo‘lsa ham o‘qiladi', () => {
      // Shopify ba'zi do'konlarda `tags` ni massiv qaytaradi.
      expect(categoryFor(product({ title: 'X', product_type: '', tags: ['gift', 'nail'] })).slug).toBe('nail');
    });

    it('yaqinda chiqqan mahsulot «yangi kelganlar» ga qo‘shiladi', () => {
      const now = Date.parse('2026-06-01T00:00:00Z');
      const fresh = collectionsFor(product({ published_at: '2026-05-01T00:00:00Z' }), now);
      expect(fresh.map((c) => c.slug)).toContain('new-arrivals');

      const old = collectionsFor(product({ published_at: '2020-01-01T00:00:00Z', title: 'Oil' }), now);
      expect(old.map((c) => c.slug)).not.toContain('new-arrivals');
    });

    it('bitta kolleksiyaga ikki marta qo‘shilmaydi', () => {
      const now = Date.parse('2026-06-01T00:00:00Z');
      const list = collectionsFor(
        product({ title: 'New Arrival Oil', published_at: '2026-05-20T00:00:00Z' }),
        now,
      );
      expect(list.filter((c) => c.slug === 'new-arrivals')).toHaveLength(1);
    });
  });

  describe('brend', () => {
    it('vendor nomidan slug yasaydi', () => {
      expect(brandSlug('ELAIMEI')).toEqual({ slug: 'elaimei', name: 'ELAIMEI' });
      expect(brandSlug('ONE1X')).toEqual({ slug: 'one1x', name: 'ONE1X' });
    });

    it('vendor bo‘sh bo‘lsa ALIVER', () => {
      expect(brandSlug('').slug).toBe('aliver');
      expect(brandSlug(null).slug).toBe('aliver');
      expect(brandSlug(undefined).name).toBe('ALIVER');
    });

    it('lotin bo‘lmagan nomdan ham ishlaydigan slug chiqadi', () => {
      // Slug bo'sh qolsa Prisma unikal cheklovi butun importni yiqitardi.
      expect(brandSlug('Бренд').slug).toBe('aliver');
    });
  });

  describe('matn', () => {
    it('HTML tozalanadi', () => {
      expect(stripHtml('<p>Salom <b>dunyo</b></p><script>x()</script>')).toBe('Salom dunyo');
    });

    it('tanilgan atamalar tarjima qilinadi', () => {
      expect(localizeTitle('Hair Oil', dictionaries.uz)).toBe('soch moy');
      expect(localizeTitle('Hair Oil', dictionaries.ru)).toBe('волос масло');
    });
  });

  it('ko‘rib chiqish qatorida narx SO‘MDA bo‘ladi', () => {
    const row = previewRow(
      product({ variants: [{ id: 1, price: '10' }, { id: 2, price: '20' }] }),
      12800,
    );
    expect(row.minPriceSum).toBe(128_000);
    expect(row.maxPriceSum).toBe(256_000);
    expect(row.variants).toBe(2);
  });
});
