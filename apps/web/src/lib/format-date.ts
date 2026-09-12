/**
 * Sana va son — ICU ga BOG'LIQ EMAS.
 *
 * NEGA. `toLocaleDateString('uz-UZ', { month: 'long' })` Node ning
 * qaysi ICU bilan qurilganiga bog'liq. To'liq ICU bo'lmagan qurilishda
 * o'zbekcha oy nomlari yo'q va sana «2026 M08 14» bo'lib chiqadi —
 * bu aynan adminda ko'rilgan xato edi. Xato ham chiqmaydi: sana
 * bor, faqat u mashina tili bilan yozilgan.
 *
 * Shuning uchun formatlar QO'LDA. Ular oddiy va ikkala tilda ham
 * tushunarli: 12.09.2026 va 12.09.2026, 14:30.
 */

const MONTH_UZ = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

const MONTH_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

function parse(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 12.09.2026 — eng qisqa va eng aniq shakl. */
export function fmtDate(v: string | Date | null | undefined): string {
  const d = parse(v);
  if (!d) return '—';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** 12.09.2026, 14:30 */
export function fmtDateTime(v: string | Date | null | undefined): string {
  const d = parse(v);
  if (!d) return '—';
  return `${fmtDate(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** «12 sentabr 2026» / «12 сентября 2026» — matn ichida o'qishga qulay. */
export function fmtDateLong(v: string | Date | null | undefined, ru: boolean): string {
  const d = parse(v);
  if (!d) return '—';
  const month = (ru ? MONTH_RU : MONTH_UZ)[d.getMonth()] ?? '';
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

/** 1 004 — bo'shliq bilan, guruhlab. */
export function fmtNumber(n: number | bigint): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
