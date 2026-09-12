import { findColumn, parseCsv } from '../../common/csv';
import type { Tiyin } from '../../common/money';
import type { ProviderRecord } from './reconcile.util';

/**
 * Provayder vypiskasini fayldan o'qish.
 *
 * NEGA BU KERAK. Moslashtirish shu paytgacha BIZNING webhook
 * loglarimizdan qurilardi. Bu solishtirish emas — o'zini o'zi bilan
 * taqqoslash. Agar webhook umuman kelmagan bo'lsa, ikkala tomonda ham
 * yozuv yo'q va hisobot «hammasi joyida» deydi. Aynan shu holat eng
 * xavflisi: mijoz pul to'lagan, biz esa buni bilmaymiz.
 *
 * Haqiqiy mustaqil manba — provayder vypiskasi. Uning API si kalit
 * bilan keladi, lekin FAYLNI kabinetdan bugun ham yuklab olish
 * mumkin. Shuning uchun import: buxgalteriyada bu odatiy amaliyot va
 * u kalitni kutib o'tirmaydi.
 *
 * Fayl formati provayderga qarab farq qiladi va oldindan ma'lum emas,
 * shuning uchun ustunlar NOMI bo'yicha topiladi — tartibi bo'yicha
 * emas. Tartibga ishonish har eksport yangilanganda jimgina noto'g'ri
 * ustunni o'qishga olib kelardi.
 */

/** Ustun nomlarining mumkin bo'lgan variantlari. */
const COLUMNS = {
  txnId: [
    'transaction_id', 'transactionid', 'txn_id', 'id', 'payment_id',
    'номер транзакции', 'идентификатор', 'id транзакции',
    'tranzaksiya', 'tranzaksiya id',
  ],
  orderNumber: [
    'order_id', 'order', 'merchant_trans_id', 'account', 'order_number',
    'номер заказа', 'заказ', 'лицевой счет',
    'buyurtma', 'buyurtma raqami',
  ],
  amount: ['amount', 'sum', 'сумма', 'summa', 'сумма платежа', 'to‘lov summasi', "to'lov summasi"],
  status: ['status', 'state', 'статус', 'состояние', 'holat'],
  date: [
    'date', 'created_at', 'perform_time', 'paid_at', 'time',
    'дата', 'дата оплаты', 'время', 'sana',
  ],
} as const;

/**
 * To'langan deb hisoblanadigan holatlar.
 *
 * Ro'yxat OQ: notanish holat to'langan deb hisoblanmaydi. Teskarisi
 * xavfli — provayder yangi holat qo'shsa («hold», «pending»), u
 * jimgina to'langan bo'lib o'tib ketardi.
 */
const PAID_WORDS = [
  'performed', 'success', 'successful', 'paid', 'completed', 'confirmed', 'ok',
  'оплачен', 'оплачено', 'успешно', 'выполнен', 'проведен', 'проведён', 'подтвержден',
  'to‘langan', "to'langan", 'muvaffaqiyatli', 'bajarildi',
];

const CANCELLED_WORDS = [
  'cancel', 'cancelled', 'canceled', 'reversed', 'refund', 'refunded', 'failed', 'error',
  'отмен', 'возврат', 'ошибка', 'неуспеш',
  'bekor', 'qaytarilgan', 'xato',
];

export interface StatementParseResult {
  records: ProviderRecord[];
  /** Nechta qator o'qildi va nechtasi tashlandi. */
  rows: number;
  skipped: number;
  /** O'qib bo'lmagan qatorlar — jim tashlab yuborilmaydi. */
  problems: Array<{ line: number; reason: string }>;
  /** Qaysi ustun qaysi nom bilan topilgani — admin tekshirishi uchun. */
  columns: Record<string, string | null>;
}

function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}


/**
 * Summani tiyinga o'girish.
 *
 * Vypiskada summa SO'MDA bo'ladi («189 000», «189000.00», «189 000,00»).
 * Bu joy alohida diqqat talab qiladi: 100 barobar xato bu yerda
 * tug'iladi va u faqat moslashtirish hisobotida ko'rinadi — ya'ni
 * hisobotning o'zi ishonchsiz bo'lib qoladi.
 */
export function sumTextToTiyin(raw: string): Tiyin | null {
  const cleaned = raw
    .trim()
    // Bo'sh joy va uzilmas bo'sh joy — minglik ajratgichi.
    .replace(/[\s ']/g, '')
    .replace(',', '.');
  if (cleaned === '' || !/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const negative = cleaned.startsWith('-');
  const [whole, frac = ''] = cleaned.replace('-', '').split('.');
  const tiyin = BigInt(whole!) * 100n + BigInt(frac.padEnd(2, '0').slice(0, 2));
  return negative ? -tiyin : tiyin;
}

function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  // 12.09.2026 14:30 / 12.09.2026
  const dmy = /^(\d{2})[./](\d{2})[./](\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (dmy) {
    const [, d, m, y, hh = '0', mm = '0', ss = '0'] = dmy;
    return new Date(Date.UTC(+y!, +m! - 1, +d!, +hh, +mm, +ss));
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function classify(status: string): { performed: boolean; cancelled: boolean } {
  const s = normalise(status);
  const cancelled = CANCELLED_WORDS.some((w) => s.includes(w));
  // Bekor qilingan yozuv to'langan deb hisoblanmaydi, hatto matnda
  // ikkala so'z ham uchrasa ham («оплачен, возврат»).
  if (cancelled) return { performed: false, cancelled: true };
  return { performed: PAID_WORDS.some((w) => s.includes(w)), cancelled: false };
}

/** Vypiska faylini `ProviderRecord` ro'yxatiga aylantiradi. */
export function parseStatement(text: string): StatementParseResult {
  const rows = parseCsv(text);
  const problems: Array<{ line: number; reason: string }> = [];

  if (rows.length === 0) {
    return {
      records: [],
      rows: 0,
      skipped: 0,
      problems: [{ line: 0, reason: 'Fayl bo‘sh' }],
      columns: {},
    };
  }

  const header = rows[0]!;
  const idx = {
    txnId: findColumn(header, COLUMNS.txnId),
    orderNumber: findColumn(header, COLUMNS.orderNumber),
    amount: findColumn(header, COLUMNS.amount),
    status: findColumn(header, COLUMNS.status),
    date: findColumn(header, COLUMNS.date),
  };
  const columns = Object.fromEntries(
    Object.entries(idx).map(([k, i]) => [k, i === -1 ? null : (header[i] ?? null)]),
  );

  // Tranzaksiya identifikatori va summa BO'LMASA import ma'nosiz:
  // solishtiradigan narsa qolmaydi.
  if (idx.txnId === -1 || idx.amount === -1) {
    return {
      records: [],
      rows: rows.length - 1,
      skipped: rows.length - 1,
      problems: [
        {
          line: 1,
          reason:
            'Sarlavhada tranzaksiya identifikatori yoki summa ustuni topilmadi. ' +
            `Topilgan ustunlar: ${header.join(', ')}`,
        },
      ],
      columns,
    };
  }

  const records: ProviderRecord[] = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i]!;
    const line = i + 1;

    const txnId = (row[idx.txnId] ?? '').trim();
    if (!txnId) {
      skipped += 1;
      problems.push({ line, reason: 'Tranzaksiya identifikatori bo‘sh' });
      continue;
    }

    const amount = sumTextToTiyin(row[idx.amount] ?? '');
    if (amount === null) {
      skipped += 1;
      problems.push({ line, reason: `Summani o‘qib bo‘lmadi: «${row[idx.amount] ?? ''}»` });
      continue;
    }

    const status = idx.status === -1 ? '' : (row[idx.status] ?? '');
    // Holat ustuni umuman bo'lmasa — yozuv to'langan deb hisoblanadi:
    // vypiskaga odatda faqat o'tgan to'lovlar tushadi.
    const { performed, cancelled } =
      idx.status === -1 ? { performed: true, cancelled: false } : classify(status);

    records.push({
      providerTxnId: txnId,
      orderNumber: idx.orderNumber === -1 ? null : (row[idx.orderNumber] ?? '').trim() || null,
      // Qaytarish satrlari manfiy summa bilan keladi — moslashtirish
      // uchun summa musbat bo'lishi kerak, belgisi esa holatda.
      amount: amount < 0n ? -amount : amount,
      performed,
      performedAt: idx.date === -1 ? null : parseDate(row[idx.date] ?? ''),
      cancelled: cancelled || amount < 0n,
    });
  }

  return { records, rows: rows.length - 1, skipped, problems, columns };
}
