import { ALL_PERMISSIONS, ROLE_PRESETS } from './permissions.constants';

describe('huquqlar matritsasi', () => {
  it('barcha huquq kodlari unikal', () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  it('rollarda faqat mavjud huquqlar bor', () => {
    const all = new Set<string>(ALL_PERMISSIONS);
    for (const [code, preset] of Object.entries(ROLE_PRESETS)) {
      if (preset.permissions === '*') continue;
      for (const p of preset.permissions) {
        expect({ role: code, permission: p, exists: all.has(p) }).toEqual({
          role: code,
          permission: p,
          exists: true,
        });
      }
    }
  });

  it('operator mahsulot narxini o‘zgartira olmaydi (TZ 74)', () => {
    const ops = ROLE_PRESETS.OPERATOR!.permissions as string[];
    expect(ops).not.toContain('products.update');
    expect(ops).not.toContain('products.delete');
  });

  it('faqat Super Admin rollarni boshqaradi', () => {
    const admin = ROLE_PRESETS.ADMINISTRATOR!.permissions as string[];
    expect(admin.some((p) => p.startsWith('roles.'))).toBe(false);
  });
});
