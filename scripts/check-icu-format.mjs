/**
 * `toLocaleDateString` / `toLocaleString` ishlatilmasin.
 *
 * NEGA. Ular Node ning qaysi ICU bilan qurilganiga bog'liq. To'liq
 * ICU bo'lmagan qurilishda o'zbekcha oy nomlari yo'q va sana
 * «2026 M08 14» bo'lib chiqadi — bu aynan adminda ko'rilgan xato
 * edi. Son uchun esa `toLocaleString('ru-RU')` ba'zi qurilishda
 * «279,000» beradi, sayt esa hamma joyda «279 000» yozadi.
 *
 * Xato chiqmaydi: sana ham, son ham bor — faqat ular boshqa tilda
 * yozilgan. Shuning uchun buni faqat tekshiruv topa oladi.
 *
 * O'rniga: `@/lib/format-date` (sayt) yoki `@/lib/order-labels`
 * (adminka).
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIRS = ['apps/web/src', 'apps/admin/src'];

/** Bu fayllarning o'zi formatlagich — ular istisno. */
const ALLOW = new Set([
  'apps/web/src/lib/format-date.ts',
  'apps/admin/src/lib/order-labels.ts',
]);

function files(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files(full, out);
    else if (/\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

const hits = [];

for (const dir of DIRS) {
  const base = path.join(ROOT, dir);
  if (!fs.existsSync(base)) continue;

  for (const file of files(base)) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (ALLOW.has(rel)) continue;

    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const [i, line] of lines.entries()) {
      // Izohdagi eslatma hisobga olinmaydi.
      const code = line.replace(/^\s*(\*|\/\/).*$/, '');
      if (/\.toLocale(Date|Time)?String\s*\(/.test(code)) {
        hits.push(`${rel}:${i + 1}  ${line.trim().slice(0, 80)}`);
      }
    }
  }
}

if (hits.length > 0) {
  console.error('ICU ga bog‘liq formatlash topildi:\n');
  for (const h of hits) console.error('  ' + h);
  console.error(
    '\nBu xato chiqarmaydi — sana shunchaki «2026 M08 14» bo‘lib ko‘rinadi.\n' +
      "O'rniga `@/lib/format-date` (sayt) yoki `@/lib/order-labels` (adminka).\n",
  );
  process.exit(1);
}

console.log('Sana va son formatlari ICU ga bog‘liq emas.');
