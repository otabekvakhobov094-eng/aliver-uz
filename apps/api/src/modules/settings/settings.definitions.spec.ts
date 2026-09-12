import { PUBLIC_SETTING_KEYS, SETTING_DEFS, SETTING_GROUPS } from './settings.definitions';

/**
 * Sozlamalar ta'riflari.
 *
 * Bu yerdagi testlar ikkita xatoni qo'riqlaydi va ikkalasi ham
 * o'zini ko'rsatmaydi:
 *
 *   1. Sozlama saytga CHIQMAY qolsa — xodim uni o'zgartiradi, saqlaydi,
 *      saytda esa hech narsa o'zgarmaydi. Aynan shu holat yuz bergan;
 *   2. Sozlama saytga ORTIQCHA chiqib ketsa — ichki chegaralar va
 *      hisob-kitob qoidalari ommaga ochiladi.
 */

describe('sozlamalar ta’riflari', () => {
  it('har bir kalit ta’riflangan guruhga tegishli', () => {
    const groups = new Set(SETTING_GROUPS.map((g) => g.key));
    for (const def of SETTING_DEFS) {
      expect(groups.has(def.group)).toBe(true);
    }
  });

  it('kalitlar takrorlanmaydi', () => {
    const keys = SETTING_DEFS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('enum turidagi sozlamada variantlar bo‘lishi shart', () => {
    // Variantsiz enum UI da bo'sh ro'yxat bo'lib chiqardi: sozlama
    // ko'rinadi, lekin tanlab bo'lmaydi.
    for (const def of SETTING_DEFS.filter((d) => d.type === 'enum')) {
      expect(def.options?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('saytdagi «Aloqa» sahifasi uchun kerakli kalitlar ochiq', () => {
    // Bu ro'yxat sahifaning haqiqiy ehtiyoji. Bittasi tushib qolsa,
    // sahifa jimgina zaxira qiymatga qaytadi va admin o'zgarishi
    // yana ko'rinmay qoladi.
    for (const key of [
      'store.name',
      'store.phone',
      'store.telegram',
      'store.email',
      'store.workHours',
      'store.addressUz',
      'store.addressRu',
      'store.legalName',
    ]) {
      expect(PUBLIC_SETTING_KEYS).toContain(key);
    }
  });

  it('ochiq ro‘yxat FAQAT `store.` bilan boshlanadigan kalitlardan iborat', () => {
    // Ichki qoidalar — qaytarish muddati, chegirma chegarasi, savat
    // umri — saytga kerak emas. Yangi kalit qo'shilganda uni
    // tasodifan ochiq qilib qo'yish oson, shuning uchun chegara
    // shu yerda qat'iy belgilangan.
    for (const key of PUBLIC_SETTING_KEYS) {
      expect(key.startsWith('store.')).toBe(true);
    }
  });

  it('ochiq kalitlarning hammasi haqiqatan ta’riflangan', () => {
    const defined = new Set(SETTING_DEFS.map((d) => d.key));
    for (const key of PUBLIC_SETTING_KEYS) expect(defined.has(key)).toBe(true);
  });

  it('«nozik» belgisi ko‘rsatishni emas, TAHRIRLASHNI cheklaydi', () => {
    // STIR aynan shunday: uni faqat Super Admin o'zgartiradi, lekin u
    // fiskal chekda ham, saytda ham ochiq turadi. Ikkita tushunchani
    // bitta maydonga yig'ish bu yerda xatoga olib borardi.
    const tin = SETTING_DEFS.find((d) => d.key === 'store.tin');
    expect(tin?.sensitive).toBe(true);
    expect(tin?.publicOnSite).toBe(true);
  });

  it('ichki sozlamalar saytga chiqmaydi', () => {
    for (const key of [
      'returns.windowDays',
      'discounts.maxTotalPercent',
      'cart.ttlDays',
      'notify.quietFrom',
      'fiscal.shippingIkpu',
      'payments.reconcileDefaultDays',
    ]) {
      expect(PUBLIC_SETTING_KEYS).not.toContain(key);
    }
  });
});
