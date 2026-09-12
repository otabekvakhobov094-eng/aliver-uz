/**
 * Stubni `node_modules/.prisma/client` ga o'rnatadi.
 *
 * NEGA. `prisma generate` dvigatelni internetdan yuklab oladi. Ba'zi
 * muhitlarda (shu jumladan ishlab chiqish sandboxida) bu yuklab olish
 * bloklangan. O'shanda Prisma o'zining BO'SH o'rindoshini qoldiradi —
 * ichida `export declare const PrismaClient: any` va bitta ham model
 * yo'q. Natijada typecheck hech narsani tekshirmaydi: `prisma.xatoModel`
 * ham, `{ mavjudEmasMaydon: 1 }` ham bemalol o'tib ketadi.
 *
 * Aynan shu sababdan deploy uch marta yiqilgan: xato lokalda emas,
 * Render da topilgan. Bu skript o'sha o'rindoshni sxemadan generatsiya
 * qilingan haqiqiy turlar bilan almashtiradi.
 *
 * HAQIQIY klient bor bo'lsa skript hech narsa qilmaydi. CI va Render da
 * `prisma generate` muvaffaqiyatli o'tadi va o'sha yerda haqiqiy turlar
 * ishlatiladi.
 *
 * Ishlatish: node scripts/prisma-stub-install.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();

/**
 * `.prisma/client` papkasini TOPISH kerak, taxmin qilish emas.
 *
 * Monorepoda `node_modules/@prisma` ko'pincha symlink bo'ladi, Prisma
 * esa turlarni symlink NISHONI yonidagi `.prisma/client` dan o'qiydi.
 * Shuning uchun yo'l `@prisma/client` ning haqiqiy joyidan hisoblanadi,
 * aks holda stub butunlay boshqa papkaga yozilib, hech qachon
 * ishlatilmasdi.
 */
const pkgDir = path.join(ROOT, 'node_modules/@prisma/client');
if (!fs.existsSync(pkgDir)) {
  console.error('node_modules/@prisma/client yo‘q. Avval `npm ci` ni ishga tushiring.');
  process.exit(1);
}
const realPkgDir = fs.realpathSync(pkgDir);
const clientDir = path.join(realPkgDir, '../../.prisma/client');

const PLACEHOLDER = 'export declare const PrismaClient: any';
const MARKER = 'ALIVER-STUB';

const indexDts = path.join(clientDir, 'index.d.ts');
if (fs.existsSync(indexDts)) {
  const head = fs.readFileSync(indexDts, 'utf8');
  if (!head.includes(PLACEHOLDER) && !head.includes(MARKER)) {
    console.log('Haqiqiy Prisma klienti mavjud — stub kerak emas.');
    process.exit(0);
  }
}

const tmp = path.join(ROOT, '.prisma-stub/index.d.ts');
execFileSync(process.execPath, [path.join(ROOT, 'scripts/generate-prisma-stub.mjs'), tmp], {
  stdio: 'inherit',
});

const wrapped = fs.readFileSync(tmp, 'utf8');

// Generator `declare module '@prisma/client' { ... }` qobig'ini yozadi —
// u ambient deklaratsiya uchun. Bu yerda fayl HAQIQIY modul o'rnini
// egallaydi, ya'ni qobiq ortiqcha.
const OPEN = "declare module '@prisma/client' {";
const open = wrapped.indexOf(OPEN);
const close = wrapped.lastIndexOf('}');
if (open === -1 || close === -1 || close < open) {
  console.error('Stub kutilgan ko‘rinishda emas — qobiq topilmadi.');
  process.exit(1);
}
const body = wrapped.slice(open + OPEN.length, close);
const dts = `// ${MARKER}: sandbox uchun sxemadan generatsiya qilingan turlar.\n// Qo‘lda tahrirlamang — manba: apps/api/prisma/schema.prisma\n${body}\n`;

fs.mkdirSync(clientDir, { recursive: true });
for (const name of ['index.d.ts', 'default.d.ts', 'edge.d.ts']) {
  fs.writeFileSync(path.join(clientDir, name), dts);
}

/*
 * Runtime.
 *
 * Bu fayl yuklanganda XATO BERMASLIGI kerak. Testlar `@prisma/client`
 * ni import qiladigan modullarni yuklaydi va import paytida yiqilgan
 * stub butun test to'plamini o'chirib qo'yardi — ya'ni stub tekshiruvni
 * kuchaytirish o'rniga uni yo'q qilardi.
 *
 * Shuning uchun:
 *   — ENUMLAR haqiqiy qiymat bilan beriladi. Kod ularni ishlatadi
 *     (`OrderStatus.CANCELLED`), va ular bo'lmasa testlar `undefined`
 *     bilan jimgina noto'g'ri ishlardi;
 *   — `PrismaClient` esa faqat YARATILGANDA xato beradi. Ya'ni import
 *     o'tadi, haqiqiy bazaga ulanishga urinish esa aniq xabar bilan
 *     to'xtaydi.
 */
const enumLines = [];
for (const m of fs.readFileSync(path.join(ROOT, 'apps/api/prisma/schema.prisma'), 'utf8')
  .matchAll(/^enum\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  const values = m[2]
    .split('\n')
    .map((l) => l.trim().split(/\s|\/\//)[0])
    .filter((l) => /^[A-Za-z_]\w*$/.test(l));
  enumLines.push(
    `exports.${m[1]} = Object.freeze({ ${values.map((v) => `${v}: '${v}'`).join(', ')} });`,
  );
}

const js = `// ALIVER-STUB: sxemadan generatsiya qilingan runtime. Qo'lda tahrirlamang.
class PrismaClient {
  constructor() {
    throw new Error(
      'Prisma klienti generatsiya qilinmagan (stub o‘rnatilgan). Ishga tushirishdan oldin: npm run db:generate'
    );
  }
}
exports.PrismaClient = PrismaClient;
exports.Prisma = { PrismaClientKnownRequestError: class extends Error {} };
${enumLines.join('\n')}
`;
for (const name of ['index.js', 'default.js', 'edge.js', 'index-browser.js']) {
  fs.writeFileSync(path.join(clientDir, name), js);
}

console.log(`Stub o‘rnatildi: ${path.relative(ROOT, clientDir) || clientDir}`);
