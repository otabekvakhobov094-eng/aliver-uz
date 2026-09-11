import { backoffMs } from './backoff';

describe('fiskal chek qayta urinish oralig‘i', () => {
  it('birinchi urinishdan keyin 1 daqiqa kutadi', () => {
    expect(backoffMs(1)).toBe(60_000);
  });

  it('oraliq o‘sib boradi', () => {
    const steps = [1, 2, 3, 4, 5, 6, 7, 8].map(backoffMs);
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]!).toBeGreaterThanOrEqual(steps[i - 1]!);
    }
    expect(steps[steps.length - 1]!).toBe(240 * 60_000);
  });

  it('jadval tugagach oxirgi oraliqda qoladi', () => {
    expect(backoffMs(99)).toBe(240 * 60_000);
  });

  it('nol yoki manfiy urinishda ham yiqilmaydi', () => {
    expect(backoffMs(0)).toBe(60_000);
    expect(backoffMs(-5)).toBe(60_000);
  });
});
