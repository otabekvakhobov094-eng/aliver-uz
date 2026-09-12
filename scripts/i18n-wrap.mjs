/**
 * Adminkadagi ko'rinadigan matnlarni `t()` ga o'raydi.
 *
 * NEGA SKRIPT. Panelda 30 dan ortiq sahifa va mingga yaqin matn bor.
 * Ularni qo'lda o'rash bir necha kun oladi va har o'ntasida bittasi
 * unutiladi — natijada panel «yarim ruscha» bo'lib qoladi, bu esa
 * umuman tarjima qilinmaganidan yomonroq.
 *
 * TypeScript ning O'Z parseri ishlatiladi: regex JSX ni to'g'ri
 * o'qiy olmaydi (`{'...'}` , shablon satrlar, ichma-ich qavslar).
 *
 * NIMA O'RALADI:
 *   · JSX matn tugunlari — <b>Saqlash</b>
 *   · ro'yxatdagi atributlar — placeholder, aria-label, title va h.k.
 *
 * NIMA O'RALMAYDI (ataylab):
 *   · modul darajasidagi satrlar — ular import paytida hisoblanadi,
 *     ya'ni til o'rnatilishidan OLDIN; ular chizilgan joyida o'raladi;
 *   · ichida lotin harfi yo'q satrlar (raqam, belgi, manzil);
 *   · `className`, `href`, `key`, `style` kabi texnik atributlar.
 *
 * Ishlatish:
 *   node scripts/i18n-wrap.mjs            # nima o'zgarishini sanaydi
 *   node scripts/i18n-wrap.mjs --write    # yozadi
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'apps/admin/src');
const write = process.argv.includes('--write');

const TEXT_ATTRS = new Set([
  'placeholder',
  'title',
  'aria-label',
  'alt',
  'label',
  'emptyTitle',
  'emptyHint',
  'noResultsTitle',
  'noResultsHint',
  'description',
  'confirmLabel',
  'cancelLabel',
  'submitLabel',
  'hint',
  'legend',
]);

/** Tarjima kerakmi: ichida harf bo'lishi va texnik satr bo'lmasligi kerak. */
function translatable(text) {
  const s = text.trim();
  if (s.length < 2) return false;
  if (!/[a-zA-Zа-яА-ЯʻʼЁё]/.test(s)) return false;
  if (/^[a-z0-9-]+$/.test(s) && !/[aeiou]{2}/.test(s) === false) {
    // slug ko'rinishidagi satrlar (masalan `best-sellers`) tarjima emas
  }
  if (/^https?:\/\//.test(s)) return false;
  if (/^\/[a-z0-9/_*:-]*$/.test(s)) return false;
  if (/^[A-Z_]+$/.test(s)) return false;
  return true;
}

function files(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files(full, out);
    else if (e.name.endsWith('.tsx') && !e.name.endsWith('.spec.tsx')) out.push(full);
  }
  return out;
}

let changedFiles = 0;
let wrapped = 0;
const strings = new Set();

for (const file of files(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  /** @type {Array<{start:number,end:number,replacement:string}>} */
  const edits = [];

  /** Tugun funksiya ichidami — ya'ni chizish paytida bajariladimi. */
  function insideFunction(node) {
    for (let p = node.parent; p; p = p.parent) {
      if (
        ts.isFunctionDeclaration(p) ||
        ts.isArrowFunction(p) ||
        ts.isFunctionExpression(p) ||
        ts.isMethodDeclaration(p)
      ) {
        return true;
      }
    }
    return false;
  }

  function alreadyWrapped(node) {
    const p = node.parent;
    return (
      p &&
      ts.isCallExpression(p) &&
      ts.isIdentifier(p.expression) &&
      p.expression.text === 't'
    );
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      const raw = node.getText();
      const trimmed = raw.trim();
      if (translatable(trimmed) && insideFunction(node)) {
        const lead = raw.slice(0, raw.indexOf(trimmed[0]));
        const tail = raw.slice(raw.indexOf(trimmed[0]) + trimmed.length);
        edits.push({
          start: node.getStart(sf),
          end: node.getEnd(),
          replacement: `${lead}{t(${JSON.stringify(trimmed)})}${tail}`,
        });
        strings.add(trimmed);
        wrapped += 1;
      }
    }

    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText();
      if (TEXT_ATTRS.has(name)) {
        const init = node.initializer;
        if (ts.isStringLiteral(init) && translatable(init.text) && insideFunction(node)) {
          edits.push({
            start: init.getStart(sf),
            end: init.getEnd(),
            replacement: `{t(${JSON.stringify(init.text)})}`,
          });
          strings.add(init.text);
          wrapped += 1;
        } else if (
          ts.isJsxExpression(init) &&
          init.expression &&
          ts.isStringLiteral(init.expression) &&
          translatable(init.expression.text) &&
          insideFunction(node) &&
          !alreadyWrapped(init.expression)
        ) {
          edits.push({
            start: init.expression.getStart(sf),
            end: init.expression.getEnd(),
            replacement: `t(${JSON.stringify(init.expression.text)})`,
          });
          strings.add(init.expression.text);
          wrapped += 1;
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  if (edits.length === 0) continue;

  changedFiles += 1;
  if (!write) continue;

  let out = text;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }

  // `t` importi — bor bo'lsa qo'shilmaydi.
  if (!/from '@\/lib\/i18n'/.test(out)) {
    const firstImport = out.indexOf('import ');
    const lineEnd = out.indexOf('\n', firstImport);
    out = `${out.slice(0, lineEnd + 1)}import { t } from '@/lib/i18n';\n${out.slice(lineEnd + 1)}`;
  }
  fs.writeFileSync(file, out);
}

fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'tmp/i18n-strings.json'),
  JSON.stringify([...strings].sort(), null, 2),
);

console.log(
  `${write ? 'Yozildi' : 'Topildi'}: ${wrapped} ta matn, ${changedFiles} ta faylda, ${strings.size} ta noyob satr.`,
);
console.log('Noyob satrlar: tmp/i18n-strings.json');
