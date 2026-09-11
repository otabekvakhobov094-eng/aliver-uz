import { ORDER_NUMBER_RE, generateOrderNumber, generateReturnNumber } from './order-number';

describe('order-number', () => {
  it('ALV-YYMMDD-XXXX shaklida bo‘ladi', () => {
    const n = generateOrderNumber('ALV', new Date(2026, 8, 10));
    expect(n).toMatch(/^ALV-260910-\d{4}$/);
    expect(ORDER_NUMBER_RE.test(n)).toBe(true);
  });

  it('qaytarish raqami RET prefiksi bilan', () => {
    expect(generateReturnNumber(new Date(2026, 0, 5))).toMatch(/^RET-260105-\d{4}$/);
  });

  it('ketma-ket emas — 500 ta raqamdan kamida 95% unikal', () => {
    const at = new Date(2026, 8, 10);
    const set = new Set(Array.from({ length: 500 }, () => generateOrderNumber('ALV', at)));
    expect(set.size).toBeGreaterThan(450);
  });
});
