/**
 * Prisma so'rovlaridagi maydon nomlarini SXEMA bilan solishtiradi.
 *
 * NEGA BU KERAK.
 *
 * Bu muhitda `prisma generate` ishlamaydi (dvigatel yuklab olinmaydi),
 * shuning uchun lokal typecheck qo'lda yozilgan STUB bilan ishlaydi.
 * Stubda esa har qanday maydon mavjud deb hisoblanadi — ya'ni
 * `customer: { select: { fullName: true } }` bemalol o'tib ketadi,
 * garchi `Customer` da bunday maydon bo'lmasa ham.
 *
 * Natijada xato faqat Render'dagi build'da, haqiqiy klient bilan
 * chiqdi. Uchta xato, deploy yiqildi. Bu tekshiruv aynan shu turdagi
 * nomuvofiqlikni LOKAL ushlaydi.
 *
 * QANDAY ISHLAYDI. `schema.prisma` dan model → maydonlar jadvali
 * quriladi, so'ng TypeScript AST bo'ylab `prisma.<model>.<amal>({...})`
 * chaqiruvlari topiladi.
 *
 * Muhim nozik joy: Prisma obyektlari IKKI XIL bo'ladi va ularni
 * aralashtirish yolg'on xatolarga olib keladi.
 *   1) ARGUMENT obyekti — kalitlari `select`/`where`/`orderBy`/`take`…
 *   2) MAYDON obyekti   — kalitlari modelning haqiqiy maydonlari.
 * `include: { items: { where: {...}, take: 1 } }` da `items` maydon,
 * lekin uning QIYMATI yana ARGUMENT obyekti. Shuning uchun quyida
 * `walkArgs` va `walkFields` alohida yuradi.
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SCHEMA = path.join(ROOT, 'apps/api/prisma/schema.prisma');
const SRC = path.join(ROOT, 'apps/api/src');

/* ------------------------------------------------------------------ *
 * 1. Sxemani o'qish
 * ------------------------------------------------------------------ */

/** model nomi → Map<maydon, bog'langan model nomi | null> */
function parseSchema(text) {
  const models = new Map();

  const modelRe = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  for (const match of text.matchAll(modelRe)) {
    const name = match[1];
    const body = match[2];
    const fields = new Map();

    for (const raw of body.split('\n')) {
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('//')) continue;

      // `@@unique([cartId, variantId])` — bu maydon emas, lekin
      // `findUnique` uchun `cartId_variantId` degan SELEKTOR yaratadi.
      const uq = /^@@(?:unique|id)\s*\(\s*\[([^\]]+)\]([\s\S]*)\)/.exec(trimmed);
      if (uq) {
        const parts = uq[1].split(',').map((s) => s.trim()).filter(Boolean);
        const named = /name\s*:\s*["'](\w+)["']/.exec(uq[2] || '');
        fields.set(named ? named[1] : parts.join('_'), null);
        continue;
      }
      if (trimmed.startsWith('@@')) continue;

      const fm = /^(\w+)\s+(\w+)(\[\])?/.exec(trimmed);
      if (!fm) continue;
      fields.set(fm[1], fm[2]);
    }
    models.set(name, fields);
  }

  // Ikkinchi o'tish: skalyar va enum turlarini `null` ga aylantiramiz,
  // faqat haqiqiy model bog'lanishlari qoladi.
  for (const [, fields] of models) {
    for (const [f, t] of fields) if (!models.has(t)) fields.set(f, null);
  }
  return models;
}

const models = parseSchema(fs.readFileSync(SCHEMA, 'utf8'));

/** `prisma.productVariant` → `ProductVariant` */
const byLowerName = new Map([...models.keys()].map((k) => [k[0].toLowerCase() + k.slice(1), k]));

/* ------------------------------------------------------------------ *
 * 2. Kalitlar lug'ati
 * ------------------------------------------------------------------ */

/** ARGUMENT obyektidagi kalitlar → ular ichida nima turadi. */
const ARG_KEYS = new Map([
  ['select', 'select'],
  ['include', 'select'],
  ['omit', 'select'],
  ['where', 'where'],
  ['data', 'data'],
  ['create', 'data'],
  ['update', 'data'],
  ['orderBy', 'orderBy'],
  ['cursor', 'where'],
  ['having', 'where'],
  ['_count', 'select'],
  ['_sum', 'select'],
  ['_avg', 'select'],
  ['_min', 'select'],
  ['_max', 'select'],
]);

/** `where` ichidagi mantiqiy va filtr operatorlari — maydon emas. */
const WHERE_OPS = new Set([
  'AND', 'OR', 'NOT', 'equals', 'not', 'in', 'notIn', 'lt', 'lte', 'gt', 'gte',
  'contains', 'startsWith', 'endsWith', 'mode', 'search',
  'some', 'every', 'none', 'is', 'isNot',
  'has', 'hasEvery', 'hasSome', 'isEmpty',
]);

/** `data` ichidagi yozish operatorlari. */
const DATA_OPS = new Set([
  'set', 'increment', 'decrement', 'multiply', 'divide', 'push',
  'connect', 'disconnect', 'create', 'createMany', 'connectOrCreate',
  'update', 'updateMany', 'upsert', 'delete', 'deleteMany',
]);

/** `_count`, `_sum`… — maydon emas, agregat. */
const AGGREGATES = new Set(['_count', '_sum', '_avg', '_min', '_max']);

const problems = [];

function report(node, key, modelName, trail) {
  const { line } = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart());
  problems.push(
    `${path.relative(ROOT, node.getSourceFile().fileName)}:${line + 1}  ` +
      `«${key}» — ${modelName} modelida bunday maydon yo'q` + (trail ? `  (${trail})` : ''),
  );
}

function eachProp(node, fn) {
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue; // spread/shorthand — tekshirilmaydi
    if (ts.isComputedPropertyName(prop.name)) continue;
    fn(prop.name.getText().replace(/['"`]/g, ''), prop.initializer, prop);
  }
}

/** ARGUMENT obyekti: `{ select, where, orderBy, take… }` */
function walkArgs(node, modelName, trail) {
  if (!models.has(modelName)) return;
  eachProp(node, (key, value) => {
    const mode = ARG_KEYS.get(key);
    if (!mode) return; // take/skip/distinct/by — tekshirishga arzimaydi
    const next = trail ? `${trail} → ${key}` : key;
    if (ts.isObjectLiteralExpression(value)) walkFields(value, modelName, mode, next);
    else if (ts.isArrayLiteralExpression(value)) {
      for (const el of value.elements) {
        if (ts.isObjectLiteralExpression(el)) walkFields(el, modelName, mode, next);
      }
    }
  });
}

/** MAYDON obyekti: kalitlari modelning maydonlari (yoki operatorlar). */
function walkFields(node, modelName, mode, trail) {
  const fields = models.get(modelName);
  if (!fields) return;

  eachProp(node, (key, value, prop) => {
    // Agregat kalitlari ikki xil turadi:
    //   `select`/`include` da  → `_count: { select: { items: true } }`
    //     ya'ni ichkarisi ARGUMENT obyekti;
    //   `orderBy`/`having` da  → `_sum: { qty: 'desc' }`
    //     ya'ni ichkarisi shu modelning maydonlari.
    if (AGGREGATES.has(key)) {
      if (!ts.isObjectLiteralExpression(value)) return;
      if (mode === 'select') walkArgs(value, modelName, `${trail ? trail + ' → ' : ''}${key}`);
      else walkFields(value, modelName, mode, trail);
      return;
    }

    const isOp =
      (mode === 'where' && WHERE_OPS.has(key)) ||
      (mode === 'data' && DATA_OPS.has(key)) ||
      key === '_relevance' ||
      key === '_all';

    if (isOp) {
      // Operator ichida yana SHU modelning maydonlari turadi.
      if (ts.isObjectLiteralExpression(value)) walkFields(value, modelName, mode, trail);
      else if (ts.isArrayLiteralExpression(value)) {
        for (const el of value.elements) {
          if (ts.isObjectLiteralExpression(el)) walkFields(el, modelName, mode, trail);
        }
      }
      return;
    }

    if (!fields.has(key)) {
      report(prop, key, modelName, trail);
      return;
    }

    const target = fields.get(key);
    if (!target || !models.has(target)) return; // skalyar — ichkarisi yo'q
    const next = `${trail ? trail + ' → ' : ''}${key}`;

    if (ts.isObjectLiteralExpression(value)) {
      // `select`/`include` da bog'lanish qiymati — ARGUMENT obyekti.
      if (mode === 'select') walkArgs(value, target, next);
      else walkFields(value, target, mode, next);
    } else if (ts.isArrayLiteralExpression(value)) {
      for (const el of value.elements) {
        if (ts.isObjectLiteralExpression(el)) walkFields(el, target, mode, next);
      }
    }
  });
}

/* ------------------------------------------------------------------ *
 * 3. Kodni ko'rib chiqish
 * ------------------------------------------------------------------ */

function scanFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.getText();
      const target = node.expression.expression;

      if (ts.isPropertyAccessExpression(target)) {
        const modelProp = target.name.getText();
        const owner = target.expression.getText();
        // `this.prisma.review.findMany(...)` yoki `tx.review.create(...)`
        if (/prisma$|^tx$|^client$|^db$/.test(owner) && byLowerName.has(modelProp)) {
          const arg = node.arguments[0];
          if (arg && ts.isObjectLiteralExpression(arg)) {
            walkArgs(arg, byLowerName.get(modelProp), `${modelProp}.${method}()`);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) scanFile(full);
  }
}

walkDir(SRC);

if (problems.length > 0) {
  console.error(`\nPrisma so'rovlarida ${problems.length} ta nomuvofiqlik:\n`);
  for (const p of problems) console.error('  ' + p);
  console.error(
    `\nBu xatolar lokal typecheck'da KO'RINMAYDI: u Prisma stubi bilan ishlaydi.\n` +
      `Ular faqat haqiqiy klient bilan, ya'ni deploy paytida chiqardi.\n`,
  );
  process.exit(1);
}

console.log(`Prisma so'rovlari sxemaga mos. ${models.size} ta model tekshirildi.`);
