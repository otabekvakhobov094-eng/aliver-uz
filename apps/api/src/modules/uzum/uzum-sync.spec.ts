import {
  type LocalOffer,
  type RemoteOffer,
  buildSyncPlan,
  syncPlanToCsv,
  uzumPrice,
  uzumStock,
} from './uzum-sync';

/**
 * Ikki do'kon farqi — pul va qoldiq hisobi.
 *
 * Bu yerdagi xato o'zini darhol ko'rsatmaydi: narx bir necha foizga
 * past ketsa buni oylik hisobotda, tovar allaqachon sotilganidan
 * keyin ko'rasiz.
 */

function local(over: Partial<LocalOffer> = {}): LocalOffer {
  return {
    sku: 'ALV-001',
    nameUz: 'Kollagen krem',
    priceTiyin: 189_000_00n,
    available: 12,
    isActive: true,
    ...over,
  };
}

function remote(over: Partial<RemoteOffer> = {}): RemoteOffer {
  return {
    externalId: 'uz-1',
    sku: 'ALV-001',
    nameUz: 'Kollagen krem',
    priceTiyin: 189_000_00n,
    stock: 12,
    ...over,
  };
}

describe('uzumPrice — komissiya ustamasi', () => {
  it('ustama ko‘rsatilmasa narx umuman hisoblanmaydi', () => {
    // Bu eng muhim holat: ustamasiz narx yuborilmasligi kerak, aks
    // holda marketpleysda komissiya miqdorida zarar ko'riladi.
    expect(uzumPrice(189_000_00n, null)).toBeNull();
  });

  it('15% ustama qo‘shiladi', () => {
    expect(uzumPrice(100_000_00n, 15)).toBe(115_000_00n);
  });

  it('kasr foiz ham ishlaydi', () => {
    expect(uzumPrice(100_000_00n, 12.5)).toBe(112_500_00n);
  });

  it('yuqoriga yaxlitlanadi — har bir tovarda tiyin yo‘qotilmasin', () => {
    // 1 tiyin × 15% = 1.15 tiyin → 2 tiyin.
    expect(uzumPrice(1n, 15)).toBe(2n);
  });

  it('manfiy ustama rad etiladi', () => {
    expect(uzumPrice(100n, -5)).toBeNull();
  });

  it('nol ustama — narx o‘zgarmaydi, lekin sinxronlanadi', () => {
    expect(uzumPrice(100_000_00n, 0)).toBe(100_000_00n);
  });
});

describe('uzumStock — zaxira', () => {
  it('zaxira ayriladi', () => {
    expect(uzumStock(local({ available: 12 }), 3)).toBe(9);
  });

  it('zaxira qoldiqdan katta bo‘lsa — nol, manfiy emas', () => {
    expect(uzumStock(local({ available: 2 }), 5)).toBe(0);
  });

  it('nofaol variant marketpleysda ham nolga tushadi', () => {
    // Sayt sotmayotgan tovarni marketpleys sotib qo'ysa, uni bajarish
    // kerak bo'ladi — yoki bekor qilib, reyting jarimasini olish.
    expect(uzumStock(local({ isActive: false, available: 30 }), 0)).toBe(0);
  });
});

describe('buildSyncPlan', () => {
  it('hamma narsa mos bo‘lsa — ok', () => {
    const plan = buildSyncPlan({ local: [local()], remote: [remote()] });
    expect(plan.rows[0]!.action).toBe('ok');
    expect(plan.summary.ok).toBe(1);
  });

  it('qoldiq farqi ko‘rsatiladi', () => {
    const plan = buildSyncPlan({ local: [local({ available: 12 })], remote: [remote({ stock: 4 })] });
    expect(plan.rows[0]!.action).toBe('stock');
    expect(plan.rows[0]!.target.stock).toBe(12);
    expect(plan.summary.needsStock).toBe(1);
  });

  it('ustamasiz narx farqi HISOBGA OLINMAYDI', () => {
    // Narxlar har doim farq qiladi (komissiya), va ustamasiz bu farqni
    // ko'rsatish ro'yxatni ma'nosiz ogohlantirishlar bilan to'ldirardi.
    const plan = buildSyncPlan({
      local: [local({ priceTiyin: 189_000_00n })],
      remote: [remote({ priceTiyin: 219_000_00n })],
    });
    expect(plan.rows[0]!.action).toBe('ok');
    expect(plan.summary.priceSyncEnabled).toBe(false);
  });

  it('ustama ko‘rsatilsa narx farqi ko‘rinadi', () => {
    const plan = buildSyncPlan({
      local: [local({ priceTiyin: 100_000_00n })],
      remote: [remote({ priceTiyin: 100_000_00n })],
      markupPercent: 15,
    });
    expect(plan.rows[0]!.action).toBe('price');
    expect(plan.rows[0]!.target.priceTiyin).toBe('11500000');
  });

  it('SKU katta-kichik harfga sezgir emas', () => {
    // Uzum kabinetida SKU qo'lda kiritilgan bo'lishi mumkin.
    const plan = buildSyncPlan({
      local: [local({ sku: 'ALV-001' })],
      remote: [remote({ sku: 'alv-001' })],
    });
    expect(plan.rows[0]!.action).toBe('ok');
    expect(plan.summary.onlyHere).toBe(0);
  });

  it('bizda bor, Uzum’da yo‘q — only-here', () => {
    const plan = buildSyncPlan({ local: [local()], remote: [] });
    expect(plan.rows[0]!.action).toBe('only-here');
    expect(plan.rows[0]!.note).toContain('qo‘lda yaratilishi');
  });

  it('Uzum’da bor, bizda yo‘q — only-there', () => {
    const plan = buildSyncPlan({ local: [], remote: [remote()] });
    expect(plan.rows[0]!.action).toBe('only-there');
  });

  it('SKU siz Uzum kartochkasi moslashtirilmaydi, lekin yo‘qolmaydi ham', () => {
    const plan = buildSyncPlan({ local: [], remote: [remote({ sku: null })] });
    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0]!.action).toBe('only-there');
    expect(plan.rows[0]!.sku).toBe('—');
  });

  it('zaxira hisobga olingan holda maqsad qoldiq hisoblanadi', () => {
    const plan = buildSyncPlan({
      local: [local({ available: 10 })],
      remote: [remote({ stock: 10 })],
      reserveStock: 2,
    });
    expect(plan.rows[0]!.action).toBe('stock');
    expect(plan.rows[0]!.target.stock).toBe(8);
    expect(plan.rows[0]!.note).toContain('2 dona zaxira');
  });
});

describe('syncPlanToCsv', () => {
  it('Excel uchun BOM va nuqtali vergul bilan', () => {
    // Vergul bilan ajratilgan fayl ruscha Excel da bitta ustunga
    // tushib qoladi; BOM siz esa o'zbekcha harflar buziladi.
    const csv = syncPlanToCsv(buildSyncPlan({ local: [local()], remote: [remote()] }));
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.split('\r\n')[0]).toContain(';');
  });

  it('narx so‘mda chiqadi, tiyinda emas', () => {
    const csv = syncPlanToCsv(buildSyncPlan({ local: [local()], remote: [remote()] }));
    expect(csv).toContain('189000');
    expect(csv).not.toContain('18900000');
  });

  it('nuqtali vergulli nom qo‘shtirnoqqa olinadi', () => {
    const csv = syncPlanToCsv(
      buildSyncPlan({ local: [local({ nameUz: 'Krem; 50 ml' })], remote: [] }),
    );
    expect(csv).toContain('"Krem; 50 ml"');
  });
});
