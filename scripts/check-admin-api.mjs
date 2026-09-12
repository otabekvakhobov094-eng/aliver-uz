/**
 * Adminka chaqiradigan har bir API yo'li serverda bormi.
 *
 * NEGA. «Kolleksiyalar» bo'limi butunlay ishlamasdi: adminka
 * `/admin/collections` ga borardi, server esa o'sha yo'lni
 * `/admin/catalog/collections` da e'lon qilgan. Ekranda «Cannot GET
 * /api/admin/collections» chiqardi — ya'ni bo'limni ochmaguncha
 * hech narsa bilinmasdi.
 *
 * Bunday xato typecheck ham, testlar ham ushlay olmaydi: ikki tomon
 * bir-birini FAQAT satr orqali biladi. Shuning uchun bu tekshiruv
 * ikkala tomondagi satrlarni yig'ib solishtiradi.
 *
 * Ishlatish: node scripts/check-admin-api.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/* ---------- serverdagi yo'llar ---------- */

function controllerFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) controllerFiles(full, out);
    else if (entry.name.endsWith('.controller.ts')) out.push(full);
  }
  return out;
}

/** `:id` kabi parametrlarni bitta belgiga keltiradi. */
const normalise = (p) =>
  `/${p}`
    .replace(/\/+/g, '/')
    .replace(/\/:[^/]+/g, '/*')
    .replace(/\/$/, '') || '/';

const serverRoutes = new Set();

for (const file of controllerFiles(path.join(ROOT, 'apps/api/src'))) {
  const text = fs.readFileSync(file, 'utf8');

  /*
   * BITTA FAYLDA BIR NECHTA KONTROLLER bo'lishi mumkin — masalan
   * mijoz uchun `gift-cards` va admin uchun `admin/gift-cards`.
   * Fayldagi birinchi `@Controller` ni olib, hamma yo'lni unga
   * bog'lash noto'g'ri natija beradi, shuning uchun har bir metod
   * o'zidan OLDINGI eng yaqin `@Controller` ga bog'lanadi.
   */
  const bases = [...text.matchAll(/@Controller\(\s*'([^']*)'\s*\)/g)].map((m) => ({
    at: m.index ?? 0,
    base: m[1],
  }));
  if (bases.length === 0) continue;

  for (const m of text.matchAll(/@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)')?\s*\)/g)) {
    const at = m.index ?? 0;
    let base = bases[0].base;
    for (const b of bases) if (b.at < at) base = b.base;
    serverRoutes.add(normalise(`${base}/${m[2] ?? ''}`));
  }
}

/* ---------- adminka chaqiradigan yo'llar ---------- */

const clientFile = path.join(ROOT, 'apps/admin/src/lib/api.ts');
const client = fs.readFileSync(clientFile, 'utf8');

/**
 * Shablon satrni TO'LIQ oladi.
 *
 * Oddiy regex `${days ? 'a' : ''}` ichidagi tirnoqda to'xtab qolardi
 * va yo'l yarim o'qilib, soxta xato berardi. Shuning uchun ochilish
 * belgisidan boshlab qavslar sanab boriladi.
 */
function readLiteral(text, start) {
  const quote = text[start];
  let out = '';
  let depth = 0;
  for (let i = start + 1; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '\\') {
      i += 1;
      continue;
    }
    if (quote === '`' && ch === '$' && text[i + 1] === '{') {
      depth += 1;
      i += 1;
      out += '*';
      continue;
    }
    if (depth > 0) {
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
      continue;
    }
    if (ch === quote) return out;
    out += ch;
  }
  return out;
}

const calls = [];
/*
 * Tur ko'rsatkichi MAJBURIY emas: `request('/admin/me')` ham chaqiruv.
 * Ilgari regex `request<...>(` ni talab qilardi va turi yozilmagan
 * chaqiruvlar tekshiruvdan butunlay chetda qolardi.
 */
for (const m of client.matchAll(/\brequest(?:<[\s\S]*?>)?\(\s*(['`])/g)) {
  calls.push(readLiteral(client, (m.index ?? 0) + m[0].length - 1));
}
// To'g'ridan-to'g'ri `fetch(`${apiBase()}/admin/...`)`
for (const m of client.matchAll(/apiBase\(\)\}/g)) {
  const from = (m.index ?? 0) + m[0].length;
  const end = client.indexOf('`', from);
  if (end !== -1) {
    calls.push(`/${client.slice(from, end).replace(/\$\{[^}]*\}/g, '*').replace(/^\/+/, '')}`);
  }
}

/**
 * Chaqiruv yo'lini serverdagi shaklga keltiradi: so'rov parametrlari
 * olib tashlanadi, `${...}` esa `*` ga aylanadi.
 */
function toPattern(raw) {
  return normalise(
    raw
      .split('?')[0]
      .replace(/\$\{[^}]*\}/g, '*')
      // Segment OXIRIGA yopishgan yulduz — bu so'rov parametri
      // (`?days=...`) bo'lgan, ya'ni yo'lning qismi emas.
      .replace(/([^/])\*+/g, '$1')
      .replace(/\/\*+/g, '/*'),
  );
}

/**
 * Yo'l mos keladimi.
 *
 * Ikkala tomonda ham `*` bor va ular BOSHQACHA ma'noda: serverda bu
 * `:id` kabi parametr, adminkada esa `${section}` kabi o'zgaruvchi —
 * u `pages`, `blog` yoki `banners` bo'lishi mumkin. Shuning uchun
 * oddiy tenglik yetarli emas: server yo'li naqsh sifatida, adminka
 * yo'li esa aniq qiymat sifatida solishtiriladi.
 */
/**
 * Segmentma-segment solishtirish.
 *
 * `*` IKKALA tomonda ham bo'lishi mumkin va ikkalasi ham «istalgan
 * bitta segment» degani: serverda bu `:id`, adminkada esa
 * `${section}` — u `pages`, `blog` yoki `banners` bo'ladi. Shuning
 * uchun moslik ikki tomonlama tekshiriladi.
 *
 * Tekshiruvning kuchi shundan kelib chiqadi: yulduzcha faqat
 * o'zgaruvchi bo'lgan joyda paydo bo'ladi, qolgan segmentlar esa
 * aniq solishtiriladi — `/admin/collections` va
 * `/admin/catalog/collections` mos kelmaydi.
 */
const serverSegments = [...serverRoutes].map((r) => r.split('/'));
const matchesServer = (pattern) => {
  const want = pattern.split('/');
  return serverSegments.some(
    (have) =>
      have.length === want.length &&
      have.every((seg, i) => seg === want[i] || seg === '*' || want[i] === '*'),
  );
};

const problems = [];
const checked = new Set();

for (const raw of calls) {
  if (!raw.startsWith('/')) continue;
  const pattern = toPattern(raw);
  if (checked.has(pattern)) continue;
  checked.add(pattern);
  if (pattern === '/' || pattern === '/*') continue;
  if (!matchesServer(pattern)) problems.push({ raw, pattern });
}

/* ---------- natija ---------- */

if (problems.length > 0) {
  console.error('Adminka mavjud bo‘lmagan API yo‘liga murojaat qilmoqda:\n');
  for (const p of problems) {
    console.error(`  «${p.raw}»  →  ${p.pattern}`);
    const near = [...serverRoutes]
      .filter((r) => r.split('/').pop() === p.pattern.split('/').pop())
      .slice(0, 3);
    if (near.length > 0) console.error(`      shunga o‘xshash: ${near.join(', ')}`);
  }
  console.error(
    `\nJami ${problems.length} ta. Bunday xato faqat bo‘limni ochganda ko‘rinadi.`,
  );
  process.exit(1);
}

/* ---------- teskari yo'nalish ---------- */

/*
 * Serverda bor, lekin adminka HECH QACHON chaqirmaydigan `admin/…`
 * yo'llari.
 *
 * NEGA. Aynan shunday bo'shliq sessiyani 15 daqiqada o'ldirgan edi:
 * server refresh tokenini berardi, saqlardi — va uni ishlatadigan
 * yo'l hech kim tomonidan chaqirilmasdi. Bunday «unutilgan imkoniyat»
 * na typecheck, na testda ko'rinadi.
 *
 * Bu RO'YXAT, xato emas: ba'zi yo'llar ataylab skript yoki webhook
 * uchun turadi. Shuning uchun natijani buzmaydi.
 */
const callPatterns = [...checked];
const calledByAdmin = (route) => {
  const have = route.split('/');
  return callPatterns.some(
    (p) =>
      p.split('/').length === have.length &&
      p.split('/').every((seg, i) => seg === have[i] || seg === '*' || have[i] === '*'),
  );
};

/**
 * Adminka ataylab chaqirmaydigan yo'llar — sababi bilan.
 *
 * Ro'yxatga qo'shish SABAB YOZISHNI talab qiladi: aks holda bu
 * tekshiruv «hammasini ro'yxatga qo'shib qo'yamiz» ga aylanadi va
 * unutilgan imkoniyatni ko'rsatmay qo'yadi.
 */
const SCRIPT_ONLY = new Map([
  ['/admin/auth/refresh', 'brauzer 401 dan keyin o‘zi chaqiradi, `request` orqali emas'],
  ['/admin/uzum/sync/push', 'Uzum yozish API si ulanmagan — kalit va hujjat kelgach'],
  ['/admin/audit/record/*', 'yozuv tarixi — mahsulot/buyurtma sahifasiga qo‘shiladi'],
  ['/admin/catalog/products/*/recompute', 'texnik amal: narx va qidiruv maydonlarini qayta hisoblash'],
  ['/admin/fiscal/receipts/*', 'bitta chek tafsiloti — ro‘yxatdagi ma’lumot hozircha yetarli'],
  ['/admin/import/products/history', 'import tarixi ekrani hali yozilmagan'],
  ['/admin/payments/*/webhooks', 'to‘lov webhook jurnali ekrani hali yozilmagan'],
]);
const orphans = [...serverRoutes]
  .filter((r) => r.startsWith('/admin/'))
  .filter((r) => !SCRIPT_ONLY.has(r))
  .filter((r) => !calledByAdmin(r))
  .sort();

if (orphans.length > 0) {
  console.log(`Adminka chaqirmaydigan server yo‘llari (${orphans.length} ta):`);
  for (const r of orphans) console.log(`  · ${r}`);
  console.log('  Yo bo‘lim yozilmagan, yo yo‘l ortiqcha.');
}

console.log(
  `Adminka API yo‘llari joyida: ${checked.size} ta chaqiruv, ${serverRoutes.size} ta server yo‘li tekshirildi.`,
);
