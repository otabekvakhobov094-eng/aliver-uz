/**
 * Har bir sahifada SARLAVHA va FOOTER borligini tekshiradi.
 *
 * NEGA. Kabinetning «Ballar» sahifasida ular tushib qolgan edi:
 * sahifa ochilardi, xato bermasdi, shunchaki sayt chrome'isiz —
 * matn ekranning burchagiga yopishib turardi. Foydalanuvchi buni
 * «sahifa kattalashib ketdi» deb ko'rdi, va u haq edi.
 *
 * Bunday xatoni ko'z bilan faqat o'sha sahifani ochgandagina
 * payqaysan. Sahifalar esa yigirmatadan ko'p.
 *
 * Tekshiruv MANBA matnida bajariladi — brauzer kerak emas, ya'ni u
 * tez va CI da har doim ishlaydi.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP = path.join(ROOT, 'apps/web/src/app/[locale]');

/**
 * Chrome talab QILINMAYDIGAN sahifalar.
 *
 * Har biri uchun sabab yozilgan. Sababsiz istisno — kelajakdagi xato:
 * kimdir ro'yxatga qo'shib qo'yadi va tekshiruv jim bo'lib qoladi.
 */
const EXEMPT = new Map([
  ['/kirish', 'Kirish ekrani: ataylab yalang‘och, diqqatni bo‘lmaydi'],
  ['/tolov/maket', 'To‘lov tizimi maketi: tashqi sahifani taqlid qiladi'],
]);

function pages(dir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...pages(full, entry.name.startsWith('(') ? prefix : `${prefix}/${entry.name}`));
    } else if (entry.name === 'page.tsx') {
      out.push({ route: prefix || '/', file: full });
    }
  }
  return out;
}

const problems = [];

for (const { route, file } of pages(APP)) {
  if (EXEMPT.has(route)) continue;
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);

  const missing = [];
  if (!/<SiteHeader\b/.test(text)) missing.push('SiteHeader');
  if (!/<SiteFooter\b/.test(text)) missing.push('SiteFooter');
  // `alv-page` — sahifa kengligi va yon bo'shliqlarini beradigan
  // konteyner. Usiz matn ekran chetiga yopishadi.
  if (!/alv-page/.test(text)) missing.push('alv-page konteyneri');

  if (missing.length > 0) {
    problems.push(`${route}  (${rel})\n      yetishmayapti: ${missing.join(', ')}`);
  }
}

if (problems.length > 0) {
  console.error(`\n${problems.length} ta sahifada sayt chrome'i to'liq emas:\n`);
  for (const p of problems) console.error('  ' + p);
  console.error(
    '\nSahifa ochiladi va xato bermaydi — shunchaki sarlavhasiz ko\'rinadi.\n' +
      "Ataylab shunday bo'lsa, sababi bilan `EXEMPT` ro'yxatiga qo'shing.\n",
  );
  process.exit(1);
}

console.log(`Sayt chrome'i butun: ${pages(APP).length} ta sahifa tekshirildi.`);
