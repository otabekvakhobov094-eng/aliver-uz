import {
  allocateDiscount,
  percentOf,
  roundToSum,
  sumToTiyin,
  vatFromGross,
  formatTiyin,
} from './money';

describe('money', () => {
  it('so‘mni tiyinga o‘giradi', () => {
    expect(sumToTiyin(189000)).toBe(18900000n);
  });

  it('butun bo‘lmagan so‘mni rad etadi', () => {
    expect(() => sumToTiyin(1.5)).toThrow();
  });

  it('foizni yarim yuqoriga yaxlitlaydi', () => {
    expect(percentOf(10001n, 10)).toBe(1000n);
    expect(percentOf(10005n, 10)).toBe(1001n);
  });

  it('100 so‘mgacha yaxlitlaydi', () => {
    expect(roundToSum(sumToTiyin(1849), 100)).toBe(sumToTiyin(1800));
    expect(roundToSum(sumToTiyin(1850), 100)).toBe(sumToTiyin(1900));
  });

  it('chegirmani taqsimlaganda yig‘indi aynan teng bo‘ladi', () => {
    const lines = [18900000n, 29600000n, 8900000n];
    const discount = 5740000n; // 10%
    const parts = allocateDiscount(lines, discount);
    expect(parts.reduce((a, b) => a + b, 0n)).toBe(discount);
    expect(parts.every((p) => p >= 0n)).toBe(true);
  });

  it('bitta tiyinlik qoldiq ham yo‘qolmaydi', () => {
    const parts = allocateDiscount([1n, 1n, 1n], 2n);
    expect(parts.reduce((a, b) => a + b, 0n)).toBe(2n);
  });

  it('chegirma yig‘indidan katta bo‘lsa xato beradi', () => {
    expect(() => allocateDiscount([100n], 200n)).toThrow();
  });

  it('QQS ni narxdan ajratadi', () => {
    // 112 000 tiyin, 12% QQS ichida -> 12 000
    expect(vatFromGross(11200n, 12)).toBe(1200n);
  });

  it('formatlaydi', () => {
    expect(formatTiyin(57400000n)).toBe('574 000');
  });
});
