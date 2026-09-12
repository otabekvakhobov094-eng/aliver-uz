/**
 * `schema.prisma` dan TypeScript stubini generatsiya qiladi.
 *
 * NEGA. Bu muhitda `prisma generate` ishlamaydi (dvigatel yuklab
 * olinmaydi), shuning uchun lokal typecheck qo'lda yozilgan stub bilan
 * ishlaydi. O'sha stubda model delegatlari `any` edi — ya'ni HAR
 * QANDAY narsa o'tib ketardi.
 *
 * Natijada deploy UCH MARTA yiqildi va uchalasi ham bir sinf:
 *   1. `Customer.fullName` — mavjud bo'lmagan maydon;
 *   2. `OrderItem.productId` — mavjud bo'lmagan maydon;
 *   3. `status: active ? 'ACTIVE' : 'DRAFT'` — TypeScript turni
 *      `string` gacha kengaytiradi, Prisma esa `ProductStatus`
 *      enumini kutadi.
 *
 * Birinchi ikkitasini `check-prisma-fields.mjs` endi ushlaydi. Uchinchisi
 * esa MAYDON NOMI emas, TUR muammosi — uni faqat typecheck ushlay oladi,
 * va buning uchun stubda haqiqiy turlar bo'lishi kerak.
 *
 * QAMROV ATAYLAB CHEKLANGAN. `data` qat'iy tiplanadi (xato tur va xato
 * maydon shu yerda chiqadi), `where`/`select`/`include` esa bo'sh
 * qoladi — ular uchun `check-prisma-fields.mjs` bor, va ularni to'liq
 * tiplash Prisma ning butun tur tizimini qayta yozish demakdir.
 *
 * Ishlatish:
 *   node scripts/generate-prisma-stub.mjs [chiqish-fayli]
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCHEMA = path.join(ROOT, 'apps/api/prisma/schema.prisma');
const OUT = process.argv[2] ?? path.join(ROOT, '.prisma-stub/index.d.ts');

const text = fs.readFileSync(SCHEMA, 'utf8');

/* ---- enumlar ---- */
const enums = new Map();
for (const m of text.matchAll(/^enum\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  const values = m[2]
    .split('\n')
    .map((l) => l.trim().split(/\s|\/\//)[0])
    .filter((l) => /^[A-Za-z_]\w*$/.test(l));
  enums.set(m[1], values);
}

/* ---- modellar ---- */
const SCALARS = {
  String: 'string',
  Boolean: 'boolean',
  Int: 'number',
  Float: 'number',
  BigInt: 'bigint',
  Decimal: 'unknown',
  DateTime: 'Date | string',
  Json: 'unknown',
  Bytes: 'unknown',
};

const models = new Map();
for (const m of text.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  const fields = [];
  for (const raw of m[2].split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('@@')) continue;
    const fm = /^(\w+)\s+(\w+)(\[\])?(\?)?/.exec(line);
    if (!fm) continue;
    const [, name, type, list, optional] = fm;
    fields.push({ name, type, list: Boolean(list), optional: Boolean(optional) });
  }
  models.set(m[1], fields);
}

/** Maydonning `data` dagi TypeScript turi. */
function dataType(field) {
  if (models.has(field.type)) return 'unknown'; // bog'lanish yozuvi — erkin
  const base = enums.has(field.type)
    ? field.type
    : (SCALARS[field.type] ?? 'unknown');
  if (field.list) return `${base}[] | { set?: ${base}[]; push?: ${base} | ${base}[] }`;
  const nullable = field.optional ? ' | null' : '';
  // Sonli maydonlarda Prisma atomik amallarni ham qabul qiladi.
  const atomic =
    base === 'number' || base === 'bigint'
      ? ` | { set?: ${base}${nullable}; increment?: ${base}; decrement?: ${base}; multiply?: ${base}; divide?: ${base} }`
      : ` | { set?: ${base}${nullable} }`;
  // `undefined` ATAYLAB ruxsat etiladi: kodda ko'p joyda
  // `purpose: dto.purpose` kabi ixtiyoriy qiymat beriladi va Prisma
  // buni «maydonga tegilmadi» deb tushunadi.
  return `${base}${nullable} | undefined${atomic}`;
}

/**
 * Maydonning O'QILGAN yozuvdagi turi.
 *
 * `data` dagidan farq qiladi va farq ataylab:
 *   — `DateTime` bu yerda faqat `Date`. Yozishda satr ham qabul
 *     qilinadi, lekin bazadan har doim `Date` qaytadi, va `Date | string`
 *     deb yozilsa `row.createdAt.getTime()` xato bergan bo'lardi;
 *   — bog'lanishlar HAQIQIY tur bilan: `items: CartItemRow[]`. Aynan
 *     shu narsa `cart.items.filter((i) => ...)` da `i` ni tanitadi.
 *     `any` qaytarilganda TypeScript «implicitly any» deb yiqilardi —
 *     haqiqiy klientda bunday xato yo'q, ya'ni stub o'zi 50 dan ortiq
 *     soxta xato yasardi.
 */
function rowType(field) {
  const base = models.has(field.type)
    ? `${field.type}Row`
    : enums.has(field.type)
      ? field.type
      : field.type === 'DateTime'
        ? 'Date'
        : (SCALARS[field.type] ?? 'any');
  if (field.list) return `${base}[]`;
  return field.optional ? `${base} | null` : base;
}

const lines = [];
lines.push('/* ------------------------------------------------------------------');
lines.push(' * AVTOMATIK GENERATSIYA — QO\'LDA TAHRIRLAMANG.');
lines.push(' * Manba: apps/api/prisma/schema.prisma');
lines.push(' * Yangilash: node scripts/generate-prisma-stub.mjs');
lines.push(' *');
lines.push(' * Bu FAQAT sandboxda typecheck uchun. Haqiqiy muhitda');
lines.push(' * `prisma generate` ning o\'zi ishlaydi va bu fayl ishlatilmaydi.');
lines.push(' * ------------------------------------------------------------------ */');
lines.push('');
lines.push("declare module '@prisma/client' {");

for (const [name, values] of enums) {
  lines.push(`  export type ${name} = ${values.map((v) => `'${v}'`).join(' | ')};`);
  // ANIQ kalitlar bilan — `Record<string, T>` emas. Aks holda
  // `noUncheckedIndexedAccess` yoqilgan loyihada `OtpPurpose.LOGIN`
  // `T | undefined` bo'lib chiqadi.
  lines.push(
    `  export const ${name}: { ${values.map((v) => `${v}: '${v}'`).join('; ')} };`,
  );
}
lines.push('');

lines.push('  /** Erkin shakl — `where`, `select`, `include`, `orderBy` uchun. */');
lines.push('  type Loose = Record<string, any>;');
lines.push('');
lines.push('  /**');
lines.push('   * Argumentlarning `data` dan BOSHQA qismlari.');
lines.push('   *');
lines.push('   * Bu yerda indeks imzosi (`Record<string, any>`) BO\'LMASLIGI');
lines.push('   * shart. `{ data: TData } & Record<string, any>` yozilsa,');
lines.push('   * kesishmada `data` ning turi `TData & any` = `any` bo\'lib qoladi');
lines.push('   * va butun qat\'iylik yo\'qoladi — men aynan shu xatoga yo\'l');
lines.push('   * qo\'ydim va stub Render yiqilgan xatoni ko\'rmadi.');
lines.push('   */');
lines.push('  interface QueryArgs {');
lines.push('    where?: Loose;');
lines.push('    select?: Loose;');
lines.push('    include?: Loose;');
lines.push('    omit?: Loose;');
lines.push('    orderBy?: Loose | Loose[];');
lines.push('    cursor?: Loose;');
lines.push('    take?: number;');
lines.push('    skip?: number;');
lines.push('    distinct?: unknown;');
lines.push('    by?: unknown;');
lines.push('    having?: Loose;');
lines.push('    skipDuplicates?: boolean;');
lines.push('    _count?: Loose;');
lines.push('    _sum?: Loose;');
lines.push('    _avg?: Loose;');
lines.push('    _min?: Loose;');
lines.push('    _max?: Loose;');
lines.push('  }');
lines.push('');

for (const [name, fields] of models) {
  lines.push(`  export interface ${name}Data {`);
  for (const f of fields) {
    lines.push(`    ${f.name}?: ${dataType(f)};`);
  }
  lines.push('  }');

  // O'qilgan yozuv. Indeks imzosi SHART: `select` bilan hisoblangan
  // taxalluslar (`_count`, `_sum`, qo'shib olingan maydonlar) bo'lishi
  // mumkin va ularsiz stub mavjud bo'lmagan xato bergan bo'lardi.
  // Indeks imzosi qat'iylikni pasaytirmaydi: e'lon qilingan maydonlar
  // o'z turida qoladi.
  lines.push(`  export interface ${name}Row {`);
  lines.push('    [key: string]: any;');
  // Agregat maydonlari E'LON QILINADI, indeks imzosiga tashlab
  // qo'yilmaydi. Kodda `rows.map((r: { _count: { admins: number } }) => ...)`
  // kabi aniq izohlar bor; indeks imzosi majburiy maydonni
  // QONDIRMAYDI va bunday joylar soxta xato bergan bo'lardi.
  for (const agg of ['_count', '_sum', '_avg', '_min', '_max']) {
    lines.push(`    ${agg}: any;`);
  }
  for (const f of fields) {
    lines.push(`    ${f.name}: ${rowType(f)};`);
  }
  lines.push('  }');
}
lines.push('');

lines.push('  interface Delegate<TData, TRow> {');
lines.push('    findUnique(args: Loose): Promise<TRow | null>;');
lines.push('    findUniqueOrThrow(args: Loose): Promise<TRow>;');
lines.push('    findFirst(args?: Loose): Promise<TRow | null>;');
// `any[]` va `any` orasidagi farq muhim. `Promise<any>` qaytarilganda
// `rows.map((r) => ...)` chaqiruvida `r` ning KONTEKSTUAL turi umuman
// bo'lmaydi va TypeScript «implicitly has an any type» deb yiqiladi —
// haqiqiy klientda esa bunday xato yo'q. Ya'ni stub o'zi mavjud
// bo'lmagan 100 dan ortiq xato yasab, haqiqiylarini ko'mib tashlardi.
lines.push('    findMany(args?: Loose): Promise<TRow[]>;');
lines.push('    count(args?: Loose): Promise<number>;');
lines.push('    aggregate(args?: Loose): Promise<any>;');
lines.push('    groupBy(args: Loose): Promise<any[]>;');
lines.push('    // `data` QAT\'IY tiplangan: xato maydon va xato tur shu yerda chiqadi.');
lines.push('    create(args: QueryArgs & { data: TData }): Promise<TRow>;');
lines.push('    createMany(args: QueryArgs & { data: TData | TData[] }): Promise<any>;');
lines.push('    update(args: QueryArgs & { data: TData }): Promise<TRow>;');
lines.push('    updateMany(args: QueryArgs & { data: TData }): Promise<any>;');
lines.push('    upsert(args: QueryArgs & { create: TData; update: TData }): Promise<TRow>;');
lines.push('    delete(args: Loose): Promise<TRow>;');
lines.push('    deleteMany(args?: Loose): Promise<any>;');
lines.push('  }');
lines.push('');

const delegateName = (n) => n[0].toLowerCase() + n.slice(1);
lines.push('  export interface PrismaClientLike {');
for (const name of models.keys()) {
  lines.push(`    ${delegateName(name)}: Delegate<${name}Data, ${name}Row>;`);
}
lines.push('    /*');
lines.push('     * `$transaction` ATAYLAB tiplangan.');
lines.push('     *');
lines.push('     * U `any` bo\'lganda callback ichidagi `tx` ham `any` bo\'lib');
lines.push('     * qolardi — ya\'ni tranzaksiya ichidagi HAMMA so\'rov');
lines.push('     * tekshiruvdan chetda qolardi. Import xizmatining butun');
lines.push('     * yozuv qismi aynan tranzaksiya ichida, va Render yiqilgan');
lines.push('     * xato ham o\'sha yerda edi.');
lines.push('     */');
lines.push('    $transaction<T>(fn: (tx: PrismaClientLike) => Promise<T>, options?: { timeout?: number; maxWait?: number; isolationLevel?: string }): Promise<T>;');
// Massivli `$transaction` NATIJA TARTIBINI saqlaydi. `Promise<any[]>`
// yozilganda `const [rows, total] = await tx([...])` dagi `rows` `any`
// bo'lib qolar va undan keyingi `rows.map((p) => ...)` «implicitly any»
// deb yiqilardi.
lines.push('    $transaction<T extends readonly unknown[]>(operations: readonly [...T], options?: Loose): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }>;');
// Teg-shablon sifatida chaqiriladi: $queryRaw<Array<{ id: string }>>`...`.
// `any` bo'lsa e'lon qilingan tur yo'qolardi.
lines.push('    $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: any[]): Promise<T>;');
lines.push('    $executeRaw(query: TemplateStringsArray, ...values: any[]): Promise<number>;');
lines.push('    $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Promise<T>;');
lines.push('    $executeRawUnsafe(query: string, ...values: any[]): Promise<number>;');
lines.push('    $connect(): Promise<void>;');
lines.push('    $disconnect(): Promise<void>;');
lines.push('    $on: any;');
lines.push('    $use: any;');
lines.push('    $extends: any;');
lines.push('  }');
lines.push('');
lines.push('  export class PrismaClient implements PrismaClientLike {');
lines.push('    constructor(options?: any);');
for (const name of models.keys()) {
  lines.push(`    ${delegateName(name)}: Delegate<${name}Data, ${name}Row>;`);
}
lines.push('    /*');
lines.push('     * `$transaction` ATAYLAB tiplangan.');
lines.push('     *');
lines.push('     * U `any` bo\'lganda callback ichidagi `tx` ham `any` bo\'lib');
lines.push('     * qolardi — ya\'ni tranzaksiya ichidagi HAMMA so\'rov');
lines.push('     * tekshiruvdan chetda qolardi. Import xizmatining butun');
lines.push('     * yozuv qismi aynan tranzaksiya ichida, va Render yiqilgan');
lines.push('     * xato ham o\'sha yerda edi.');
lines.push('     */');
lines.push('    $transaction<T>(fn: (tx: PrismaClientLike) => Promise<T>, options?: { timeout?: number; maxWait?: number; isolationLevel?: string }): Promise<T>;');
// Massivli `$transaction` NATIJA TARTIBINI saqlaydi. `Promise<any[]>`
// yozilganda `const [rows, total] = await tx([...])` dagi `rows` `any`
// bo'lib qolar va undan keyingi `rows.map((p) => ...)` «implicitly any»
// deb yiqilardi.
lines.push('    $transaction<T extends readonly unknown[]>(operations: readonly [...T], options?: Loose): Promise<{ -readonly [K in keyof T]: Awaited<T[K]> }>;');
// Teg-shablon sifatida chaqiriladi: $queryRaw<Array<{ id: string }>>`...`.
// `any` bo'lsa e'lon qilingan tur yo'qolardi.
lines.push('    $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: any[]): Promise<T>;');
lines.push('    $executeRaw(query: TemplateStringsArray, ...values: any[]): Promise<number>;');
lines.push('    $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Promise<T>;');
lines.push('    $executeRawUnsafe(query: string, ...values: any[]): Promise<number>;');
lines.push('    $connect(): Promise<void>;');
lines.push('    $disconnect(): Promise<void>;');
lines.push('    $on: any;');
lines.push('    $use: any;');
lines.push('    $extends: any;');
lines.push('  }');
lines.push('');
lines.push('  export namespace Prisma {');
lines.push('    type TransactionClient = PrismaClientLike;');
lines.push('    const PrismaClientKnownRequestError: any;');
lines.push('    type PrismaClientKnownRequestError = any;');
lines.push('    const Decimal: any;');
lines.push('    type Decimal = any;');
lines.push('    type JsonValue = any;');
lines.push('    type InputJsonValue = any;');
lines.push('    const sql: any;');
lines.push('    const join: any;');
lines.push('    const raw: any;');
lines.push('');
lines.push('    // Kodda ishlatiladigan yordamchi turlar. Ular `Loose`:');
lines.push('    // maydon nomlarini `check-prisma-fields.mjs` tekshiradi.');
for (const name of models.keys()) {
  lines.push(`    type ${name}WhereInput = Loose;`);
  lines.push(`    type ${name}WhereUniqueInput = Loose;`);
  lines.push(`    type ${name}CreateInput = ${name}Data;`);
  lines.push(`    type ${name}UncheckedCreateInput = ${name}Data;`);
  lines.push(`    type ${name}UpdateInput = ${name}Data;`);
  lines.push(`    type ${name}UncheckedUpdateInput = ${name}Data;`);
  lines.push(`    type ${name}OrderByWithRelationInput = Loose;`);
  lines.push(`    type ${name}Select = Loose;`);
  lines.push(`    type ${name}Include = Loose;`);
}
lines.push('  }');
lines.push('}');
lines.push('');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, lines.join('\n'));
console.log(
  `Stub yozildi: ${path.relative(ROOT, OUT)} ` +
    `(${models.size} model, ${enums.size} enum)`,
);
