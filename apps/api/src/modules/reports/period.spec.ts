/**
 * Hisobot davri — kun CHEGARALARI.
 *
 * Bu yerdagi xato jimgina ishlaydi: fayl 200 qaytaradi, raqamlar
 * ishonchli ko'rinadi, faqat oxirgi kunning savdosi yo'q. Buxgalter
 * uni faqat boshqa manba bilan solishtirganda payqaydi.
 */
import { endOfLocalDay, resolvePeriod, startOfLocalDay } from './period';

/** Toshkent — UTC+5. */
const TASHKENT = 5 * 60 * 60 * 1000;

describe('resolvePeriod', () => {
  it('«custom» oxirgi kunni TO‘LIQ oladi', () => {
    const { gte, lte } = resolvePeriod('custom', '2026-09-01', '2026-09-30');

    // 1-sentabr 00:00 Toshkent = 31-avgust 19:00 UTC
    expect(gte.toISOString()).toBe('2026-08-31T19:00:00.000Z');
    // 30-sentabr 23:59:59.999 Toshkent = 30-sentabr 18:59:59.999 UTC
    expect(lte.toISOString()).toBe('2026-09-30T18:59:59.999Z');
  });

  it('oxirgi kunning kechki buyurtmasi oraliqqa KIRADI', () => {
    const { lte } = resolvePeriod('custom', '2026-09-01', '2026-09-30');
    // 30-sentabr, Toshkent vaqti bilan 22:30 — ish kunining oxiri.
    const evening = new Date(Date.UTC(2026, 8, 30, 22, 30) - TASHKENT);
    expect(evening.getTime()).toBeLessThanOrEqual(lte.getTime());
  });

  it('birinchi kunning erta tongi ham kiradi', () => {
    const { gte } = resolvePeriod('custom', '2026-09-01', '2026-09-30');
    // 1-sentabr, Toshkent vaqti bilan 02:00 — tungi buyurtma.
    const night = new Date(Date.UTC(2026, 8, 1, 2, 0) - TASHKENT);
    expect(night.getTime()).toBeGreaterThanOrEqual(gte.getTime());
  });

  it('«kecha» kechagi kunning o‘zini beradi', () => {
    const now = new Date('2026-09-12T10:00:00.000Z');
    const { gte, lte } = resolvePeriod('yesterday', undefined, undefined, now);

    const start = startOfLocalDay(now);
    expect(gte.getTime()).toBe(start.getTime() - 86_400_000);
    // Bugungi 00:00 dan bir millisekund oldin — ya'ni kecha to'liq.
    expect(lte.getTime()).toBe(start.getTime() - 1);
    expect(lte.getTime()).toBeGreaterThan(gte.getTime());
  });

  it('kun boshi va oxiri bir sutkani qamrab oladi', () => {
    const d = new Date('2026-09-12T10:00:00.000Z');
    const span = endOfLocalDay(d).getTime() - startOfLocalDay(d).getTime();
    expect(span).toBe(86_400_000 - 1);
  });
});
