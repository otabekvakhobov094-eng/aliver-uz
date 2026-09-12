/**
 * Bazadagi mavjud katalogni tuzatish.
 *
 * NEGA KERAK. Birinchi import ikki narsani buzgan holda yozgan:
 *
 *   1. NOM so'zma-so'z tarjima qilingan va o'qib bo'lmaydigan
 *      aralashmaga aylangan — «Aliver Bowling lab Tint»,
 *      «teri Tone Adjusting CC krem», «ko'z Lash Clusters»;
 *   2. TAVSIF o'rniga hamma mahsulotga bir xil jumla yozilgan, asl
 *      matn esa o'qilib, tashlab yuborilgan;
 *   3. NARX dollardan konvertatsiya qilingan holda qolgan —
 *      «412 303 so'm».
 *
 * Import skripti endi bunday yozmaydi, lekin BAZADAGI 556 ta mahsulot
 * o'sha holatda turibdi. Bu skript ularni joyida tuzatadi.
 *
 * QOLDIQQA TEGMAYDI. Bu ataylab: qoldiqni xodim kiritadi va uni
 * matn tuzatish paytida o'chirib yuborish eng oson yo'l qo'yiladigan
 * xato bo'lardi.
 *
 * Ishlatish:
 *   node scripts/fix-catalog-copy.mjs                  # nima o'zgarishini ko'rsatadi
 *   node scripts/fix-catalog-copy.mjs --commit         # yozadi
 *   node scripts/fix-catalog-copy.mjs --commit --only=prices
 *   node scripts/fix-catalog-copy.mjs --snapshot=fayl.json
 *
 * Narxlar BAZADAGI qiymatdan yaxlitlanadi — manba va kurs kerak emas.
 * Nom va tavsif esa manbadan olinadi (`--source-url` yoki `--snapshot`).
 */

import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { descriptionFrom, productTitle, roundPriceTiyin } from './lib/catalog-copy.mjs';

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const value = (name) => argv.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1);

const commit = has('--commit');
const only = value('--only') ?? 'all';
const sourceUrl = value('--source-url') ?? 'https://www.aliver.com';
const snapshotFile = value('--snapshot');
const roundStep = Number(value('--round-step') ?? 1000);

const doCopy = only === 'all' || only === 'copy';
const doPrices = only === 'all' || only === 'prices';

const prisma = new PrismaClient();

async function loadSource() {
  if (snapshotFile) {
    const raw = JSON.parse(await readFile(snapshotFile, 'utf8'));
    return Array.isArray(raw) ? raw : (raw.products ?? []);
  }
  const products = [];
  for (let page = 1; ; page += 1) {
    const res = await fetch(`${sourceUrl}/products.json?limit=250&page=${page}`, {
      headers: { accept: 'application/json', 'user-agent': 'ALIVER.UZ catalog repair/1.0' },
    });
    if (!res.ok) throw new Error(`Manba javobi: ${res.status} ${res.statusText}`);
    const batch = (await res.json()).products ?? [];
    products.push(...batch);
    if (batch.length < 250) break;
  }
  return products;
}

/* ---------------------------------------------------------------- */

async function fixCopy() {
  const source = await loadSource();
  const byHandle = new Map(source.map((p) => [p.handle, p]));
  console.log(`Manbada ${source.length} ta mahsulot topildi.`);

  const rows = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true, nameUz: true, descUz: true },
  });

  let renamed = 0;
  let described = 0;
  let missing = 0;
  const samples = [];

  for (const row of rows) {
    const src = byHandle.get(row.slug);
    if (!src) {
      missing += 1;
      continue;
    }

    const name = productTitle(src);
    const description = descriptionFrom(src.body_html);
    if (!name) continue;

    const nameChanged = name !== row.nameUz;
    const descChanged = (description ?? null) !== (row.descUz ?? null);
    if (!nameChanged && !descChanged) continue;

    if (nameChanged && samples.length < 10) samples.push(`  ${row.nameUz}\n    → ${name}`);
    if (nameChanged) renamed += 1;
    if (descChanged) described += 1;

    if (commit) {
      await prisma.product.update({
        where: { id: row.id },
        data: {
          nameUz: name,
          nameRu: name,
          nameEn: name,
          shortDescUz: description ? description.slice(0, 300) : null,
          shortDescRu: description ? description.slice(0, 300) : null,
          descUz: description,
          descRu: description,
          searchText: `${name} ${row.slug}`.toLowerCase(),
        },
      });
    }
  }

  console.log(`\nNomi tuzatiladi: ${renamed}`);
  console.log(`Tavsifi tuzatiladi: ${described}`);
  if (missing > 0) {
    console.log(`Manbada topilmadi: ${missing} — ular o‘zgarmaydi`);
  }
  if (samples.length > 0) console.log(`\nNamuna:\n${samples.join('\n')}`);
}

async function fixPrices() {
  /*
   * Narx BAZADAGI qiymatdan yaxlitlanadi.
   *
   * Manbadan qayta hisoblash ham mumkin edi, lekin u bugungi kursga
   * bog'liq bo'lardi: skriptni ikki marta ishga tushirish narxni ikki
   * xil qilib qo'yardi. Bazadagi qiymatni yaxlitlash esa idempotent —
   * ikkinchi marta ishga tushirilsa hech narsa o'zgarmaydi.
   */
  const variants = await prisma.productVariant.findMany({
    where: { deletedAt: null },
    select: { id: true, price: true, oldPrice: true, sku: true },
  });

  let changed = 0;
  const samples = [];

  for (const v of variants) {
    const price = roundPriceTiyin(v.price, roundStep);
    const oldPrice = v.oldPrice === null ? null : roundPriceTiyin(v.oldPrice, roundStep);
    if (price === v.price && oldPrice === v.oldPrice) continue;

    changed += 1;
    if (samples.length < 10) {
      samples.push(`  ${v.sku}: ${v.price / 100n} → ${price / 100n} so‘m`);
    }
    if (commit) {
      await prisma.productVariant.update({ where: { id: v.id }, data: { price, oldPrice } });
    }
  }

  console.log(`\nNarxi yaxlitlanadi: ${changed} ta variant (qadam ${roundStep} so‘m)`);
  if (samples.length > 0) console.log(`\nNamuna:\n${samples.join('\n')}`);

  if (commit && changed > 0) {
    /*
     * Mahsulotdagi `minPrice`/`maxPrice` variantlardan hisoblanadi va
     * ular katalog filtrida ishlatiladi. Variant narxi o'zgargach
     * ularni yangilamaslik — narx filtri jimgina noto'g'ri ishlashi
     * demak.
     */
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      select: { id: true, variants: { where: { deletedAt: null }, select: { price: true } } },
    });
    for (const p of products) {
      const prices = p.variants.map((x) => x.price);
      if (prices.length === 0) continue;
      await prisma.product.update({
        where: { id: p.id },
        data: {
          minPrice: prices.reduce((a, b) => (a < b ? a : b)),
          maxPrice: prices.reduce((a, b) => (a > b ? a : b)),
        },
      });
    }
    console.log('Mahsulotlardagi narx oralig‘i qayta hisoblandi.');
  }
}

/* ---------------------------------------------------------------- */

try {
  if (!commit) {
    console.log('SINOV REJIMI — hech narsa yozilmaydi. Yozish uchun: --commit\n');
  }
  if (doCopy) await fixCopy();
  if (doPrices) await fixPrices();
  if (!commit) console.log('\nHech narsa o‘zgartirilmadi (--commit berilmagan).');
  else console.log('\nTayyor.');
} finally {
  await prisma.$disconnect();
}
