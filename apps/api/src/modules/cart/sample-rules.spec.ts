import { DEFAULT_SAMPLE_THRESHOLD, sampleProgress, sampleState } from './sample-rules';

const T = 30_000_00n; // 300 000 so'm

describe('Namuna ostonasi', () => {
  it('ostonaga yetmagan savat namunani ochmaydi', () => {
    const s = sampleState({ subtotalAfterDiscount: 25_000_00n, threshold: T, hasSelection: false });
    expect(s.unlocked).toBe(false);
    expect(s.remaining).toBe(5_000_00n);
  });

  it('aynan ostonada ochiladi — «dan katta» emas, «katta yoki teng»', () => {
    const s = sampleState({ subtotalAfterDiscount: T, threshold: T, hasSelection: false });
    expect(s.unlocked).toBe(true);
    expect(s.remaining).toBe(0n);
  });

  it('bo‘sh savatda qolgan summa to‘liq ostonaga teng', () => {
    expect(sampleState({ subtotalAfterDiscount: 0n, threshold: T, hasSelection: false }).remaining)
      .toBe(T);
  });

  /**
   * Osona CHEGIRMADAN KEYIN qo'llanadi. Aks holda mijoz promo-kod bilan
   * ostonadan pastga tushib, baribir bepul namuna olardi — chegirma
   * ikki marta berilgandek bo'lardi.
   */
  it('chegirmadan keyingi summa hisoblanadi', () => {
    // 350 000 mahsulot, 80 000 chegirma → 270 000, osona ochilmaydi.
    const s = sampleState({ subtotalAfterDiscount: 27_000_00n, threshold: T, hasSelection: false });
    expect(s.unlocked).toBe(false);
  });

  it('mahsulot olib tashlansa tanlangan namuna bekor bo‘ladi', () => {
    const s = sampleState({ subtotalAfterDiscount: 20_000_00n, threshold: T, hasSelection: true });
    expect(s.keepsSelection).toBe(false);
  });

  it('osona saqlanib qolsa tanlov ham qoladi', () => {
    const s = sampleState({ subtotalAfterDiscount: 45_000_00n, threshold: T, hasSelection: true });
    expect(s.keepsSelection).toBe(true);
  });

  it('sukut bo‘yicha osona 300 000 so‘m', () => {
    expect(DEFAULT_SAMPLE_THRESHOLD).toBe(30_000_00n);
    const s = sampleState({ subtotalAfterDiscount: 29_999_99n, hasSelection: false });
    expect(s.unlocked).toBe(false);
  });
});

describe('Namuna progressi', () => {
  it('bo‘sh savat — nol', () => {
    expect(sampleProgress(0n, T)).toBe(0);
  });

  it('yarmi — 0.5', () => {
    expect(sampleProgress(15_000_00n, T)).toBe(0.5);
  });

  it('ostonadan oshsa birdan oshmaydi', () => {
    expect(sampleProgress(90_000_00n, T)).toBe(1);
  });

  /**
   * BigInt bo'linmasi kasr bermaydi: to'g'ridan-to'g'ri bo'lish har doim
   * 0 yoki 1 chiqarardi va chiziq hech qachon qimirlamasdi.
   */
  it('kasr aniqligi yo‘qolmaydi', () => {
    expect(sampleProgress(10_000_00n, T)).toBeCloseTo(0.3333, 4);
  });

  it('mijoz qo‘shadigan eng kichik summada ham chiziq siljiydi', () => {
    // 1 000 so'm — haqiqiy savatdagi eng kichik qadam.
    expect(sampleProgress(1_000_00n, T)).toBeGreaterThan(0);
  });

  /**
   * 1 so'm progressni KO'RSATMASLIGI kerak. Bu kamchilik emas:
   * 300 000 so'mlik ostonada bir so'm chiziqning bir pikselini ham
   * qimirlatmaydi va uni ko'rsatish yolg'on bo'lardi.
   */
  it('ahamiyatsiz summa nolga yaxlitlanadi', () => {
    expect(sampleProgress(1_00n, T)).toBe(0);
  });

  it('nol osona bo‘lsa har doim to‘liq — nolga bo‘linish yo‘q', () => {
    expect(sampleProgress(0n, 0n)).toBe(1);
  });
});
