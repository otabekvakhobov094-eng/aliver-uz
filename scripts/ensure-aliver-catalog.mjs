import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const VERSION = 'aliver-official-v2';
const KEY = 'catalog.aliverImport';

if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL yo‘q — ALIVER katalog importi o‘tkazib yuborildi.');
  process.exit(0);
}

const prisma = new PrismaClient();
try {
  const state = await prisma.setting.findUnique({ where: { key: KEY } });
  if (state?.value?.version === VERSION) {
    console.log(`ALIVER katalogi tayyor (${VERSION}).`);
    process.exit(0);
  }
} finally {
  await prisma.$disconnect();
}

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
