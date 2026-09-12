import { MENU_ROUTES, isExternal, menuHref, needsLookup, validateTargetShape } from './menu-target';

describe('menyu nishoni', () => {
  describe('manzil yasash', () => {
    it('bosh sahifa — bo‘sh yo‘l, locale prefiksi ustiga qo‘yiladi', () => {
      expect(menuHref({ targetType: 'HOME' })).toBe('');
    });

    it('kategoriya va kolleksiya katalog filtriga aylanadi', () => {
      expect(menuHref({ targetType: 'CATEGORY', targetValue: 'soch-parvarishi' })).toBe(
        '/katalog?category=soch-parvarishi',
      );
      expect(menuHref({ targetType: 'COLLECTION', targetValue: 'best-sellers' })).toBe(
        '/katalog?collection=best-sellers',
      );
    });

    it('slug URL uchun kodlanadi', () => {
      // Bazada bunday slug bo'lmasligi kerak, lekin manzil yasash
      // bosqichi buni nazarda tutmaydi va kodlashi shart.
      expect(menuHref({ targetType: 'CATEGORY', targetValue: 'a b' })).toBe('/katalog?category=a%20b');
    });

    it('blog qiymatsiz bo‘lsa — ro‘yxat, qiymat bilan — maqola', () => {
      expect(menuHref({ targetType: 'BLOG' })).toBe('/blog');
      expect(menuHref({ targetType: 'BLOG', targetValue: 'qish-parvarishi' })).toBe('/blog/qish-parvarishi');
    });
  });

  describe('shakl tekshiruvi', () => {
    it('kategoriya slugsiz qabul qilinmaydi', () => {
      expect(validateTargetShape({ targetType: 'CATEGORY', targetValue: '' })).toMatch(/slug/);
      expect(validateTargetShape({ targetType: 'CATEGORY', targetValue: 'Soch Parvarishi' })).toMatch(/slug/);
      expect(validateTargetShape({ targetType: 'CATEGORY', targetValue: 'soch-parvarishi' })).toBeNull();
    });

    it('ro‘yxatda yo‘q yo‘l rad etiladi', () => {
      // Aynan shu tekshiruv bo'lmasa, admin `/tirnoqlar` deb yozib
      // qo'yardi va sayt jim 404 berardi.
      expect(validateTargetShape({ targetType: 'ROUTE', targetValue: '/tirnoqlar' })).toMatch(/bunday sahifa yo/);
      expect(validateTargetShape({ targetType: 'ROUTE', targetValue: '/aloqa' })).toBeNull();
    });

    it('har bir ruxsat etilgan yo‘l o‘tadi', () => {
      for (const r of MENU_ROUTES) {
        expect(validateTargetShape({ targetType: 'ROUTE', targetValue: r })).toBeNull();
      }
    });

    it('javascript: havolasi menyuga tushmaydi', () => {
      // Menyu yorlig'i saytning har bir sahifasida chiqadi — bu yerga
      // tushgan skript butun saytga tushadi.
      expect(validateTargetShape({ targetType: 'URL', targetValue: 'javascript:alert(1)' })).toMatch(/http/);
      expect(validateTargetShape({ targetType: 'URL', targetValue: 'data:text/html,x' })).toMatch(/http/);
      expect(validateTargetShape({ targetType: 'URL', targetValue: 'https://t.me/aliveruz' })).toBeNull();
    });

    it('bosh sahifa qiymat talab qilmaydi', () => {
      expect(validateTargetShape({ targetType: 'HOME' })).toBeNull();
    });
  });

  describe('bazadan tekshirish kerakmi', () => {
    it('faqat ma’lumotga bog‘liq turlar uchun', () => {
      expect(needsLookup('CATEGORY')).toBe(true);
      expect(needsLookup('COLLECTION')).toBe(true);
      expect(needsLookup('PAGE')).toBe(true);
      expect(needsLookup('BLOG')).toBe(true);
      expect(needsLookup('ROUTE')).toBe(false);
      expect(needsLookup('HOME')).toBe(false);
      expect(needsLookup('URL')).toBe(false);
    });
  });

  it('faqat tashqi havola tashqi hisoblanadi', () => {
    expect(isExternal({ targetType: 'URL', targetValue: 'https://t.me/x' })).toBe(true);
    expect(isExternal({ targetType: 'ROUTE', targetValue: '/aloqa' })).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

import { buildTree, keepResolvable, type MenuRow } from './menu-target';

const row = (id: string, over: Partial<MenuRow> = {}): MenuRow => ({
  id,
  parentId: null,
  labelUz: id,
  labelRu: id,
  noteUz: null,
  noteRu: null,
  targetType: 'ROUTE',
  targetValue: '/aloqa',
  isHighlighted: false,
  ...over,
});

describe('menyu daraxti', () => {
  it('bolalar otasining ostiga tushadi', () => {
    const tree = buildTree([
      row('a'),
      row('a1', { parentId: 'a' }),
      row('a2', { parentId: 'a' }),
      row('b'),
    ]);
    expect(tree.map((t) => t.id)).toEqual(['a', 'b']);
    expect(tree[0]!.children.map((c) => c.id)).toEqual(['a1', 'a2']);
    expect(tree[1]!.children).toEqual([]);
  });

  it('manzil nishondan hisoblanadi', () => {
    const [item] = buildTree([row('x', { targetType: 'COLLECTION', targetValue: 'best-sellers' })]);
    expect(item!.href).toBe('/katalog?collection=best-sellers');
    expect(item!.external).toBe(false);
  });
});

describe('yashovchi bandlarni saralash', () => {
  const alive = {
    CATEGORY: new Set(['soch-parvarishi']),
    COLLECTION: new Set<string>(),
    PAGE: new Set(['originallik']),
    BLOG: new Set<string>(),
  };

  it('nishoni yo‘qolgan band tushadi, xato berilmaydi', () => {
    const kept = keepResolvable(
      [
        row('ok', { targetType: 'CATEGORY', targetValue: 'soch-parvarishi' }),
        row('yoq', { targetType: 'CATEGORY', targetValue: 'tirnoq' }),
      ],
      alive,
    );
    expect(kept.map((r) => r.id)).toEqual(['ok']);
  });

  it('OTASI tushsa, bolasi ham tushadi', () => {
    // Aks holda ochiluvchi bo'lim yo'qolib, uning ichki bandlari
    // yuqori darajaga chiqib qolardi — bu «menyu buzildi» ko'rinishi.
    const kept = keepResolvable(
      [
        row('ota', { targetType: 'COLLECTION', targetValue: 'yoq' }),
        row('bola', { parentId: 'ota' }),
        row('boshqa'),
      ],
      alive,
    );
    expect(kept.map((r) => r.id)).toEqual(['boshqa']);
  });

  it('ma’lumotga bog‘liq bo‘lmagan bandlar doim qoladi', () => {
    const kept = keepResolvable([row('r'), row('h', { targetType: 'HOME', targetValue: null })], alive);
    expect(kept).toHaveLength(2);
  });

  it('slugsiz BLOG bandi — bu ro‘yxat, u doim bor', () => {
    const kept = keepResolvable([row('b', { targetType: 'BLOG', targetValue: null })], alive);
    expect(kept).toHaveLength(1);
  });

  it('sahifa nashrdan olinsa, band menyudan ketadi', () => {
    const kept = keepResolvable(
      [
        row('bor', { targetType: 'PAGE', targetValue: 'originallik' }),
        row('yoq', { targetType: 'PAGE', targetValue: 'public-offer' }),
      ],
      alive,
    );
    expect(kept.map((r) => r.id)).toEqual(['bor']);
  });
});
