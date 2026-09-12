/**
 * `@Body()` ni tekshirmasdan qabul qiladigan handlerlar.
 *
 * NEGA. `ValidationPipe` global qo'yilgan (`whitelist`,
 * `forbidNonWhitelisted`, `transform`), lekin u parametr tipiga
 * qarab ishlaydi. TypeScript esa `design:paramtypes` ga SINF nomini
 * faqat tip oddiy sinf havolasi bo'lgandagina yozadi. Kesishma
 * (`A & { b?: string }`), interfeys yoki joyida yozilgan obyekt
 * uchun `Object` yoziladi — `ValidationPipe` esa `Object` ni
 * TEKSHIRMAY o'tkazib yuboradi.
 *
 * Natija: DTO da `@IsString()` turadi, u hech qachon ishlamaydi,
 * notanish maydonlar kesilmaydi. Sovg'a sertifikatining `quote`
 * handlerida aynan shunday edi: `{"code": 12345}` yuborilsa kod son
 * bo'lib o'tib ketardi va 500 qaytarardi.
 *
 *   node scripts/check-dto-validation.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'apps/api/src');

function files(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files(full, out);
    else if (/\.ts$/.test(e.name) && !/\.spec\.ts$/.test(e.name)) out.push(full);
  }
  return out;
}

const all = files(SRC);
const source = all.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
/** Loyihada shu nomli SINF bormi (interfeys yoki `type` emas). */
const isClass = (name) => new RegExp(`\\bclass\\s+${name}\\b`).test(source);

const bad = [];

for (const file of all) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('@Body')) continue;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

  const visit = (node) => {
    if (ts.isParameter(node)) {
      const decorators = ts.getDecorators?.(node) ?? [];
      for (const d of decorators) {
        const expr = d.expression;
        if (!ts.isCallExpression(expr)) continue;
        if (!ts.isIdentifier(expr.expression) || expr.expression.text !== 'Body') continue;
        // `@Body('field')` — bitta maydon olinadi, DTO tekshiruvi kutilmaydi.
        if (expr.arguments.length > 0) continue;

        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        const type = node.type;
        const where = `${path.relative(ROOT, file)}:${line + 1}`;

        if (!type) {
          bad.push(`${where}  tipi umuman yo‘q`);
        } else if (ts.isIntersectionTypeNode(type)) {
          bad.push(`${where}  kesishma tip — ValidationPipe uni o‘tkazib yuboradi`);
        } else if (ts.isTypeLiteralNode(type)) {
          bad.push(`${where}  joyida yozilgan obyekt tipi`);
        } else if (ts.isUnionTypeNode(type)) {
          bad.push(`${where}  union tip`);
        } else if (type.kind === ts.SyntaxKind.AnyKeyword) {
          bad.push(`${where}  any`);
        } else if (ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName)) {
          const name = type.typeName.text;
          if (name === 'Record' || name === 'Partial' || name === 'Array') {
            bad.push(`${where}  ${name}<…> — sinf emas`);
          } else if (!isClass(name)) {
            bad.push(`${where}  ${name} sinf emas (interfeys yoki type)`);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

/*
 * BAZAVIY RO'YXAT.
 *
 * Loyihada bunday handlerlar allaqachon bor va ularning ko'pi qo'lda
 * tekshiradi (`String(body?.x ?? '').trim()` va hokazo) — ya'ni ular
 * xavfsiz, lekin himoyasi TASODIFIY: uni yozgan odam esdan
 * chiqarsa, hech narsa ogohlantirmaydi.
 *
 * Shuning uchun mavjudlari ro'yxatga olingan va tekshiruv faqat
 * YANGILARINI to'xtatadi. Ro'yxatdagi har biri vaqti bilan DTO
 * sinfiga o'tkaziladi va bu yerdan o'chiriladi.
 */
const baselinePath = path.join(ROOT, 'scripts/dto-validation-baseline.json');
const baseline = fs.existsSync(baselinePath)
  ? new Set(JSON.parse(fs.readFileSync(baselinePath, 'utf8')))
  : new Set();

const key = (line) => line.split('  ')[0];
const fresh = bad.filter((b) => !baseline.has(key(b)));
const gone = [...baseline].filter((b) => !bad.some((x) => key(x) === b));

if (gone.length > 0) {
  console.log(`Bazaviy ro‘yxatdan ${gone.length} ta joy tuzatilgan — ro‘yxatdan o‘chiring:`);
  for (const g of gone) console.log(`  ${g}`);
}

if (fresh.length === 0) {
  console.log(
    baseline.size === 0
      ? 'Har bir `@Body()` sinf tipida — ValidationPipe hammasini tekshiradi.'
      : `\`@Body()\` tekshiruvi: yangi buzilish yo‘q (ro‘yxatda ${baseline.size} ta eski joy).`,
  );
  process.exit(0);
}

console.error(`Tekshirilmaydigan YANGI ${fresh.length} ta \`@Body()\`:`);
for (const b of fresh) console.error(`  ${b}`);
console.error('DTO ni SINF qiling (kerak bo‘lsa `extends` bilan) — aks holda qoidalar ishlamaydi.');
process.exit(1);
