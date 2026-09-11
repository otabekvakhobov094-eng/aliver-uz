import { NAV, visibleNav } from './nav';

describe('admin sidebar', () => {
  it('Super Adminga hamma bo‘lim ko‘rinadi', () => {
    expect(visibleNav([], 'SUPER_ADMIN')).toHaveLength(NAV.length);
  });

  it('operatorga rollar bo‘limi ko‘rinmaydi', () => {
    const items = visibleNav(['dashboard.view', 'orders.view'], 'OPERATOR');
    expect(items.map((i) => i.href)).toEqual(['/', '/orders']);
  });
});
