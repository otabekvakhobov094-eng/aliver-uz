import { computeTotals } from './cart-totals';

const SUM = 100n;
const sum = (n: number) => BigInt(n) * SUM;

describe('savat summalari', () => {
  const lines = [
    { lineTotal: sum(189000), vatRate: 12 },
    { lineTotal: sum(296000), vatRate: 12 },
    { lineTotal: sum(89000), vatRate: 12 },
  ];

  it('chegirmasiz to‘g‘ri hisoblaydi', () => {
    const t = computeTotals({ lines, discountPerLine: [0n, 0n, 0n], shipping: sum(20000) });
    expect(t.subtotal).toBe(sum(574000));
    expect(t.discountTotal).toBe(0n);
    expect(t.grandTotal).toBe(sum(594000));
  });

  it('chegirmani ayiradi', () => {
    const t = computeTotals({
      lines,
      discountPerLine: [sum(18900), sum(29600), sum(8900)],
      shipping: 0n,
    });
    expect(t.discountTotal).toBe(sum(57400));
    expect(t.grandTotal).toBe(sum(516600));
  });

  it('QQS ni narx ichidan ajratadi', () => {
    const t = computeTotals({
      lines: [{ lineTotal: sum(112000), vatRate: 12 }],
      discountPerLine: [0n],
      shipping: 0n,
    });
    expect(t.vatTotal).toBe(sum(12000));
  });

  it('QQS chegirmadan KEYINGI summadan hisoblanadi', () => {
    const withDiscount = computeTotals({
      lines: [{ lineTotal: sum(112000), vatRate: 12 }],
      discountPerLine: [sum(11200)],
      shipping: 0n,
    });
    expect(withDiscount.vatTotal).toBeLessThan(sum(12000));
  });

  it('QQS siz mahsulotda QQS nol', () => {
    const t = computeTotals({
      lines: [{ lineTotal: sum(100000), vatRate: 0 }],
      discountPerLine: [0n],
      shipping: 0n,
    });
    expect(t.vatTotal).toBe(0n);
  });

  it('pozitsiya qiymatlari buyurtma nusxasi uchun qaytadi', () => {
    const t = computeTotals({ lines, discountPerLine: [sum(10000), 0n, 0n], shipping: 0n });
    expect(t.lines[0]!.netTotal).toBe(sum(179000));
    expect(t.lines[1]!.discountAmount).toBe(0n);
  });

  it('bo‘sh savat nol beradi', () => {
    const t = computeTotals({ lines: [], discountPerLine: [], shipping: 0n });
    expect(t.grandTotal).toBe(0n);
  });

  it('taqsimot uzunligi mos kelmasa xato', () => {
    expect(() => computeTotals({ lines, discountPerLine: [0n], shipping: 0n })).toThrow(/mos emas/);
  });

  it('pozitsiyadan katta chegirmani rad etadi', () => {
    expect(() =>
      computeTotals({
        lines: [{ lineTotal: sum(1000), vatRate: 12 }],
        discountPerLine: [sum(2000)],
        shipping: 0n,
      }),
    ).toThrow(/katta/);
  });
});
