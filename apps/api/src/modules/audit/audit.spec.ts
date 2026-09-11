import { buildDiff, diffFields } from './audit.service';

describe('audit farqi', () => {
  it('o‘zgargan maydonni topadi', () => {
    const diff = buildDiff({ status: 'NEW', total: 100 }, { status: 'CONFIRMED', total: 100 });
    expect(diff).toEqual([{ field: 'status', before: 'NEW', after: 'CONFIRMED' }]);
  });

  it('o‘zgarmagan maydonlarni ko‘rsatmaydi', () => {
    expect(buildDiff({ a: 1, b: 2 }, { a: 1, b: 2 })).toHaveLength(0);
  });

  it('yangi maydonni qo‘shilgan deb ko‘rsatadi', () => {
    const diff = buildDiff({ a: 1 }, { a: 1, b: 2 });
    expect(diff).toEqual([{ field: 'b', before: null, after: 2 }]);
  });

  it('olib tashlangan maydonni ham ko‘rsatadi', () => {
    const diff = buildDiff({ a: 1, b: 2 }, { a: 1 });
    expect(diff).toEqual([{ field: 'b', before: 2, after: null }]);
  });

  it('ichma-ich obyektlarni chuqur solishtiradi', () => {
    expect(buildDiff({ o: { x: 1 } }, { o: { x: 1 } })).toHaveLength(0);
    expect(buildDiff({ o: { x: 1 } }, { o: { x: 2 } })).toHaveLength(1);
  });

  it('yaratishda (before yo‘q) hamma maydon yangi', () => {
    const diff = buildDiff(null, { a: 1, b: 2 });
    expect(diff).toHaveLength(2);
    expect(diff.every((d) => d.before === null)).toBe(true);
  });

  it('null va yo‘q maydonni bir xil deb biladi', () => {
    // Bo'sh qatorlar ro'yxatni ifloslantirmasligi kerak.
    expect(buildDiff({ a: null }, {})).toHaveLength(0);
    expect(buildDiff({}, { a: null })).toHaveLength(0);
  });

  it('massivlarni ham solishtiradi', () => {
    expect(buildDiff([1, 2], [1, 2])).toHaveLength(0);
    const diff = buildDiff([1, 2], [1, 3]);
    expect(diff).toHaveLength(1);
    expect(diff[0]!.field).toBe('(ro‘yxat)');
  });

  it('bo‘sh yozuvlarda yiqilmaydi', () => {
    expect(buildDiff(null, null)).toHaveLength(0);
    expect(buildDiff(undefined, undefined)).toHaveLength(0);
    expect(buildDiff('matn', 42)).toHaveLength(0);
  });

  it('maydonlar alifbo tartibida', () => {
    const fields = diffFields({ z: 1, a: 1 }, { z: 2, a: 2 });
    expect(fields).toEqual(['a', 'z']);
  });
});
