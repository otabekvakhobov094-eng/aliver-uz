import {
  LOYAL_FROM_ORDERS,
  SEGMENT_LABEL,
  SLEEPING_AFTER_DAYS,
  segmentOf,
  type Segment,
} from './segment';

const now = new Date('2026-09-11T12:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 3600 * 1000);

describe('mijoz segmenti', () => {
  it('buyurtmasiz mijoz — yangi', () => {
    expect(segmentOf({ ordersCount: 0, lastOrderAt: null }, now)).toBe('NEW');
  });

  it('bitta buyurtma — hali yangi', () => {
    expect(segmentOf({ ordersCount: 1, lastOrderAt: daysAgo(3) }, now)).toBe('NEW');
  });

  it('ikkitadan boshlab — takroriy', () => {
    expect(segmentOf({ ordersCount: 2, lastOrderAt: daysAgo(3) }, now)).toBe('REPEAT');
    expect(segmentOf({ ordersCount: 4, lastOrderAt: daysAgo(3) }, now)).toBe('REPEAT');
  });

  it('beshtadan boshlab — sodiq', () => {
    expect(segmentOf({ ordersCount: LOYAL_FROM_ORDERS, lastOrderAt: daysAgo(3) }, now)).toBe(
      'LOYAL',
    );
  });

  it('uzoq kelmagan sodiq mijoz ham "uxlab qolgan"', () => {
    // Sodiqlik "uxlab qolgan" ni yashirmasligi kerak — aks holda
    // qaytarish kampaniyasiga tushmay qolardi.
    expect(segmentOf({ ordersCount: 10, lastOrderAt: daysAgo(120) }, now)).toBe('SLEEPING');
  });

  it('chegarada hali uxlamagan', () => {
    expect(segmentOf({ ordersCount: 3, lastOrderAt: daysAgo(SLEEPING_AFTER_DAYS) }, now)).toBe(
      'REPEAT',
    );
  });

  it('har bir segment uchun ikki tilda nom bor', () => {
    for (const key of Object.keys(SEGMENT_LABEL) as Segment[]) {
      expect(SEGMENT_LABEL[key].uz.length).toBeGreaterThan(2);
      expect(SEGMENT_LABEL[key].ru.length).toBeGreaterThan(2);
    }
  });
});
