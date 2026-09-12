import { findColumn, parseCsv } from '../../common/csv';

/**
 * Ombor qoldig'ini fayldan o'qish.
 *
 * NEGA KERAK. Katalogda 556 ta mahsulot va ulardan ba'zilarida
 * o'nlab variant bor. Qoldiqni bittalab kiritish real emas — xodim
 * buni boshlaydi va tashlab yuboradi, katalog esa «Tugagan» bo'lib
 * qolaveradi. Ya'ni qo'lda kiritish yo'li mavjud bo'lsa ham, amalda
 * ishlamaydi.
 *
 * Fayl Excel'dan chiqadi, shuning uchun ustunlar NOMI bo'yicha
 * topiladi va ajratgich o'zi aniqlanadi.
 */

const COLUMNS = {
  sku: ['sku', 'artikul', 'artikul raqami', 'kod', 'code', 'артикул', 'код'],
  quantity: [
    'qoldiq', 'miqdor', 'soni', 'dona', 'quantity', 'qty', 'stock',
    'остаток', 'количество', 'кол-во',
  ],
} as const;

export interface StockRow {
  sku: string;
  quantity: number;
  line: number;
}

export interface StockParseResult {
  rows: StockRow[];
  /** Sarlavhasiz jami qatorlar. */
  total: number;
  /** O'qib bo'lmagan qatorlar — JIM tashlab yuborilmaydi. */
  problems: Array<{ line: number; reason: string }>;
  /** Qaysi ustun tanlangani — xodim tekshirishi uchun. */
  columns: { sku: string | null; quantity: string | null };
}

/**
 * Miqdorni o'qish.
 *
 * Kasr son QABUL QILINMAYDI: dona bo'linmaydi va «2,5 dona» — bu
 * xato yozuv, uni yaxlitlab o'tkazib yuborish esa omborni jimgina
 * noto'g'ri qiladi.
 */
export function parseQuantity(raw: string): number | null {
  const cleaned = raw.trim().replace(/[\s ]/g, '');
  if (cleaned === '') return null;
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) ? n : null;
}

export function parseStockFile(text: string): StockParseResult {
  const rows = parseCsv(text);
  const problems: Array<{ line: number; reason: string }> = [];
  const empty: StockParseResult = {
    rows: [],
    total: 0,
    problems,
    columns: { sku: null, quantity: null },
  };

  if (rows.length === 0) {
    problems.push({ line: 0, reason: 'Fayl bo‘sh' });
    return empty;
  }

  const header = rows[0]!;
  const iSku = findColumn(header, COLUMNS.sku);
  const iQty = findColumn(header, COLUMNS.quantity);
  const columns = {
    sku: iSku === -1 ? null : (header[iSku] ?? null),
    quantity: iQty === -1 ? null : (header[iQty] ?? null),
  };

  if (iSku === -1 || iQty === -1) {
    problems.push({
      line: 1,
      reason:
        'Sarlavhada SKU yoki qoldiq ustuni topilmadi. ' +
        `Topilgan ustunlar: ${header.join(', ')}`,
    });
    return { ...empty, columns, total: rows.length - 1 };
  }

  const out: StockRow[] = [];
  // Bir xil SKU ikki marta bo'lsa — OXIRGISI amal qiladi, lekin bu
  // haqda ogohlantiriladi: fayl ikki manbadan yig'ilgan bo'lishi
  // mumkin va o'shanda qaysi biri to'g'riligini xodim hal qiladi.
  const seen = new Map<string, number>();

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i]!;
    const line = i + 1;

    const sku = (row[iSku] ?? '').trim().toUpperCase();
    if (!sku) {
      problems.push({ line, reason: 'SKU bo‘sh' });
      continue;
    }

    const quantity = parseQuantity(row[iQty] ?? '');
    if (quantity === null) {
      problems.push({ line, reason: `Miqdorni o‘qib bo‘lmadi: «${row[iQty] ?? ''}»` });
      continue;
    }

    const before = seen.get(sku);
    if (before !== undefined) {
      problems.push({ line, reason: `SKU takrorlandi (${before}-qatorda ham bor) — oxirgisi olinadi` });
      const idx = out.findIndex((r) => r.sku === sku);
      if (idx !== -1) out.splice(idx, 1);
    }
    seen.set(sku, line);
    out.push({ sku, quantity, line });
  }

  return { rows: out, total: rows.length - 1, problems, columns };
}
