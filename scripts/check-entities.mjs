/**
 * JS satr ichida qolib ketgan HTML entity'lari.
 *
 * NEGA. JSX matnida `&apos;` to'g'ri yoziladi va brauzer uni
 * apostrofga aylantiradi. Lekin o'sha matn JS satriga ko'chsa —
 * masalan tarjima uchun `t('...')` ichiga o'ralganda — entity
 * AYNAN SHU HOLICHA chiqadi: ekranda «to&apos;langan» deb turadi.
 *
 * Xato bermaydi, test ham yiqilmaydi — shunchaki ekranda xunuk
 * matn. Adminka bosh sahifasida aynan shunday bo'lgan edi:
 * «Bu davrda to&apos;langan buyurtma yo&apos;q.»
 *
 *   node scripts/check-entities.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const DIRS = ['apps/admin/src', 'apps/web/src', 'packages/ui/src'];
// Ko'rinadigan matnga aloqasi yo'q entity'lar (HTML yasaydigan joylar).
const ENTITY = /&(?:[a-zA-Z][a-zA-Z0-9]{1,9}|#\d{1,5}|#x[0-9a-fA-F]{1,5});/;

function files(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files(full, out);
    else if (/\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

const bad = [];
for (const dir of DIRS) {
  for (const file of files(path.join(ROOT, dir))) {
    const text = fs.readFileSync(file, 'utf8');
    if (!ENTITY.test(text)) continue;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node) => {
      if (
        (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
        ENTITY.test(node.text)
      ) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        bad.push({
          file: path.relative(ROOT, file),
          line: line + 1,
          text: node.text.slice(0, 80),
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
}

if (bad.length === 0) {
  console.log('HTML entity: JS satrlarida qolib ketgani yo‘q.');
  process.exit(0);
}

console.error(`JS satri ichida ${bad.length} ta HTML entity — ekranda o‘shandayligicha chiqadi:`);
for (const b of bad) console.error(`  ${b.file}:${b.line}  ${b.text}`);
console.error('Entity o‘rniga haqiqiy belgini yozing: &apos; → ‘ , &quot; → « » , &amp; → &');
process.exit(1);
