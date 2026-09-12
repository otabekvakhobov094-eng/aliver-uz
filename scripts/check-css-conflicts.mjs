/**
 * Bir xil selektor `display` ni ikki xil qilib belgilamasin.
 *
 * NEGA. `.alv-pcard__name` ikki joyda e'lon qilingan edi: birinchisi
 * `display: -webkit-box` bilan nomni uch qatorga cheklardi,
 * ikkinchisi esa — 650 qator pastda, butunlay boshqa maqsad uchun —
 * `display: inline-block` qo'yardi. Kaskad ikkinchisini tanlaydi va
 * cheklov JIMGINA bekor bo'ladi: kodda u turadi, brauzerda esa
 * ishlamaydi. Telefonda uzun nom to'qqiz qatorga cho'zilib,
 * ikkita ustun ikki barobar farq qilib ko'rinardi.
 *
 * Bunday to'qnashuvni ko'z bilan topish deyarli imkonsiz: ikkala
 * qoida ham to'g'ri ko'rinadi, faqat ular BIR-BIRIGA qaraydi.
 *
 * Ishlatish: node scripts/check-css-conflicts.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const FILES = [
  'packages/ui/src/components.css',
  'packages/ui/src/tokens.css',
  'packages/ui/src/motion.css',
  'apps/admin/src/app/admin.css',
];

/** Bir-birini bekor qiladigan, xavfli xossalar. */
const WATCH = ['display', 'position', 'overflow'];

const problems = [];

for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const css = fs.readFileSync(file, 'utf8');

  /** selektor → xossa → [{ value, line }] */
  const seen = new Map();

  // Media so'rovlari ichidagi qoidalar ATAYLAB hisobga olinmaydi:
  // ular boshqa kenglik uchun va bir-birini bekor qilishi normal.
  let depth = 0;
  let line = 1;
  let i = 0;

  while (i < css.length) {
    const at = css.indexOf('{', i);
    if (at === -1) break;

    const head = css.slice(i, at);
    line += (head.match(/\n/g) ?? []).length;

    if (/@media|@supports|@keyframes|@font-face|^\s*\d+%/.test(head.trim())) {
      depth += 1;
      i = at + 1;
      continue;
    }

    const end = css.indexOf('}', at);
    if (end === -1) break;
    const body = css.slice(at + 1, end);

    if (depth === 0) {
      for (const selector of head.split(',')) {
        const sel = selector.replace(/\/\*[\s\S]*?\*\//g, '').trim();
        // Faqat oddiy sinf selektorlari: `:hover`, `>` va shu kabilar
        // ataylab boshqa element haqida va to'qnashuv emas.
        if (!/^\.[A-Za-z0-9_-]+$/.test(sel)) continue;

        for (const prop of WATCH) {
          const m = body.match(new RegExp(`(^|;|\\n)\\s*${prop}\\s*:\\s*([^;}]+)`));
          if (!m) continue;
          const value = m[2].trim();
          if (!seen.has(sel)) seen.set(sel, new Map());
          const props = seen.get(sel);
          if (!props.has(prop)) props.set(prop, []);
          props.get(prop).push({ value, line });
        }
      }
    }

    line += (body.match(/\n/g) ?? []).length;
    i = end + 1;
    if (depth > 0 && css.slice(i, i + 200).trimStart().startsWith('}')) {
      depth -= 1;
      i = css.indexOf('}', i) + 1;
    }
  }

  for (const [sel, props] of seen) {
    for (const [prop, list] of props) {
      const values = [...new Set(list.map((v) => v.value))];
      if (values.length > 1) {
        problems.push(
          `${rel}  ${sel} { ${prop} }  —  ${list
            .map((v) => `${v.value} (${v.line}-qator)`)
            .join(' va keyin ')}`,
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error('Bir selektorda qarama-qarshi qoida:\n');
  for (const p of problems) console.error('  ' + p);
  console.error(
    '\nKaskad oxirgisini tanlaydi — oldingisi JIMGINA bekor bo‘ladi.\n' +
      'Ikkala qoidani bitta e’longa birlashtiring.\n',
  );
  process.exit(1);
}

console.log('CSS da qarama-qarshi `display`/`position`/`overflow` yo‘q.');
