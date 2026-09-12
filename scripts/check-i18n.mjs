/**
 * Adminka tarjimasining qoplamasi.
 *
 * Lug'at kaliti — o'zbekcha matnning o'zi, ya'ni tarjimasi yo'q satr
 * ekranda o'zbekcha ko'rinadi va HECH NARSA buzilmaydi. Bu yaxshi
 * xususiyat, lekin yomon tomoni ham bor: yetishmayotgan tarjima
 * o'zini ko'rsatmaydi. Shuning uchun uni shu tekshiruv sanaydi.
 *
 *   node scripts/check-i18n.mjs            # hisobot
 *   node scripts/check-i18n.mjs --strict   # yetishmasa xato qaytaradi
 *
 * Yetishmayotganlari: tmp/i18n-missing.json
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'apps/admin/src');
const strict = process.argv.includes('--strict');

function files(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files(full, out);
    else if (/\.tsx?$/.test(e.name) && !/\.spec\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

/** Modul darajasidagi ro'yxatlardagi ko'rinadigan matnlar. */
const LABEL_KEYS = new Set(['label', 'title', 'hint', 'placeholder', 'description']);
const LABEL_CONSTS = /_(LABEL|LABELS|FILTERS|TABS|SECTIONS|SCOPES|OPTIONS|TONES)$/;

/**
 * Ko'rinadigan matn EMAS: CSS qiymatlari, rang tokenlari, texnik
 * kalitlar. Ular ro'yxatga tushsa tarjima qoplamasi soxta past
 * ko'rinadi va haqiqiy bo'shliqni yashiradi.
 */
const NOT_TEXT =
  /^(var\(|#|rgba?\(|[0-9.]+(px|rem|em|%|fr|vh|vw)?$)|^(center|left|right|nowrap|pre-wrap|break-word|cover|contain|uppercase|lowercase|capitalize|tabular-nums|auto|none|inherit|currentColor|transparent|bold|normal|grid|flex|block|inline|hidden|scroll|wrap|column|row)$/;
const TECH_TOKEN = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/; // product_slug kabi
const TONE_TOKEN = /^(mint|low|neutral|new|sale|danger|warn|ok)$/;

const SKIP = new Set(['product_slug', 'ru-RU', 'uz-UZ', 'en-US', 'UTF-8']);

const used = new Set();

for (const file of files(SRC)) {
  if (file.includes(path.join('lib', 'i18n'))) continue;
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const visit = (node) => {
    // t('...')
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 't' &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      if (!SKIP.has(node.arguments[0].text)) used.add(node.arguments[0].text);
    }

    // const X_LABEL = { A: 'Matn' } / [{ label: 'Matn' }]
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      (LABEL_CONSTS.test(node.name.text) || /^(COLUMNS|SECTIONS|TABS|PERIODS|STATUSES|REASONS)$/.test(node.name.text)) &&
      node.initializer
    ) {
      const grab = (n) => {
        if (ts.isStringLiteral(n)) {
          const v = n.text.trim();
          if (
            /[a-zA-ZʻʼЁёА-я]/.test(v) &&
            v.length > 1 &&
            !NOT_TEXT.test(v) &&
            !TECH_TOKEN.test(v) &&
            !TONE_TOKEN.test(v)
          ) {
            used.add(n.text);
          }
          return;
        }
        if (ts.isPropertyAssignment(n)) {
          const key = n.name.getText(sf).replace(/['"]/g, '');
          if (ts.isStringLiteral(n.initializer)) {
            if (LABEL_KEYS.has(key) || !/^[a-z]+$/.test(key)) grab(n.initializer);
            return;
          }
        }
        ts.forEachChild(n, grab);
      };
      grab(node.initializer);
    }

    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// nav.ts dagi menyu nomlari ham ko'rinadigan matn.
const navFile = path.join(SRC, 'lib/nav.ts');
if (fs.existsSync(navFile)) {
  const text = fs.readFileSync(navFile, 'utf8');
  for (const m of text.matchAll(/label:\s*'([^']+)'/g)) {
    if (m[1].trim().length > 1) used.add(m[1]);
  }
}

const ruFile = path.join(SRC, 'lib/i18n/ru.ts');
const ruText = fs.readFileSync(ruFile, 'utf8');
const sf = ts.createSourceFile(ruFile, ruText, ts.ScriptTarget.Latest, true);
const have = new Set();
const visitRu = (n) => {
  if (ts.isPropertyAssignment(n) && ts.isStringLiteral(n.name)) have.add(n.name.text);
  ts.forEachChild(n, visitRu);
};
visitRu(sf);

const missing = [...used].filter((k) => !have.has(k)).sort();
const stale = [...have].filter((k) => !used.has(k)).sort();

fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tmp/i18n-missing.json'), JSON.stringify(missing, null, 2));

const pct = used.size === 0 ? 100 : Math.round(((used.size - missing.length) / used.size) * 100);
console.log(`Adminka tarjimasi: ${used.size - missing.length}/${used.size} satr (${pct}%).`);
if (stale.length > 0) {
  console.log(`Lug'atda ortiqcha ${stale.length} ta kalit — kodda bunday matn yo‘q.`);
}
if (missing.length > 0) {
  console.log(`Tarjimasiz ${missing.length} ta satr: tmp/i18n-missing.json`);
  if (strict) process.exit(1);
}
