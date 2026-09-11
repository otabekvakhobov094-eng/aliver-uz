import { PrismaClient } from '@prisma/client';
import { readFile, writeFile } from 'node:fs/promises';

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const value = (name) => argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const commit = has('--commit');
const sourceUrl = value('--source-url') ?? 'https://www.aliver.com';
const snapshotFile = value('--snapshot');
const saveSnapshot = value('--save-snapshot');
const usdToUzs = Number(value('--usd-to-uzs') ?? process.env.ALIVER_USD_TO_UZS ?? 0);
const defaultIkpu = value('--ikpu') ?? process.env.ALIVER_DEFAULT_IKPU ?? '03304999001000000';
const warehouseCode = value('--warehouse') ?? process.env.ALIVER_WAREHOUSE_CODE ?? 'MAIN';
const pageLimit = 250;

if (commit && (!Number.isFinite(usdToUzs) || usdToUzs <= 0)) {
  throw new Error('--commit uchun --usd-to-uzs=... majburiy (USD narxini UZS ga aylantirish kursi)');
}

const clean = (html = '') => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();

const termsUz = new Map([
  ['hair', 'soch'], ['nail', 'tirnoq'], ['skin', 'teri'], ['face', 'yuz'], ['body', 'tana'],
  ['hand', "qo‘l"], ['foot', 'oyoq'], ['cream', 'krem'], ['serum', 'serum'], ['oil', 'moy'],
  ['mask', 'niqob'], ['shampoo', 'shampun'], ['conditioner', 'konditsioner'], ['gel', 'gel'],
  ['spray', 'sprey'], ['brush', "cho‘tka"], ['powder', 'kukun'], ['set', "to‘plam"],
  ['kit', "to‘plam"], ['makeup', 'makiyaj'], ['lip', 'lab'], ['eye', "ko‘z"], ['eyebrow', 'qosh'],
  ['care', 'parvarish'], ['repair', 'tiklovchi'], ['whitening', 'oqartiruvchi'],
  ['moisturizing', 'namlovchi'], ['cleaning', 'tozalovchi'], ['remover', 'tozalagich'],
]);
const termsRu = new Map([
  ['hair', 'волос'], ['nail', 'ногтей'], ['skin', 'кожи'], ['face', 'лица'], ['body', 'тела'],
  ['hand', 'рук'], ['foot', 'ног'], ['cream', 'крем'], ['serum', 'сыворотка'], ['oil', 'масло'],
  ['mask', 'маска'], ['shampoo', 'шампунь'], ['conditioner', 'кондиционер'], ['gel', 'гель'],
  ['spray', 'спрей'], ['brush', 'кисть'], ['powder', 'пудра'], ['set', 'набор'], ['kit', 'набор'],
  ['makeup', 'макияж'], ['lip', 'губ'], ['eye', 'глаз'], ['eyebrow', 'бровей'], ['care', 'уход'],
  ['repair', 'восстанавливающий'], ['whitening', 'отбеливающий'],
  ['moisturizing', 'увлажняющий'], ['cleaning', 'очищающий'], ['remover', 'средство для снятия'],
]);

function localizeTitle(title, dictionary) {
  return title.split(/(\s+|[-/(),])/).map((part) => {
    const translated = dictionary.get(part.toLowerCase());
    return translated ?? part;
  }).join('').replace(/\s+/g, ' ').trim();
}

function localizedCopy(product) {
  const nameUz = localizeTitle(product.title, termsUz);
  const nameRu = localizeTitle(product.title, termsRu);
  const sourceSummary = clean(product.body_html).slice(0, 500);
  return {
    nameUz,
    nameRu,
    shortDescUz: `${nameUz}. Original ALIVER mahsuloti. Variant va qo‘llash tafsilotlari mahsulot kartasida ko‘rsatilgan.`,
    shortDescRu: `${nameRu}. Оригинальный продукт ALIVER. Варианты и способ применения указаны в карточке товара.`,
    descUz: sourceSummary ? `${nameUz}. Mahsulot xususiyatlari va tarkibi ishlab chiqaruvchi ma’lumotlari asosida tekshiriladi.` : null,
    descRu: sourceSummary ? `${nameRu}. Характеристики и состав проверяются по данным производителя.` : null,
    warningsUz: "Faqat ko‘rsatma bo‘yicha foydalaning. Qadoqdagi ogohlantirish va tarkibni tekshiring.",
    warningsRu: 'Используйте согласно инструкции. Проверьте состав и предупреждения на упаковке.',
  };
}

async function downloadCatalog() {
  const products = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(`${sourceUrl}/products.json?limit=${pageLimit}&page=${page}`, {
      headers: { accept: 'application/json', 'user-agent': 'ALIVER.UZ catalog migration/1.0' },
    });
    if (!response.ok) throw new Error(`Shopify katalog javobi: ${response.status} ${response.statusText}`);
    const batch = (await response.json()).products ?? [];
    products.push(...batch);
    if (batch.length < pageLimit) break;
  }
  return products;
}

function money(price) {
  return BigInt(Math.round(Number(price || 0) * usdToUzs * 100));
}

function normalizeSku(product, variant, index) {
  const candidate = String(variant._importSku || variant.sku || `ALV-${product.id}-${index + 1}`).trim().toUpperCase();
  return candidate.slice(0, 120);
}

function productData(product, brandId) {
  const copy = localizedCopy(product);
  const prices = product.variants.map((v) => money(v.price));
  const compare = product.variants.map((v) => v.compare_at_price ? money(v.compare_at_price) : null);
  const stocks = product.variants.map((v) => Math.max(0, Number(v.inventory_quantity ?? 0)));
  const active = product.published_at !== null;
  return {
    ...copy,
    brandId,
    nameEn: null,
    slug: product.handle,
    ikpuCode: defaultIkpu,
    vatRate: 12,
    unitCode: '796',
    status: active ? 'ACTIVE' : 'DRAFT',
    publishedAt: active ? new Date(product.published_at ?? Date.now()) : null,
    minPrice: prices.reduce((a, b) => a < b ? a : b, prices[0] ?? 0n),
    maxPrice: prices.reduce((a, b) => a > b ? a : b, prices[0] ?? 0n),
    hasSale: compare.some((old, i) => old !== null && old > prices[i]),
    inStock: stocks.some((stock) => stock > 0),
    searchText: `${copy.nameUz} ${copy.nameRu} ${product.handle} ${product.vendor ?? ''}`.toLowerCase(),
  };
}

async function importProduct(tx, product, brandId, warehouseId) {
  const data = productData(product, brandId);
  const saved = await tx.product.upsert({
    where: { slug: product.handle },
    update: data,
    create: data,
    select: { id: true },
  });

  const variantIds = new Map();
  for (const [index, variant] of product.variants.entries()) {
    const sku = normalizeSku(product, variant, index);
    const savedVariant = await tx.productVariant.upsert({
      where: { sku },
      update: {
        productId: saved.id,
        barcode: variant.barcode || null,
        options: { title: variant.title, option1: variant.option1, option2: variant.option2, option3: variant.option3 },
        price: money(variant.price),
        oldPrice: variant.compare_at_price ? money(variant.compare_at_price) : null,
        weightGrams: variant.grams || null,
        isActive: variant.available !== false,
        sortOrder: index,
        deletedAt: null,
      },
      create: {
        productId: saved.id,
        sku,
        barcode: variant.barcode || null,
        options: { title: variant.title, option1: variant.option1, option2: variant.option2, option3: variant.option3 },
        price: money(variant.price),
        oldPrice: variant.compare_at_price ? money(variant.compare_at_price) : null,
        weightGrams: variant.grams || null,
        isActive: variant.available !== false,
        sortOrder: index,
      },
      select: { id: true },
    });
    variantIds.set(String(variant.id), savedVariant.id);
    const stock = Math.max(0, Number(variant.inventory_quantity ?? 0));
    await tx.inventory.upsert({
      where: { variantId_warehouseId: { variantId: savedVariant.id, warehouseId } },
      update: { totalStock: stock },
      create: { variantId: savedVariant.id, warehouseId, totalStock: stock },
    });
  }

  await tx.productImage.deleteMany({ where: { productId: saved.id } });
  if (product.images.length) {
    await tx.productImage.createMany({ data: product.images.map((image, index) => ({
      productId: saved.id,
      variantId: image.variant_ids?.length === 1 ? variantIds.get(String(image.variant_ids[0])) ?? null : null,
      kind: index === 0 ? 'MAIN' : 'GALLERY',
      url: image.src,
      width: image.width || null,
      height: image.height || null,
      altUz: localizeTitle(image.alt || product.title, termsUz),
      altRu: localizeTitle(image.alt || product.title, termsRu),
      sortOrder: index,
    })) });
  }
}

const products = snapshotFile
  ? JSON.parse(await readFile(snapshotFile, 'utf8')).products
  : await downloadCatalog();

// Shopify do‘konlarida bir SKU bir necha variantda takrorlanishi mumkin.
// Bizning sxemada SKU global unique, shuning uchun faqat dublikatlarga
// barqaror Shopify variant ID suffiksi qo‘shiladi.
const skuCounts = new Map();
for (const product of products) for (const variant of product.variants) {
  const sku = String(variant.sku || '').trim().toUpperCase();
  if (sku) skuCounts.set(sku, (skuCounts.get(sku) ?? 0) + 1);
}
for (const product of products) for (const variant of product.variants) {
  const sku = String(variant.sku || '').trim().toUpperCase();
  if (sku && skuCounts.get(sku) > 1) variant._importSku = `${sku}-${variant.id}`;
}

if (saveSnapshot) await writeFile(saveSnapshot, JSON.stringify({ sourceUrl, exportedAt: new Date().toISOString(), products }, null, 2));

const totals = {
  products: products.length,
  variants: products.reduce((sum, p) => sum + p.variants.length, 0),
  images: products.reduce((sum, p) => sum + p.images.length, 0),
};
console.log(JSON.stringify({ mode: commit ? 'commit' : 'dry-run', sourceUrl, usdToUzs, ...totals }, null, 2));

if (commit) {
  const prisma = new PrismaClient();
  try {
    const brand = await prisma.brand.upsert({ where: { slug: 'aliver' }, update: { name: 'ALIVER' }, create: { slug: 'aliver', name: 'ALIVER' } });
    const warehouse = await prisma.warehouse.findUnique({ where: { code: warehouseCode } });
    if (!warehouse) throw new Error(`Ombor topilmadi: ${warehouseCode}`);
    for (const [index, product] of products.entries()) {
      await prisma.$transaction((tx) => importProduct(tx, product, brand.id, warehouse.id), { timeout: 30_000 });
      if ((index + 1) % 25 === 0 || index + 1 === products.length) console.log(`${index + 1}/${products.length}`);
    }
    console.log('ALIVER katalog importi yakunlandi.');
  } finally {
    await prisma.$disconnect();
  }
}
