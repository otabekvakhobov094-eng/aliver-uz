/**
 * Saytda QATTIQ yozilgan kategoriya va kolleksiya slug'lari haqiqatan
 * yaratiladimi.
 *
 * NEGA. Bosh sahifadagi to'rtta plitka, «Vosita tanlagich», landing
 * sahifalar va zaxira menyu kategoriya slug'ini kodda saqlaydi. Agar
 * katalogni to'ldiruvchi tomon (importer yoki seed) boshqa slug
 * yozsa, plitka BO'SH sahifaga olib boradi — 404 ham bermaydi,
 * shunchaki «mahsulot topilmadi» deb turadi va buni hech kim
 * nosozlik deb aytmaydi.
 *
 * Aynan shu bo'lgan edi: importer `hair-care`, `skin-care` yozardi,
 * sayt esa `soch-parvarishi`, `yuz-parvarishi` ni kutardi.
 *
 * Ishlatish: node scripts/check-catalog-slugs.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/** Katalogni to'ldiradigan manbalardagi slug'lar. */
function producedSlugs() {
  const files = [
    'apps/api/src/modules/import/shopify-catalog.util.ts',
    'apps/api/prisma/seed-catalog.ts',
  ];
  const out = new Set();
  for (const f of files) {
    const full = path.join(ROOT, f);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const m of text.matchAll(/slug:\s*'([a-z0-9-]+)'/g)) out.add(m[1]);
    // seed-catalog kolleksiyalari massiv ko'rinishida: ['best-sellers', …]
    for (const m of text.matchAll(/\[\s*'([a-z0-9-]+)',\s*'[^']*',\s*'[^']*'\s*\]/g)) out.add(m[1]);
    // `TAGS` ro'yxati ham shu ko'rinishda — tegning slugi birinchi.
  }
  return out;
}

/** Saytda qattiq yozilgan slug'lar. */
function expectedSlugs() {
  const found = new Map();
  const add = (slug, where) => {
    if (!found.has(slug)) found.set(slug, new Set());
    found.get(slug).add(where);
  };

  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(e.name) && !/\.spec\./.test(e.name)) {
        const text = fs.readFileSync(full, 'utf8');
        const rel = path.relative(ROOT, full);
        for (const m of text.matchAll(/category[=:]\s*'([a-z0-9-]+)'/g)) add(m[1], rel);
        for (const m of text.matchAll(/[?&]category=([a-z0-9-]+)/g)) add(m[1], rel);
        for (const m of text.matchAll(/collection[=:]\s*'([a-z0-9-]+)'/g)) add(m[1], rel);
        for (const m of text.matchAll(/[?&]collection=([a-z0-9-]+)/g)) add(m[1], rel);
        // Teglar ham xuddi shunday: yo'q teg bo'sh natija beradi.
        for (const m of text.matchAll(/tags[=:]\s*'([a-z0-9-]+)'/g)) add(m[1], rel);
        for (const m of text.matchAll(/[?&]tags=([a-z0-9-]+)/g)) add(m[1], rel);
      }
    }
  };
  walk(path.join(ROOT, 'apps/web/src'));
  return found;
}

const produced = producedSlugs();
const expected = expectedSlugs();

const missing = [...expected.entries()].filter(([slug]) => !produced.has(slug));

if (missing.length > 0) {
  console.error('Saytda kutilgan, lekin katalogda YARATILMAYDIGAN slug:\n');
  for (const [slug, where] of missing) {
    console.error(`  «${slug}»  —  ${[...where].join(', ')}`);
  }
  console.error(
    '\nBunday havola 404 bermaydi: u BO‘SH sahifa ochadi va nosozlik ko‘rinmaydi.',
  );
  console.error(
    'Yo tasnifga (`TAXONOMY` / `seed-catalog.ts`) qo‘shing, yo saytdagi slug‘ni to‘g‘rilang.',
  );
  process.exit(1);
}

console.log(
  `Katalog slug‘lari joyida: saytda ${expected.size} ta, katalogda ${produced.size} ta slug tekshirildi.`,
);
