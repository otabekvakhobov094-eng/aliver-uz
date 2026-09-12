/**
 * Navigatsiyadagi HAR BIR manzil haqiqiy sahifaga va haqiqiy
 * ma'lumotga olib borishini tekshiradi.
 *
 * NEGA. Menyuga bo'lim qo'shish oson, va u ishlayotganday ko'rinadi.
 * Lekin `?category=tirnoq` degan havola sxemada bunday kategoriya
 * bo'lmasa, foydalanuvchiga BO'SH sahifa beradi — 404 ham emas, xato
 * ham emas, shunchaki hech narsa. Bu turdagi nosozlik o'zini
 * ko'rsatmaydi, shuning uchun uni mashina tekshiradi.
 *
 * Endi menyu bazada va uni admin o'zgartiradi, shuning uchun server
 * ham saqlashdan oldin nishonni tekshiradi (`menu.service.ts`). Bu
 * skript esa kodda qolgan ikki nusxani tekshiradi:
 *
 *   1. SEED menyusi (`prisma/seed-content.ts`) — yangi do'kon shundan
 *      boshlanadi, ya'ni birinchi kun menyusi shu;
 *   2. ZAXIRA menyusi (`apps/web/src/lib/default-menu.ts`) — API
 *      javob bermaganda ko'rinadi.
 *
 * Ikkalasi bir-biriga ham mos bo'lishi kerak: zaxira eskirgan bo'lsa,
 * u aynan eng yomon paytda — API yiqilganda — noto'g'ri menyu
 * ko'rsatadi.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WEB_APP = path.join(ROOT, 'apps/web/src/app/[locale]');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ------------------------------------------------------------------ *
 * 1. Mavjud route'lar
 * ------------------------------------------------------------------ */

function routes(dir, prefix = '') {
  const out = new Set();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      if (entry.name === 'page.tsx') out.add(prefix || '/');
      continue;
    }
    const next = entry.name.startsWith('(') ? prefix : `${prefix}/${entry.name}`;
    for (const r of routes(path.join(dir, entry.name), next)) out.add(r);
  }
  return out;
}

const ROUTES = routes(WEB_APP);

function routeExists(pathname) {
  if (pathname === '' || pathname === '/') return ROUTES.has('/');
  if (ROUTES.has(pathname)) return true;
  const parts = pathname.split('/').filter(Boolean);
  for (const r of ROUTES) {
    const rp = r.split('/').filter(Boolean);
    if (rp.length === parts.length && rp.every((seg, i) => seg === parts[i] || /^\[.+\]$/.test(seg))) {
      return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * 2. Seed'dagi ma'lumot
 * ------------------------------------------------------------------ */

const catalogSeed = read('apps/api/prisma/seed-catalog.ts');
const mainSeed = read('apps/api/prisma/seed.ts');
const contentSeed = read('apps/api/prisma/seed-content.ts');

const categories = new Set([...catalogSeed.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1]));

const collectionsBlock = /const COLLECTIONS[^=]*=\s*\[([\s\S]*?)\];/.exec(catalogSeed)?.[1] ?? '';
const collections = new Set([...collectionsBlock.matchAll(/\['([^']+)'/g)].map((m) => m[1]));

/** slug → nashr qilinganmi. */
const pages = new Map();
const legalBlock = /const pages = \[([\s\S]*?)\];/.exec(mainSeed)?.[1] ?? '';
// Huquqiy sahifalar ataylab nashr qilinmagan: matnini yurist beradi.
for (const m of legalBlock.matchAll(/\['([^']+)'/g)) pages.set(m[1], false);
const contentPagesBlock = /const PAGES: PageSeed\[\] = \[([\s\S]*?)\n\];/.exec(contentSeed)?.[1] ?? '';
for (const m of contentPagesBlock.matchAll(/slug:\s*'([^']+)'/g)) pages.set(m[1], true);

const posts = new Set(
  [...(/const POSTS[^=]*=\s*\[([\s\S]*?)\n\];/.exec(contentSeed)?.[1] ?? '').matchAll(/slug:\s*'([^']+)'/g)].map(
    (m) => m[1],
  ),
);

/* ------------------------------------------------------------------ *
 * 3. Ruxsat etilgan statik yo'llar (server bilan bir xil bo'lishi kerak)
 * ------------------------------------------------------------------ */

const targetSrc = read('apps/api/src/modules/menu/menu-target.ts');
const menuRoutes = new Set(
  [...(/const MENU_ROUTES = \[([\s\S]*?)\] as const;/.exec(targetSrc)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(
    (m) => m[1],
  ),
);

/**
 * Matnini YURIST beradigan sahifalar.
 *
 * Ular seed'da ataylab nashr qilinmagan holda turadi va ularga havola
 * qilish HOZIRCHA to'g'ri: matn kelgan kuni sahifa nashr qilinadi va
 * havola ishlay boshlaydi. O'ylab topilgan matn qo'yish esa do'kon
 * uchun haqiqiy huquqiy xavf.
 *
 * Lekin bu vaqtincha holat sukut bilan o'tib ketmasligi kerak —
 * quyida ular ALOHIDA ro'yxat bo'lib chiqadi va release-check ularni
 * ishga tushirishga to'siq deb hisoblaydi.
 */
const AWAITING_LEGAL = new Set(['public-offer', 'privacy-policy', 'return-policy', 'delivery', 'payment']);

const problems = [];
const pending = [];

// Serverdagi ro'yxatdagi har bir yo'l haqiqatan mavjud bo'lishi kerak.
for (const r of menuRoutes) {
  if (!routeExists(r)) {
    problems.push(`menu-target.ts: MENU_ROUTES da «${r}» bor, lekin bunday sahifa yo'q`);
  }
}

/* ------------------------------------------------------------------ *
 * 4. Seed menyusi
 * ------------------------------------------------------------------ */

/** `{ targetType: 'X', targetValue: 'y' }` juftliklarini ajratish. */
function seedTargets(source, label) {
  const out = [];
  for (const m of source.matchAll(/targetType:\s*'(\w+)'(?:,\s*targetValue:\s*'([^']*)')?/g)) {
    out.push({ type: m[1], value: m[2] ?? '', label });
  }
  return out;
}

const headerBlock = /const HEADER_MENU: MenuSeed\[\] = \[([\s\S]*?)\n\];/.exec(contentSeed)?.[1] ?? '';
const footerBlock = /const FOOTER_MENU: MenuSeed\[\] = \[([\s\S]*?)\n\];/.exec(contentSeed)?.[1] ?? '';
if (!headerBlock) problems.push('seed-content.ts: HEADER_MENU topilmadi');
if (!footerBlock) problems.push('seed-content.ts: FOOTER_MENU topilmadi');

for (const t of [...seedTargets(headerBlock, 'seed HEADER'), ...seedTargets(footerBlock, 'seed FOOTER')]) {
  switch (t.type) {
    case 'HOME':
      break;
    case 'ROUTE':
      if (!menuRoutes.has(t.value)) {
        problems.push(`${t.label}: «${t.value}» — MENU_ROUTES ro'yxatida yo'q, server uni rad etadi`);
      }
      break;
    case 'CATEGORY':
      if (!categories.has(t.value)) {
        problems.push(`${t.label}: «${t.value}» kategoriyasi seed'da yo'q — sahifa BO'SH chiqadi`);
      }
      break;
    case 'COLLECTION':
      if (!collections.has(t.value)) {
        problems.push(`${t.label}: «${t.value}» kolleksiyasi seed'da yo'q — sahifa BO'SH chiqadi`);
      }
      break;
    case 'PAGE':
      if (!pages.has(t.value)) problems.push(`${t.label}: «${t.value}» sahifasi seed'da yo'q`);
      else if (!pages.get(t.value)) {
        problems.push(
          `${t.label}: «${t.value}» sahifasi NASHR QILINMAGAN — server bu bandni saqlashga ruxsat bermaydi`,
        );
      }
      break;
    case 'BLOG':
      if (t.value && !posts.has(t.value)) problems.push(`${t.label}: «${t.value}» maqolasi seed'da yo'q`);
      break;
    case 'URL':
      if (!/^https?:\/\//.test(t.value)) problems.push(`${t.label}: «${t.value}» — http(s) bo'lishi kerak`);
      break;
    default:
      problems.push(`${t.label}: noma'lum nishon turi «${t.type}»`);
  }
}

/* ------------------------------------------------------------------ *
 * 5. Zaxira menyusi — yo'llari mavjudmi va seed bilan mos keladimi
 * ------------------------------------------------------------------ */

const fallbackSrc = read('apps/web/src/lib/default-menu.ts');
const fallbackHrefs = [...fallbackSrc.matchAll(/n\(\s*'([^']*)',\s*'[^']*',\s*'([^']*)'/g)].map((m) => ({
  labelUz: m[1],
  href: m[2],
}));

for (const { labelUz, href } of fallbackHrefs) {
  if (/^https?:\/\//.test(href)) continue;
  const [pathname, query] = href.split('?');
  if (!routeExists(pathname)) {
    problems.push(`default-menu.ts: «${labelUz}» → «${href}» — bunday sahifa yo'q`);
    continue;
  }
  if (query) {
    const params = new URLSearchParams(query);
    const cat = params.get('category');
    if (cat && !categories.has(cat)) {
      problems.push(`default-menu.ts: «${labelUz}» → «${cat}» kategoriyasi seed'da yo'q`);
    }
    const col = params.get('collection');
    if (col && !collections.has(col)) {
      problems.push(`default-menu.ts: «${labelUz}» → «${col}» kolleksiyasi seed'da yo'q`);
    }
  }
  const pm = /^\/sahifa\/([a-z0-9-]+)$/.exec(pathname);
  if (pm && !pages.get(pm[1])) {
    problems.push(`default-menu.ts: «${labelUz}» → «${pm[1]}» sahifasi nashr qilinmagan yoki yo'q`);
  }
}

// Ikki ro'yxatdagi yorliqlar bir xilmi.
const seedLabels = (block) => [...block.matchAll(/labelUz:\s*'([^']*)'/g)].map((m) => m[1]);
const seedAll = [...seedLabels(headerBlock), ...seedLabels(footerBlock)];
const fallbackLabels = fallbackHrefs.map((f) => f.labelUz);
for (const l of seedAll) {
  if (!fallbackLabels.includes(l)) {
    problems.push(`default-menu.ts: seed'da «${l}» bandi bor, zaxirada yo'q — zaxira eskirgan`);
  }
}
for (const l of fallbackLabels) {
  if (!seedAll.includes(l)) {
    problems.push(`seed-content.ts: zaxirada «${l}» bandi bor, seed'da yo'q`);
  }
}


/* ------------------------------------------------------------------ *
 * 6. Admin panel sidebar — har bir bo'lim sahifasi bormi
 * ------------------------------------------------------------------ */

const adminRoutes = routes(path.join(ROOT, 'apps/admin/src/app'));
const adminNav = read('apps/admin/src/lib/nav.ts');
for (const m of adminNav.matchAll(/href:\s*'([^']+)',\s*label:\s*'([^']+)'/g)) {
  const [, href, label] = m;
  const pathname = href.split('#')[0];
  if (!adminRoutes.has(pathname === '' ? '/' : pathname)) {
    problems.push(`admin nav.ts: «${label}» → «${href}» — admin panelda bunday sahifa yo'q`);
  }
}


/* ------------------------------------------------------------------ *
 * 7. Sayt bo'ylab qattiq yozilgan ichki havolalar
 * ------------------------------------------------------------------ *
 *
 * Menyu endi ma'lumot, lekin sahifalarning ICHIDA ham havolalar bor —
 * bosh sahifadagi «Batafsil bilish» kabi. Ular ham xuddi shu tarzda
 * buzilishi mumkin: bosh sahifada `/sahifa/biz-haqimiz` degan havola
 * turgan edi, bunday sahifa esa umuman yo'q — bosilganda 404 berardi
 * va buni hech narsa ko'rsatmasdi.
 */

function walkTsx(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsx(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

for (const file of walkTsx(path.join(ROOT, 'apps/web/src'))) {
  const rel = path.relative(ROOT, file);
  if (rel.endsWith('lib/default-menu.ts')) continue; // yuqorida tekshirildi
  // Izohlar havola emas: bu fayldagi tushuntirishda ham `/sahifa/...`
  // yozilgan bo'lishi mumkin va uni havola deb hisoblash yolg'on xato.
  const text = fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  for (const m of text.matchAll(/\/sahifa\/([a-z0-9-]+)/g)) {
    const slug = m[1];
    if (!pages.has(slug)) {
      problems.push(`${rel}: «/sahifa/${slug}» — seed'da bunday sahifa yo'q`);
    } else if (!pages.get(slug)) {
      const line = `${rel}: «/sahifa/${slug}»`;
      if (AWAITING_LEGAL.has(slug)) pending.push(line);
      else problems.push(`${line} — sahifa nashr qilinmagan, havola 404 beradi`);
    }
  }

  for (const m of text.matchAll(/[?&]category=([a-z0-9-]+)/g)) {
    if (!categories.has(m[1])) {
      problems.push(`${rel}: «?category=${m[1]}» — seed'da bunday kategoriya yo'q`);
    }
  }
  for (const m of text.matchAll(/[?&]collection=([a-z0-9-]+)/g)) {
    if (!collections.has(m[1])) {
      problems.push(`${rel}: «?collection=${m[1]}» — seed'da bunday kolleksiya yo'q`);
    }
  }
}

/* ------------------------------------------------------------------ */

if (problems.length > 0) {
  console.error(`\nNavigatsiyada ${problems.length} ta nomuvofiqlik:\n`);
  for (const p of problems) console.error('  ' + p);
  console.error('');
  process.exit(1);
}

if (pending.length > 0) {
  console.log(
    `\nYurist matnini kutayotgan ${pending.length} ta havola (ishga tushirishdan oldin nashr qilinishi shart):\n`,
  );
  for (const p of [...new Set(pending)]) console.log('  ' + p);
  console.log('');
}

console.log(
  `Navigatsiya butun: ${seedAll.length} ta seed bandi, ${fallbackHrefs.length} ta zaxira bandi, ` +
    `${ROUTES.size} ta route tekshirildi.`,
);
