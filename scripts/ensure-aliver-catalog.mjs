/**
 * Deploy paytida katalogni joyiga keltiradi.
 *
 * Bu skript API ishga tushishidan OLDIN ishlaydi (`prestart`), ya'ni
 * buyruq satridan hech narsa terish shart emas. Bu ataylab: do'kon
 * egasining kompyuterida Node.js o'rnatilmagan bo'lishi mumkin va
 * bazani tuzatish uchun uni o'rnatishga majbur qilish noto'g'ri
 * bo'lardi.
 *
 * Ikki bosqich:
 *
 *   1. SLUG'LAR — har deployda, arzon va idempotent. Eski inglizcha
 *      slug'lar qayta nomlanadi va sayt talab qiladigan kategoriyalar
 *      yaratiladi. Bu bosqich versiyaga BOG'LIQ EMAS: menyu va bosh
 *      sahifa plitkalari shularga tayanadi.
 *
 *   2. IMPORT — faqat versiya o'zgarganda. 556 ta mahsulotni har
 *      deployda qayta yozish ma'nosiz va sekin.
 *
 * DIQQAT: import mahsulot NOMI va TAVSIFINI manbadan qayta yozadi.
 * Adminda qo'lda tahrirlangan nom keyingi versiya importida
 * yo'qoladi. Qoldiqqa tegilmaydi — u xodim kiritadigan ma'lumot.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { ensureCatalogSlugs } from './lib/catalog-slugs.mjs';

/*
 * v3 — tasnif sayt kutgan o'zbekcha slug'larga o'tdi, teri yuz va
 * tanaga ajratildi, teglar qo'shildi (usiz «Vosita tanlash» hech
 * qachon natija bermasdi), nom va tavsif manbadan to'g'ri olinadi,
 * narx yaxlitlanadi, variant nomi tozalanadi.
 */
const VERSION = 'aliver-official-v3';
const KEY = 'catalog.aliverImport';

if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL yo‘q — ALIVER katalog importi o‘tkazib yuborildi.');
  process.exit(0);
}

let needsImport = true;
const prisma = new PrismaClient();
try {
  console.log('Katalog slug‘lari tekshirilmoqda...');
  const { renamed, created } = await ensureCatalogSlugs(prisma);
  if (renamed === 0 && created === 0) console.log('  slug‘lar joyida');

  const state = await prisma.setting.findUnique({ where: { key: KEY } });
  if (state?.value?.version === VERSION) {
    console.log(`ALIVER katalogi tayyor (${VERSION}).`);
    needsImport = false;
  }
} finally {
  await prisma.$disconnect();
}

if (!needsImport) process.exit(0);

const rate = process.env.ALIVER_USD_TO_UZS ?? '11783.47';
const importer = fileURLToPath(new URL('./import-aliver-shopify.mjs', import.meta.url));
console.log(`ALIVER rasmiy katalogi import qilinmoqda (${VERSION})...`);

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [
    importer,
    '--commit',
    `--usd-to-uzs=${rate}`,
  ], { stdio: 'inherit', env: process.env });
  child.once('error', reject);
  child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Katalog importi ${code} kodi bilan tugadi`)));
});

const completed = new PrismaClient();
try {
  await completed.setting.upsert({
    where: { key: KEY },
    update: { value: { version: VERSION, source: 'https://www.aliver.com', importedAt: new Date().toISOString() } },
    create: { key: KEY, value: { version: VERSION, source: 'https://www.aliver.com', importedAt: new Date().toISOString() } },
  });
} finally {
  await completed.$disconnect();
}
