/**
 * Demo katalog: kategoriyalar, kolleksiyalar va 12 ta mahsulot.
 *
 * Bu ma'lumot ISHLAB CHIQISH uchun — frontend va admin panelni bo'sh bazada
 * sinab bo'lmaydi. Productionda `SEED_DEMO_CATALOG=false` bilan o'chiriladi.
 * Barcha mahsulotlarda IKPU kodi bor: ularsiz fiskal chek ishlamaydi.
 */
import { PrismaClient } from '@prisma/client';
import { buildProductSearchText } from '../src/modules/catalog/search.util';

const SUM = 100n;
const sum = (n: number): bigint => BigInt(n) * SUM;

type CategorySeed = { slug: string; uz: string; ru: string; children?: CategorySeed[] };

const CATEGORIES: CategorySeed[] = [
  {
    slug: 'soch-parvarishi',
    uz: 'Soch parvarishi',
    ru: 'Уход за волосами',
    children: [
      { slug: 'shampun', uz: 'Shampun', ru: 'Шампунь' },
      { slug: 'soch-moyi', uz: 'Soch moyi', ru: 'Масло для волос' },
      { slug: 'soch-niqobi', uz: 'Niqob', ru: 'Маска' },
    ],
  },
  {
    slug: 'yuz-parvarishi',
    uz: 'Yuz parvarishi',
    ru: 'Уход за лицом',
    children: [
      { slug: 'krem', uz: 'Krem', ru: 'Крем' },
      { slug: 'serum', uz: 'Serum', ru: 'Сыворотка' },
    ],
  },
  { slug: 'makiyaj', uz: 'Makiyaj', ru: 'Макияж', children: [{ slug: 'lab-boyogi', uz: 'Lab bo‘yog‘i', ru: 'Помада' }] },
  { slug: 'tana-parvarishi', uz: 'Tana parvarishi', ru: 'Уход за телом' },
  // Sarlavha menyusida «Tirnoq» bo'limi bor edi, kategoriyasi esa yo'q:
  // havola bosilganda BO'SH katalog chiqardi. `check-nav-targets.mjs`
  // aynan shuni topdi.
  {
    slug: 'tirnoq',
    uz: 'Tirnoq',
    ru: 'Ногти',
    children: [
      { slug: 'gel-lak', uz: 'Gel lak', ru: 'Гель-лак' },
      { slug: 'tirnoq-parvarishi', uz: 'Tirnoq parvarishi', ru: 'Уход за ногтями' },
    ],
  },
  { slug: 'toplamlar', uz: 'To‘plamlar', ru: 'Наборы' },
];

const COLLECTIONS: Array<[string, string, string]> = [
  ['best-sellers', 'Eng ko‘p sotilganlar', 'Хиты продаж'],
  ['yangi-kelganlar', 'Yangi kelganlar', 'Новинки'],
  ['aksiya', 'Aksiyadagilar', 'Акции'],
  ['sovga-toplamlari', 'Sovg‘a to‘plamlari', 'Подарочные наборы'],
];

interface ProductSeed {
  slug: string;
  uz: string;
  ru: string;
  category: string;
  collections: string[];
  tags: string[];
  ikpu: string;
  featured?: boolean;
  shortUz: string;
  shortRu: string;
  ingredientsUz: string;
  warningsUz: string;
  variants: Array<{ sku: string; size?: string; color?: string; price: number; old?: number; stock: number; volumeMl?: number }>;
}

const WARNINGS_DEFAULT =
  'Faqat tashqi qo‘llash uchun. Ko‘zga tegsa, ko‘p suv bilan yuving. Bolalar qo‘li yetmaydigan joyda saqlang.';

const PRODUCTS: ProductSeed[] = [
  {
    slug: 'gel-lak-rose-nude',
    uz: 'ALIVER Gel lak Rose Nude',
    ru: 'ALIVER Гель-лак Rose Nude',
    category: 'gel-lak',
    collections: ['yangi-kelganlar'],
    tags: ['tiniqlik'],
    ikpu: '03304300001000000',
    shortUz: 'LED lampada 30 soniyada qotadigan gel lak',
    shortRu: 'Гель-лак, застывающий в LED-лампе за 30 секунд',
    ingredientsUz:
      'Di-HEMA Trimethylhexyl Dicarbamate, HEMA, Hydroxypropyl Methacrylate, Photoinitiator, CI 77891.',
    warningsUz: WARNINGS_DEFAULT,
    variants: [
      { sku: 'ALV-GEL-RN8', color: 'Rose Nude', size: '8 ml', price: 69000, stock: 36, volumeMl: 8 },
      { sku: 'ALV-GEL-CR8', color: 'Coral', size: '8 ml', price: 69000, stock: 28, volumeMl: 8 },
    ],
  },
  {
    slug: 'kutikula-moyi',
    uz: 'ALIVER Kutikula uchun parvarish moyi',
    ru: 'ALIVER Масло для кутикулы',
    category: 'tirnoq-parvarishi',
    collections: [],
    tags: ['quruqlik'],
    ikpu: '03304991002000000',
    shortUz: 'Jojoba va E vitamini bilan kutikulani yumshatuvchi moy',
    shortRu: 'Масло с жожоба и витамином E, смягчает кутикулу',
    ingredientsUz: 'Simmondsia Chinensis Seed Oil, Tocopheryl Acetate, Prunus Amygdalus Dulcis Oil, Parfum.',
    warningsUz: WARNINGS_DEFAULT,
    variants: [{ sku: 'ALV-CUT-015', size: '15 ml', price: 54000, stock: 44, volumeMl: 15 }],
  },
  {
    slug: 'rosemary-soch-moyi',
    uz: 'ALIVER Rosemary soch o‘sishi uchun moy',
    ru: 'ALIVER Rosemary масло для роста волос',
    category: 'soch-moyi',
    collections: ['best-sellers', 'aksiya'],
    tags: ['soch-tokilishi', 'quruqlik'],
    ikpu: '03302001001000000',
    featured: true,
    shortUz: 'Rozmarin va biotin asosidagi skalp konsentrati',
    shortRu: 'Концентрат для кожи головы с розмарином и биотином',
    ingredientsUz:
      'Ricinus Communis Seed Oil, Rosmarinus Officinalis Leaf Extract, Biotin, Panthenol, Tocopheryl Acetate, Menthol, Parfum.',
    warningsUz: WARNINGS_DEFAULT,
    variants: [
      { sku: 'ALV-RSM-030', size: '30 ml', price: 129000, old: 169000, stock: 24, volumeMl: 30 },
      { sku: 'ALV-RSM-060', size: '60 ml', price: 189000, old: 249000, stock: 11, volumeMl: 60 },
      { sku: 'ALV-RSM-100', size: '100 ml', price: 259000, old: 339000, stock: 3, volumeMl: 100 },
    ],
  },
  {
    slug: 'collagen-namlovchi-krem',
    uz: 'ALIVER Collagen yuz uchun namlovchi krem',
    ru: 'ALIVER Collagen увлажняющий крем для лица',
    category: 'krem',
    collections: ['best-sellers'],
    tags: ['quruqlik'],
    ikpu: '03304991001000000',
    featured: true,
    shortUz: 'Kollagen va gialuron kislotasi bilan kunlik krem',
    shortRu: 'Дневной крем с коллагеном и гиалуроновой кислотой',
    ingredientsUz: 'Aqua, Hydrolyzed Collagen, Sodium Hyaluronate, Glycerin, Squalane, Parfum.',
    warningsUz: WARNINGS_DEFAULT,
    variants: [{ sku: 'ALV-COL-050', size: '50 ml', price: 215000, stock: 42, volumeMl: 50 }],
  },
  {
    slug: 'keratin-tiklovchi-shampun',
    uz: 'ALIVER Keratin tiklovchi shampun',
    ru: 'ALIVER Keratin восстанавливающий шампунь',
    category: 'shampun',
    collections: ['best-sellers', 'aksiya'],
    tags: ['bolinish', 'quruqlik'],
    ikpu: '03305100001000000',
    shortUz: 'Sulfatsiz, bo‘yalgan soch uchun mos',
    shortRu: 'Без сульфатов, подходит для окрашенных волос',
    ingredientsUz: 'Aqua, Cocamidopropyl Betaine, Hydrolyzed Keratin, Panthenol, Citric Acid, Parfum.',
    warningsUz: WARNINGS_DEFAULT,
    variants: [
      { sku: 'ALV-KER-300', size: '300 ml', price: 148000, old: 179000, stock: 60, volumeMl: 300 },
      { sku: 'ALV-KER-500', size: '500 ml', price: 209000, old: 259000, stock: 18, volumeMl: 500 },
    ],
  },
  {
    slug: 'vitamin-c-serum',
    uz: 'ALIVER Vitamin C yorituvchi serum',
    ru: 'ALIVER Vitamin C осветляющая сыворотка',
    category: 'serum',
    collections: ['yangi-kelganlar'],
    tags: ['dog', 'tiniqlik'],
    ikpu: '03304999001000000',
    shortUz: '15% barqarorlashtirilgan vitamin C',
    shortRu: '15% стабилизированного витамина C',
    ingredientsUz: 'Aqua, Ascorbic Acid 15%, Ferulic Acid, Tocopherol, Propanediol.',
    warningsUz: `${WARNINGS_DEFAULT} Kunduzi quyoshdan himoya vositasi bilan birga ishlatiladi.`,
    variants: [{ sku: 'ALV-VTC-030', size: '30 ml', price: 235000, stock: 27, volumeMl: 30 }],
  },
  {
    slug: 'aloe-tana-losioni',
    uz: 'ALIVER Aloe qo‘l va tana losioni',
    ru: 'ALIVER Aloe лосьон для рук и тела',
    category: 'tana-parvarishi',
    collections: [],
    tags: ['quruqlik'],
    ikpu: '03304300001000000',
    shortUz: 'Yengil, tez singadigan losion',
    shortRu: 'Лёгкий, быстро впитывающийся лосьон',
    ingredientsUz: 'Aqua, Aloe Barbadensis Leaf Juice, Glycerin, Shea Butter, Parfum.',
    warningsUz: WARNINGS_DEFAULT,
    variants: [{ sku: 'ALV-ALO-250', size: '250 ml', price: 96000, stock: 80, volumeMl: 250 }],
  },
  {
    slug: 'matte-lab-boyogi',
    uz: 'ALIVER Matte lab bo‘yog‘i',
    ru: 'ALIVER Matte помада для губ',
    category: 'lab-boyogi',
    collections: ['best-sellers', 'aksiya'],
    tags: [],
    ikpu: '03304100001000000',
    shortUz: 'Uzoq turadigan mat tekstura',
    shortRu: 'Стойкая матовая текстура',
    ingredientsUz: 'Ricinus Communis Seed Oil, Cera Alba, Candelilla Wax, CI 15850, Tocopherol.',
    warningsUz: WARNINGS_DEFAULT,
    variants: [
      { sku: 'ALV-LIP-RN', color: 'Rose Nude', price: 89000, old: 119000, stock: 35 },
      { sku: 'ALV-LIP-CR', color: 'Cherry Red', price: 89000, old: 119000, stock: 22 },
      { sku: 'ALV-LIP-BB', color: 'Berry Blush', price: 89000, old: 119000, stock: 0 },
    ],
  },
  {
    slug: 'hair-growth-toplami',
    uz: 'ALIVER Hair Growth to‘plami — 3 mahsulot',
    ru: 'ALIVER Hair Growth набор — 3 продукта',
    category: 'toplamlar',
    collections: ['sovga-toplamlari', 'best-sellers'],
    tags: ['soch-tokilishi'],
    ikpu: '03307900001000000',
    featured: true,
    shortUz: 'Shampun, moy va niqob bitta to‘plamda',
    shortRu: 'Шампунь, масло и маска в одном наборе',
    ingredientsUz: 'To‘plamdagi har bir mahsulotning tarkibi o‘z qadog‘ida ko‘rsatilgan.',
    warningsUz: WARNINGS_DEFAULT,
    variants: [{ sku: 'ALV-SET-HG', price: 329000, old: 390000, stock: 14 }],
  },
  {
    slug: 'tungi-yuz-niqobi',
    uz: 'ALIVER Tungi ta’sirli yuz niqobi',
    ru: 'ALIVER ночная маска для лица',
    category: 'krem',
    collections: ['yangi-kelganlar'],
    tags: ['quruqlik'],
    ikpu: '03304991002000000',
    shortUz: 'Kechasi ishlaydigan namlovchi niqob',
    shortRu: 'Увлажняющая маска, работающая ночью',
    ingredientsUz: 'Aqua, Glycerin, Niacinamide, Ceramide NP, Panthenol, Parfum.',
    warningsUz: WARNINGS_DEFAULT,
    variants: [{ sku: 'ALV-NGT-080', size: '80 ml', price: 132000, stock: 6, volumeMl: 80 }],
  },
  {
    slug: 'argan-soch-niqobi',
    uz: 'ALIVER Argan soch niqobi',
    ru: 'ALIVER Argan маска для волос',
    category: 'soch-niqobi',
    collections: [],
    tags: ['bolinish'],
    ikpu: '03305900001000000',
    shortUz: 'Haftada ikki marta qo‘llaniladigan niqob',
    shortRu: 'Маска для применения дважды в неделю',
    ingredientsUz: 'Aqua, Argania Spinosa Kernel Oil, Behentrimonium Chloride, Panthenol, Parfum.',
    warningsUz: WARNINGS_DEFAULT,
    variants: [{ sku: 'ALV-ARG-200', size: '200 ml', price: 124000, stock: 33, volumeMl: 200 }],
  },
  {
    slug: 'niacinamide-serum',
    uz: 'ALIVER Niacinamide teshiklarni toraytiruvchi serum',
    ru: 'ALIVER Niacinamide сыворотка для сужения пор',
    category: 'serum',
    collections: ['yangi-kelganlar'],
    tags: ['yoglanish'],
    ikpu: '03304999002000000',
    shortUz: '10% niacinamide va rux',
    shortRu: '10% ниацинамида и цинк',
    ingredientsUz: 'Aqua, Niacinamide 10%, Zinc PCA, Propanediol, Pentylene Glycol.',
    warningsUz: WARNINGS_DEFAULT,
    variants: [{ sku: 'ALV-NIA-030', size: '30 ml', price: 178000, stock: 41, volumeMl: 30 }],
  },
  {
    slug: 'yumshoq-tozalovchi-gel',
    uz: 'ALIVER Yumshoq tozalovchi gel',
    ru: 'ALIVER мягкий очищающий гель',
    category: 'yuz-parvarishi',
    collections: [],
    tags: ['yoglanish'],
    ikpu: '03304991003000000',
    shortUz: 'Har kunlik tozalash uchun, pH 5.5',
    shortRu: 'Для ежедневного очищения, pH 5.5',
    ingredientsUz: 'Aqua, Coco-Glucoside, Glycerin, Allantoin, Citric Acid.',
    warningsUz: WARNINGS_DEFAULT,
    variants: [{ sku: 'ALV-CLN-150', size: '150 ml', price: 87000, stock: 55, volumeMl: 150 }],
  },
  {
    slug: 'sovga-toplami-beauty-box',
    uz: 'ALIVER Beauty Box sovg‘a to‘plami',
    ru: 'ALIVER Beauty Box подарочный набор',
    category: 'toplamlar',
    collections: ['sovga-toplamlari'],
    tags: [],
    ikpu: '03307900002000000',
    shortUz: 'Beshta mini mahsulot sovg‘a qutisida',
    shortRu: 'Пять мини-продуктов в подарочной коробке',
    ingredientsUz: 'Har bir mahsulotning tarkibi o‘z qadog‘ida ko‘rsatilgan.',
    warningsUz: WARNINGS_DEFAULT,
    variants: [{ sku: 'ALV-SET-BB', price: 279000, stock: 9 }],
  },
];

const TAGS: Array<[string, string, string]> = [
  ['soch-tokilishi', 'Soch to‘kilishi', 'Выпадение волос'],
  ['quruqlik', 'Quruqlik', 'Сухость'],
  ['bolinish', 'Uchlarining bo‘linishi', 'Секущиеся кончики'],
  ['yoglanish', 'Yog‘lanish', 'Жирность'],
  ['dog', 'Dog‘lar', 'Пигментация'],
  ['tiniqlik', 'Tiniqlik', 'Сияние'],
];

export async function seedCatalog(prisma: PrismaClient): Promise<void> {
  // --- kategoriyalar ---
  const categoryIdBySlug = new Map<string, string>();

  const upsertCategory = async (c: CategorySeed, parentId: string | null, depth: number, i: number) => {
    const created = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nameUz: c.uz, nameRu: c.ru, parentId, depth, sortOrder: i },
      create: { slug: c.slug, nameUz: c.uz, nameRu: c.ru, parentId, depth, sortOrder: i, isActive: true },
    });
    await prisma.category.update({
      where: { id: created.id },
      data: { path: parentId ? `${(await prisma.category.findUnique({ where: { id: parentId } }))!.path}/${created.id}` : created.id },
    });
    categoryIdBySlug.set(c.slug, created.id);
    for (const [j, child] of (c.children ?? []).entries()) {
      await upsertCategory(child, created.id, depth + 1, j);
    }
  };

  for (const [i, c] of CATEGORIES.entries()) await upsertCategory(c, null, 0, i);

  // --- kolleksiyalar ---
  const collectionIdBySlug = new Map<string, string>();
  for (const [i, row] of COLLECTIONS.entries()) {
    const [slug, uz, ru] = row as [string, string, string];
    const c = await prisma.collection.upsert({
      where: { slug },
      update: { nameUz: uz, nameRu: ru },
      create: { slug, nameUz: uz, nameRu: ru, sortOrder: i, isActive: true },
    });
    collectionIdBySlug.set(slug, c.id);
  }

  // --- teglar ---
  const tagIdBySlug = new Map<string, string>();
  for (const [slug, uz, ru] of TAGS) {
    const t = await prisma.tag.upsert({
      where: { slug },
      update: { nameUz: uz, nameRu: ru },
      create: { slug, nameUz: uz, nameRu: ru },
    });
    tagIdBySlug.set(slug, t.id);
  }

  // --- brendlar ---
  //
  // aliverbeauty.eu da ALIVER dan tashqari uchta brend ham sotiladi.
  // Ular shu yerda yaratiladi, mahsulotlar esa import paytida o'z
  // `vendor` maydoniga qarab biriktiriladi.
  //
  // Brend YARATILADI, lekin nomi qayta yozilmaydi: adminda to'g'rilangan
  // yozuv (masalan «One1X» → «ONE1X») seed qayta ishga tushganda
  // yo'qolmasligi kerak.
  for (const [slug, name] of [
    ['aliver', 'ALIVER'],
    ['elaimei', 'ELAIMEI'],
    ['sefudun', 'SEFUDUN'],
    ['one1x', 'ONE1X'],
  ] as const) {
    await prisma.brand.upsert({ where: { slug }, update: {}, create: { slug, name } });
  }
  const brand = (await prisma.brand.findUniqueOrThrow({ where: { slug: 'aliver' } }));

  const warehouse = await prisma.warehouse.findFirst({ where: { code: 'MAIN' } });
  if (!warehouse) throw new Error('MAIN ombori topilmadi — avval asosiy seed ishga tushirilsin');

  // --- mahsulotlar ---
  for (const p of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(p.category);
    if (!categoryId) throw new Error(`Kategoriya topilmadi: ${p.category}`);

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        nameUz: p.uz,
        nameRu: p.ru,
        brandId: brand.id,
        shortDescUz: p.shortUz,
        shortDescRu: p.shortRu,
        descUz: `${p.shortUz}. Mahsulot ALIVER Uzbekistan rasmiy dileri orqali yetkaziladi va muvofiqlik sertifikatiga ega.`,
        descRu: `${p.shortRu}. Продукт поставляется официальным дилером ALIVER Uzbekistan.`,
        ingredientsUz: p.ingredientsUz,
        ingredientsRu: p.ingredientsUz,
        warningsUz: p.warningsUz,
        warningsRu:
          'Только для наружного применения. При попадании в глаза промойте водой. Хранить в недоступном для детей месте.',
        howToUseUz: 'Tozalangan teriga yoki sochga surtiladi. Qadoqdagi yo‘riqnomaga amal qiling.',
        howToUseRu: 'Наносить на очищенную кожу или волосы. Следуйте инструкции на упаковке.',
        countryOfOrigin: 'Janubiy Koreya',
        manufacturer: 'ALIVER Co., Ltd.',
        shelfLifeMonths: 24,
        ikpuCode: p.ikpu,
        vatRate: 12,
        unitCode: '1',
        status: 'ACTIVE',
        isFeatured: p.featured ?? false,
        publishedAt: new Date(),
        seoTitleUz: `${p.uz} — ALIVER.UZ`,
        seoTitleRu: `${p.ru} — ALIVER.UZ`,
        seoDescUz: p.shortUz,
        seoDescRu: p.shortRu,
        ratingAvg: 4.5 + Math.random() * 0.5,
        ratingCount: 20 + Math.floor(Math.random() * 200),
        salesCount: Math.floor(Math.random() * 300),
      },
    });

    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId } },
      update: { isPrimary: true },
      create: { productId: product.id, categoryId, isPrimary: true },
    });

    for (const [i, slug] of p.collections.entries()) {
      const collectionId = collectionIdBySlug.get(slug);
      if (!collectionId) continue;
      await prisma.collectionProduct.upsert({
        where: { productId_collectionId: { productId: product.id, collectionId } },
        update: { sortOrder: i },
        create: { productId: product.id, collectionId, sortOrder: i },
      });
    }

    for (const slug of p.tags) {
      const tagId = tagIdBySlug.get(slug);
      if (!tagId) continue;
      await prisma.productTag.upsert({
        where: { productId_tagId: { productId: product.id, tagId } },
        update: {},
        create: { productId: product.id, tagId },
      });
    }

    const prices: bigint[] = [];
    let hasSale = false;
    let inStock = false;

    for (const [i, v] of p.variants.entries()) {
      const options: Record<string, string> = {};
      if (v.size) options.size = v.size;
      if (v.color) options.color = v.color;

      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: { price: sum(v.price), oldPrice: v.old ? sum(v.old) : null },
        create: {
          productId: product.id,
          sku: v.sku,
          options: options as never,
          price: sum(v.price),
          oldPrice: v.old ? sum(v.old) : null,
          costPrice: sum(Math.round(v.price * 0.55)),
          volumeMl: v.volumeMl ?? null,
          sortOrder: i,
          isActive: true,
        },
      });

      await prisma.inventory.upsert({
        where: { variantId_warehouseId: { variantId: variant.id, warehouseId: warehouse.id } },
        update: { totalStock: v.stock },
        create: { variantId: variant.id, warehouseId: warehouse.id, totalStock: v.stock },
      });

      // Demo qoldiq ham harakat jurnaliga yoziladi — qoida hamma joyda bir xil (A-6).
      const already = await prisma.inventoryMovement.findFirst({
        where: { variantId: variant.id, reason: 'PURCHASE_IN' },
      });
      if (!already && v.stock > 0) {
        await prisma.inventoryMovement.create({
          data: {
            variantId: variant.id,
            warehouseId: warehouse.id,
            reason: 'PURCHASE_IN',
            quantity: v.stock,
            balanceAfter: v.stock,
            comment: 'Demo ma’lumot (seed)',
          },
        });
      }

      prices.push(sum(v.price));
      if (v.old) hasSale = true;
      if (v.stock > 0) inStock = true;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: {
        minPrice: prices.reduce((a, b) => (b < a ? b : a), prices[0] ?? 0n),
        maxPrice: prices.reduce((a, b) => (b > a ? b : a), prices[0] ?? 0n),
        hasSale,
        inStock,
        searchText: buildProductSearchText({
          nameUz: p.uz,
          nameRu: p.ru,
          brand: 'ALIVER',
          skus: p.variants.map((v) => v.sku),
          tags: p.tags,
          ingredientsUz: p.ingredientsUz,
        }),
      },
    });
  }

  console.log(
    `  demo katalog: ${CATEGORIES.length} asosiy kategoriya, ${COLLECTIONS.length} kolleksiya, ${PRODUCTS.length} mahsulot`,
  );
}
