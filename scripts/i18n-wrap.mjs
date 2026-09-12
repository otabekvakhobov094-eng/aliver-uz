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

/** Ko'rinadigan matn EMAS — ustun nomi, til kodi va shu kabilar. */
const SKIP = new Set(['product_slug', 'ru-RU', 'uz-UZ', 'en-US', 'UTF-8']);

/** Tarjima kerakmi: ichida harf bo'lishi va texnik satr bo'lmasligi kerak. */
function translatable(text) {
  const s = text.trim();
  if (s.length < 2) return false;
  if (SKIP.has(s)) return false;
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

  /**
   * Yaqin atrofda `t` nomli o'zgaruvchi bormi.
   *
   * `templates.map((t) => …)` kabi joyda `t` — shablon obyekti, ya'ni
   * o'sha blok ichida tarjima funksiyasi KO'RINMAYDI. Bunday joyni
   * o'rash kodni buzadi, shuning uchun u chetlab o'tiladi.
   */
  function shadowed(node) {
    for (let p = node.parent; p; p = p.parent) {
      const params =
        ts.isArrowFunction(p) || ts.isFunctionExpression(p) || ts.isFunctionDeclaration(p)
          ? p.parameters
          : null;
      if (params?.some((prm) => ts.isIdentifier(prm.name) && prm.name.text === 't')) return true;
      if (
        ts.isVariableDeclaration(p) &&
        ts.isIdentifier(p.name) &&
        p.name.text === 't'
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Solishtirish operandi — bu MATN emas, KALIT.
   *
   *   {tab === 'methods' ? … }
   *   {typeof hint === 'string' ? … }
   *
   * Uni o'rash kodni buzadi: rus tilida `t('methods')` boshqa satr
   * qaytarsa shart hech qachon bajarilmaydi.
   */
  function isComparisonOperand(node) {
    const p = node.parent;
    if (!p || !ts.isBinaryExpression(p)) return false;
    const k = p.operatorToken.kind;
    return (
      k === ts.SyntaxKind.EqualsEqualsEqualsToken ||
      k === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
      k === ts.SyntaxKind.EqualsEqualsToken ||
      k === ts.SyntaxKind.ExclamationEqualsToken
    );
  }

  /** Uslub obyektining qiymati — matn emas. */
  function inStyleObject(node) {
    for (let p = node.parent; p; p = p.parent) {
      if (ts.isPropertyAssignment(p)) return true;
      if (ts.isJsxExpression(p)) return false;
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
      if (translatable(trimmed) && insideFunction(node) && !shadowed(node)) {
        const lead = raw.slice(0, raw.indexOf(trimmed[0]));
        const tail = raw.slice(raw.indexOf(trimmed[0]) + trimmed.length);
        // Ichki bo'shliqlar bitta probelga keltiriladi: lug'at kaliti
        // kodning qatorga bo'linishiga bog'liq bo'lmasligi kerak.
        const key = trimmed.replace(/\s+/g, ' ');
        edits.push({
          start: node.getStart(sf),
          end: node.getEnd(),
          replacement: `${lead}{t(${JSON.stringify(key)})}${tail}`,
        });
        strings.add(key);
        wrapped += 1;
      }
    }

    /*
     * Modul darajasidagi ro'yxatlardan kelgan matn.
     *
     * `STATUS_LABEL`, `TYPE_LABEL`, `TABS`, `COLUMNS` kabi ro'yxatlar
     * fayl boshida, import paytida hisoblanadi — ya'ni til hali
     * o'rnatilmagan. Shuning uchun ular CHIZILGAN joyida o'raladi.
     */
    if (ts.isJsxExpression(node) && node.expression && !shadowed(node)) {
      const e = node.expression;
      const isLabelMap =
        ts.isElementAccessExpression(e) &&
        ts.isIdentifier(e.expression) &&
        /_LABELS?$/.test(e.expression.text);
      const isLabelProp =
        ts.isPropertyAccessExpression(e) && e.name.text === 'label' && ts.isIdentifier(e.expression);
      const isLabelFallback =
        ts.isBinaryExpression(e) &&
        e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken &&
        ts.isElementAccessExpression(e.left) &&
        ts.isIdentifier(e.left.expression) &&
        /_LABELS?$/.test(e.left.expression.text);

      if ((isLabelMap || isLabelProp || isLabelFallback) && insideFunction(node)) {
        edits.push({
          start: e.getStart(sf),
          end: e.getEnd(),
          replacement: `t(${e.getText(sf)})`,
        });
        wrapped += 1;
      }
    }

    /*
     * JSX ichidagi IFODA ichida turgan satr.
     *
     *   {busy ? 'Kirilmoqda…' : 'Kirish'}
     *   {items.length === 0 ? 'Bo‘sh' : null}
     *
     * Bunday satr matn tuguni emas, shuning uchun yuqoridagi qoidalar
     * uni ko'rmaydi — natijada kirish tugmasi ruscha ekranda
     * o'zbekcha qolib ketgan edi. Faqat BOLA ifodalar olinadi:
     * atribut ichidagi `style={{ color: 'var(--x)' }}` ga tegilmaydi.
     */
    if (
      ts.isJsxExpression(node) &&
      node.expression &&
      node.parent &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) &&
      !shadowed(node)
    ) {
      const walk = (n) => {
        if (ts.isStringLiteral(n)) {
          if (
            translatable(n.text) &&
            !alreadyWrapped(n) &&
            !inStyleObject(n) &&
            !isComparisonOperand(n)
          ) {
            edits.push({
              start: n.getStart(sf),
              end: n.getEnd(),
              replacement: `t(${JSON.stringify(n.text)})`,
            });
            strings.add(n.text);
            wrapped += 1;
          }
          return;
        }
        // JSX ichidagi JSX o'z qoidalari bo'yicha ishlansin.
        if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) return;
        ts.forEachChild(n, walk);
      };
      walk(node.expression);
    }

    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText();
      if (TEXT_ATTRS.has(name)) {
        const init = node.initializer;
        if (
          ts.isStringLiteral(init) &&
          translatable(init.text) &&
          insideFunction(node) &&
          !shadowed(node)
        ) {
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
          !shadowed(node) &&
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

  // `t` importi.
  const existing = out.match(/import \{([^}]*)\} from '@\/lib\/i18n';/);
  if (existing) {
    if (!/\bt\b/.test(existing[1])) {
      out = out.replace(existing[0], `import {${existing[1].replace(/\s*$/, '')}, t } from '@/lib/i18n';`);
    }
  } else {
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
