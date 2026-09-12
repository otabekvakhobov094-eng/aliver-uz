/**
 * CSV eksporti uchun sof yordamchilar.
 *
 * Ular ATAYLAB alohida faylda: controller `@prisma/client` ga bog'liq
 * va uni testdan import qilish butun Prisma turlarini tortib keladi.
 * Bu yerda hech qanday bog'liqlik yo'q, shuning uchun mantiq to'g'ridan
 * to'g'ri tekshiriladi.
 */

/** Tiyin → so'm, butun son. Buxgalteriya tiyin bilan ishlamaydi. */
export function tiyinToSum(value: bigint | null | undefined): string {
  return String((value ?? 0n) / 100n);
}

/**
 * CSV katakchasi.
 *
 * Ikki xil xavf bor va ikkalasi ham shu yerda yopiladi:
 *
 *   1. Ajratgich, qo'shtirnoq yoki yangi qator — ustunlar siljiydi.
 *   2. `=`, `+`, `-`, `@` bilan boshlangan qiymatni Excel FORMULA deb
 *      hisoblaydi. Mahsulot nomini adminkada kim bo'lsa ham yozadi,
 *      fayl esa buxgalterning kompyuterida ochiladi — ya'ni bu
 *      haqiqiy hujum yo'li (CSV injection). Oldiga apostrof qo'yiladi.
 */
export function csvCell(value: string): string {
  const raw = value ?? '';
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[";\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

/**
 * Qatorlarni CSV matniga yig'adi.
 *
 * Ajratgich nuqta-vergul: ruscha va o'zbekcha Windows lokalida Excel
 * vergulni ustun ajratgichi deb qabul qilmaydi va butun qator bitta
 * katakka tushadi.
 */
export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
}

/**
 * Excel CSV ni tizim kodlashida o'qiydi va o'zbek lotin harflari
 * (o‘, g‘) UTF-8 belgisisiz buziladi.
 */
export const UTF8_BOM = '﻿';
