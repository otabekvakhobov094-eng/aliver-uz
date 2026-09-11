import {
  MAX_CATEGORY_DEPTH,
  assertDepthAllowed,
  assertNoCycle,
  breadcrumbFromPath,
  buildPath,
  buildTree,
  collectDescendantIds,
  depthFromPath,
} from './category-tree.util';

const node = (id: string, parentId: string | null, sortOrder = 0) => ({
  id,
  parentId,
  slug: id,
  nameUz: id,
  nameRu: id,
  sortOrder,
  isActive: true,
});

describe('kategoriya chuqurligi', () => {
  it('uch daraja ruxsat etiladi', () => {
    expect(assertDepthAllowed(null)).toBe(0);
    expect(assertDepthAllowed(0)).toBe(1);
    expect(assertDepthAllowed(1)).toBe(2);
  });

  it('to‘rtinchi daraja rad etiladi', () => {
    expect(() => assertDepthAllowed(2)).toThrow(/3 darajadan chuqur/);
  });

  it('MAX_CATEGORY_DEPTH o‘zgarmagan', () => {
    expect(MAX_CATEGORY_DEPTH).toBe(3);
  });
});

describe('materialized path', () => {
  it('yo‘lni yig‘adi', () => {
    expect(buildPath(null, 'a')).toBe('a');
    expect(buildPath('a', 'b')).toBe('a/b');
    expect(buildPath('a/b', 'c')).toBe('a/b/c');
  });

  it('yo‘ldan chuqurlikni hisoblaydi', () => {
    expect(depthFromPath('a')).toBe(0);
    expect(depthFromPath('a/b/c')).toBe(2);
  });
});

describe('halqa tekshiruvi', () => {
  it('o‘z avlodiga ko‘chirishni rad etadi', () => {
    expect(() => assertNoCycle('b', 'a/b/c')).toThrow(/o‘z ichidagi/);
  });

  it('boshqa shoxga ko‘chirishga ruxsat beradi', () => {
    expect(() => assertNoCycle('b', 'x/y')).not.toThrow();
    expect(() => assertNoCycle('b', null)).not.toThrow();
  });
});

describe('daraxt', () => {
  const flat = [
    node('hair', null, 0),
    node('shampoo', 'hair', 1),
    node('oil', 'hair', 0),
    node('face', null, 1),
    node('cream', 'face', 0),
    node('night-cream', 'cream', 0),
  ];

  it('ildizlarni va bolalarni to‘g‘ri joylashtiradi', () => {
    const tree = buildTree(flat);
    expect(tree.map((n) => n.id)).toEqual(['hair', 'face']);
    expect(tree[0]!.children.map((n) => n.id)).toEqual(['oil', 'shampoo']); // sortOrder bo'yicha
    expect(tree[1]!.children[0]!.children[0]!.id).toBe('night-cream');
  });

  it('yetim tugun ildizga aylanadi', () => {
    const tree = buildTree([node('orphan', 'yoq-bunday-id')]);
    expect(tree.map((n) => n.id)).toEqual(['orphan']);
  });

  it('kategoriya va barcha avlodlarini yig‘adi', () => {
    const tree = buildTree(flat);
    expect(collectDescendantIds(tree, 'face').sort()).toEqual(['cream', 'face', 'night-cream']);
    expect(collectDescendantIds(tree, 'oil')).toEqual(['oil']);
  });
});

describe('breadcrumb', () => {
  it('yo‘ldan zanjir yasaydi', () => {
    const byId = new Map([
      ['a', { id: 'a', slug: 'hair', nameUz: 'Soch', nameRu: 'Волосы' }],
      ['b', { id: 'b', slug: 'oil', nameUz: 'Moy', nameRu: 'Масло' }],
    ]);
    expect(breadcrumbFromPath('a/b', byId).map((x) => x.slug)).toEqual(['hair', 'oil']);
  });

  it('topilmagan bo‘g‘inni tashlab ketadi', () => {
    const byId = new Map([['a', { id: 'a', slug: 'hair', nameUz: 'Soch', nameRu: 'Волосы' }]]);
    expect(breadcrumbFromPath('a/zzz', byId)).toHaveLength(1);
  });
});
