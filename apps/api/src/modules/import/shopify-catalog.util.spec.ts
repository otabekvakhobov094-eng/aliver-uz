import {
  brandSlug,
  categoryFor,
  collectionsFor,
  descriptionFrom,
  productTitle,
  roundPriceTiyin,
  sourceStock,
  stockUnknown,
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

    it('nom TARJIMA QILINMAYDI — asl holida qoladi', () => {
      /*
       * Ilgari bu yerda so'zma-so'z tarjima sinalar va test
       * «Hair Oil» → «soch moy» ni TO'G'RI deb tasdiqlardi. Aslida
       * bu noto'g'ri o'zbekcha (kelishik yo'q) va jonli saytda u
       * «Aliver Bowling lab Tint» kabi nomlarga aylangan edi.
       *
       * Test xatoni qo'riqlab turgan holat: shuning uchun u ham
       * almashtirildi.
       */
      expect(productTitle(product({ title: 'Aliver Bowling Lip Tint (Bowler)' }))).toBe(
        'Aliver Bowling Lip Tint (Bowler)',
      );
    });

    it('nomdagi ortiqcha bo‘sh joylar tozalanadi', () => {
      expect(productTitle(product({ title: '  Rosemary   Oil  60ml ' }))).toBe(
        'Rosemary Oil 60ml',
      );
    });
  });

  describe('tavsif', () => {
    it('manbadagi matn olinadi, HTML tozalanadi', () => {
      expect(descriptionFrom('<p>Soch uchun <b>rozmarin</b> moyi, 60 ml.</p>')).toBe(
        'Soch uchun rozmarin moyi, 60 ml.',
      );
    });

    it('matn yo‘q bo‘lsa `null` — shablon bilan to‘ldirilmaydi', () => {
      // Shablon yo'qlikni yashiradi va uni hech kim tuzatmaydi.
      expect(descriptionFrom('')).toBeNull();
      expect(descriptionFrom(null)).toBeNull();
      expect(descriptionFrom('<p>  </p>')).toBeNull();
    });

    it('juda qisqa matn tavsif hisoblanmaydi', () => {
      expect(descriptionFrom('<p>60 ml</p>')).toBeNull();
    });

    it('uzun matn kesiladi, lekin belgisi qoladi', () => {
      const long = `<p>${'a'.repeat(3000)}</p>`;
      const out = descriptionFrom(long, 100);
      expect(out).toHaveLength(100);
      expect(out?.endsWith('…')).toBe(true);
    });
  });

  describe('qoldiq', () => {
    it('manbada son bo‘lmasa — `null`, ya’ni «bilmayman»', () => {
      // Bu «nol» dan butunlay boshqa narsa: nol yozish 556 ta
      // mahsulotni «Tugagan» qilib qo'ygan edi.
      expect(sourceStock({ id: 1, price: '1' })).toBeNull();
      expect(sourceStock({ id: 1, price: '1', inventory_quantity: null })).toBeNull();
    });

    it('manbadagi son olinadi', () => {
      expect(sourceStock({ id: 1, price: '1', inventory_quantity: 12 })).toBe(12);
    });

    it('manfiy son nolga tushiriladi', () => {
      expect(sourceStock({ id: 1, price: '1', inventory_quantity: -5 })).toBe(0);
    });

    it('hamma variant nol bo‘lsa — qoldiq noma’lum deb hisoblanadi', () => {
      expect(
        stockUnknown(
          product({
            variants: [
              { id: 1, price: '1', inventory_quantity: 0 },
              { id: 2, price: '2' },
            ],
          }),
        ),
      ).toBe(true);
    });

    it('bittasida musbat son bo‘lsa — ma’lum', () => {
      expect(
        stockUnknown(
          product({ variants: [{ id: 1, price: '1', inventory_quantity: 3 }] }),
        ),
      ).toBe(false);
    });
  });

  describe('narxni yaxlitlash', () => {
    it('eng yaqin 1 000 so‘mga', () => {
      // 412 303 so'm → 412 000. Dollardan konvertatsiya qilingan narx
      // mijozga «avtomatik yig'ilgan sayt» degan taassurot beradi.
      expect(roundPriceTiyin(412_303_00n)).toBe(412_000_00n);
      expect(roundPriceTiyin(105_933_00n)).toBe(106_000_00n);
      expect(roundPriceTiyin(200_201_00n)).toBe(200_000_00n);
    });

    it('yarmi yuqoriga yaxlitlanadi', () => {
      expect(roundPriceTiyin(1_500_00n)).toBe(2_000_00n);
    });

    it('arzon tovar NOLGA aylanmaydi', () => {
      // 300 so'm 1 000 ga yaxlitlanganda nol bo'lardi va tovar
      // bepul bo'lib qolardi.
      expect(roundPriceTiyin(300_00n)).toBe(1_000_00n);
    });

    it('qadamni o‘zgartirish mumkin', () => {
      expect(roundPriceTiyin(412_303_00n, 5000)).toBe(410_000_00n);
    });

    it('nol narx o‘zgarmaydi', () => {
      expect(roundPriceTiyin(0n)).toBe(0n);
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
