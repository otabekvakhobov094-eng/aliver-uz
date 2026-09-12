/**
 * React hook'lari erta `return` dan KEYIN turmasin.
 *
 * NEGA. `CheckoutForm` da to'rtta hook `if (!ready) return …` dan
 * keyin turgan edi. Birinchi chizishda (savat hali yuklanmagan) 21 ta
 * hook chaqirilardi, ikkinchisida 25 ta — React buni «Rendered more
 * hooks than during the previous render» xatosi bilan to'xtatadi.
 *
 * Natijasi: RASMIYLASHTIRISH SAHIFASI UMUMAN OCHILMASDI. Savatga
 * mahsulot solgan har bir mijoz xatolik ekraniga tushardi. Bu
 * typecheck'da ham, testlarda ham ko'rinmaydi — faqat brauzerda,
 * faqat savat bo'sh bo'lmaganda.
 *
 * Tekshiruv MANBA matnida: komponent funksiyasi ichida birinchi
 * `return` dan keyin `use…(` chaqiruvi bormi.
 *
 * Ishlatish: node scripts/check-hook-order.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const DIRS = ['apps/web/src', 'apps/admin/src'];

const HOOK = /^use[A-Z]/;

function files(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files(full, out);
    else if (/\.tsx$/.test(e.name) && !/\.spec\.tsx$/.test(e.name)) out.push(full);
  }
  return out;
}

const problems = [];

for (const dir of DIRS) {
  const base = path.join(ROOT, dir);
  if (!fs.existsSync(base)) continue;

  for (const file of files(base)) {
    const text = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    /** Komponent tanasi: to'g'ridan-to'g'ri ichidagi `return` va hook'lar. */
    const checkBody = (body, name) => {
      if (!body || !ts.isBlock(body)) return;

      let returnedAt = null;

      for (const stmt of body.statements) {
        // `if (…) return …` ham, oddiy `return` ham hisobga olinadi.
        const isEarlyReturn =
          ts.isReturnStatement(stmt) ||
          (ts.isIfStatement(stmt) && !stmt.elseStatement && containsReturn(stmt.thenStatement));

        if (isEarlyReturn && returnedAt === null) {
          returnedAt = stmt.getStart(sf);
          continue;
        }

        if (returnedAt === null) continue;

        // Erta `return` dan keyingi hook chaqiruvi — xato.
        const found = findHook(stmt);
        if (found) {
          const { line } = sf.getLineAndCharacterOfPosition(found.getStart(sf));
          problems.push({
            file: path.relative(ROOT, file),
            line: line + 1,
            name,
            hook: found.expression.getText(sf),
          });
        }
      }
    };

    const containsReturn = (node) => {
      let has = false;
      const walk = (n) => {
        if (has) return;
        if (ts.isReturnStatement(n)) has = true;
        else if (!ts.isFunctionLike(n)) ts.forEachChild(n, walk);
      };
      walk(node);
      return has;
    };

    const findHook = (node) => {
      let found = null;
      const walk = (n) => {
        if (found) return;
        if (
          ts.isCallExpression(n) &&
          ts.isIdentifier(n.expression) &&
          HOOK.test(n.expression.text)
        ) {
          found = n;
          return;
        }
        // Ichki funksiya — u boshqa komponent yoki callback.
        if (ts.isFunctionLike(n) && n !== node) return;
        ts.forEachChild(n, walk);
      };
      walk(node);
      return found;
    };

    const visit = (node) => {
      if (ts.isFunctionDeclaration(node) && node.name && /^[A-Z]/.test(node.name.text)) {
        checkBody(node.body, node.name.text);
      }
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        /^[A-Z]/.test(node.name.text) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
      ) {
        checkBody(node.initializer.body, node.name.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
}

if (problems.length > 0) {
  console.error('Erta `return` dan KEYIN turgan hook:\n');
  for (const p of problems) {
    console.error(`  ${p.file}:${p.line}  ${p.name}() ichida  ${p.hook}(…)`);
  }
  console.error(
    '\nReact har chizishda bir xil sonda hook kutadi. Bunday joy sahifani\n' +
      'BUTUNLAY ochilmaydigan qiladi — typecheck ham, testlar ham ko‘rmaydi.\n' +
      'Hook‘ni birinchi `return` dan YUQORIGA ko‘chiring.\n',
  );
  process.exit(1);
}

console.log('Hook tartibi joyida: erta `return` dan keyin hook yo‘q.');
