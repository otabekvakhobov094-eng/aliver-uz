/**
 * CSV o'qish.
 *
 * Qo'lda yozilgan, chunki bu yerda faqat ikkita murakkablik bor:
 * qo'shtirnoq ichidagi ajratgich va qo'shtirnoqning o'zi. Kutubxona
 * olib kelish shu ikkita holat uchun ortiqcha yuk bo'lardi.
 *
 * Ikkita chaqiruvchi bor — to'lov vypiskasi va ombor qoldig'i — va
 * ikkalasi ham XODIM Excel'dan eksport qilgan faylni yuklaydi.
 * Shuning uchun bu yerdagi qoidalar Excel xatti-harakatiga moslangan.
 */

/**
 * Ajratgichni topish.
 *
 * Ruscha va o'zbekcha mintaqadagi Excel nuqtali vergul bilan eksport
 * qiladi, inglizchasi vergul bilan. Noto'g'ri tanlansa butun fayl
 * bitta ustunga tushadi va import «hech narsa topilmadi» deb jimgina
 * tugaydi — ya'ni xato xatoga o'xshamaydi.
 */
export function detectDelimiter(text: string): string {
  const head = text.split('\n', 1)[0] ?? '';
  const counts = [';', ',', '\t'].map((d) => ({ d, n: head.split(d).length - 1 }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0]!.n > 0 ? counts[0]!.d : ';';
}

/** Qatorlarga va ustunlarga ajratadi. Bo'sh qatorlar tashlanadi. */
export function parseCsv(text: string, delimiter?: string): string[][] {
  // BOM — Excel qo'shadi va u birinchi ustun nomiga yopishib qoladi,
  // natijada ustun nomi bo'yicha topilmaydi.
  const clean = text.replace(/^﻿/, '');
  const sep = delimiter ?? detectDelimiter(clean);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i]!;
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/**
 * Ustunni NOMI bo'yicha topadi, tartibi bo'yicha emas.
 *
 * Tartibga ishonish — eksportga yangi ustun qo'shilgan kuni jimgina
 * boshqa ustunni o'qish demak.
 *
 * Avval to'liq moslik, keyin qismiy: «amount» qismiy qidiruvda
 * «refund_amount» ga ham mos kelardi.
 */
export function findColumn(header: string[], names: readonly string[]): number {
  const norm = header.map((h) => h.trim().toLowerCase().replace(/\s+/g, ' '));
  for (const name of names) {
    const i = norm.indexOf(name);
    if (i !== -1) return i;
  }
  for (const name of names) {
    const i = norm.findIndex((h) => h.includes(name));
    if (i !== -1) return i;
  }
  return -1;
}
