/**
 * Hisobot davri — kalitdan aniq sanalarga.
 *
 * ATAYLAB alohida faylda: kontroller `@prisma/client` ga bog'liq va
 * uni testdan import qilish butun Prisma turlarini tortib keladi.
 * Bu yerda hech qanday bog'liqlik yo'q, ya'ni kun chegaralarini
 * to'g'ridan-to'g'ri tekshirish mumkin.
 *
 * Hamma narsa TOSHKENT vaqti (UTC+5) bo'yicha — server UTC da
 * ishlasa ham «bugun» mijoz uchun bugun bo'lsin.
 */
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

export function startOfLocalDay(d: Date): Date {
  const shifted = new Date(d.getTime() + TZ_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - TZ_OFFSET_MS);
}

/**
 * Kun OXIRI — Toshkent vaqti bo'yicha 23:59:59.999.
 *
 * NEGA KERAK. `lte: new Date('2026-09-30')` — bu 30-sentabr soat
 * 00:00 UTC, ya'ni Toshkentda 05:00. Natijada buxgalter «1–30
 * sentabr» deb hisobot olganda 30-sentabrning BUTUN savdosi va
 * 1-sentabrning birinchi besh soati hisobotga tushmasdi. Fayl 200
 * qaytaradi va raqamlar ishonchli ko'rinadi — shuning uchun buni
 * hech kim xato deb aytmaydi.
 */
export function endOfLocalDay(d: Date): Date {
  const shifted = new Date(d.getTime() + TZ_OFFSET_MS);
  shifted.setUTCHours(23, 59, 59, 999);
  return new Date(shifted.getTime() - TZ_OFFSET_MS);
}

export function resolvePeriod(
  period: string,
  from?: string,
  to?: string,
  at: Date = new Date(),
): { gte: Date; lte: Date } {
  const now = at;
  const today = startOfLocalDay(now);
  const day = 86400000;

  switch (period) {
    case 'today':
      return { gte: today, lte: now };
    case 'yesterday':
      // `lte: today` bo'lsa kechagi kun 00:00 da kesilardi — ya'ni
      // «kecha» hisoboti kechagi savdoning o'zini ko'rsatmasdi.
      return {
        gte: new Date(today.getTime() - day),
        lte: new Date(today.getTime() - 1),
      };
    case '7d':
      return { gte: new Date(today.getTime() - 6 * day), lte: now };
    case 'month': {
      const m = new Date(today);
      m.setUTCDate(1);
      return { gte: startOfLocalDay(m), lte: now };
    }
    case 'custom':
      return {
        gte: from ? startOfLocalDay(new Date(from)) : new Date(today.getTime() - 29 * day),
        lte: to ? endOfLocalDay(new Date(to)) : now,
      };
    case '30d':
    default:
      return { gte: new Date(today.getTime() - 29 * day), lte: now };
  }
}

