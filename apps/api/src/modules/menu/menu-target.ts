/**
 * Menyu bandining NISHONI: turi, uni saytdagi manzilga aylantirish va
 * qaysi turlar bazadan tekshirilishi.
 *
 * Bu fayl ataylab sof: ichida Nest ham, Prisma ham yo'q. Shuning uchun
 * uni testda to'g'ridan-to'g'ri chaqirish mumkin — qoidalar shu yerda,
 * xizmat esa faqat bazaga qaraydi.
 */

export const MENU_LOCATIONS = ['HEADER', 'FOOTER'] as const;
export type MenuLocation = (typeof MENU_LOCATIONS)[number];

export const MENU_TARGET_TYPES = [
  'HOME',
  'CATEGORY',
  'COLLECTION',
  'PAGE',
  'BLOG',
  'ROUTE',
  'URL',
] as const;
export type MenuTargetType = (typeof MENU_TARGET_TYPES)[number];

/**
 * Menyudan ko'rsatish mumkin bo'lgan statik yo'llar.
 *
 * Ro'yxat YOPIQ. Admin ixtiyoriy yo'l yozib qo'ysa, sayt 404 beradi va
 * hech kim buni sezmaydi — shuning uchun faqat haqiqatan mavjud
 * sahifalar. Yangi sahifa qo'shilganda bu ro'yxat ham yangilanadi;
 * `scripts/check-nav-targets.mjs` ikkalasi mos ekanini tekshiradi.
 */
export const MENU_ROUTES = [
  '/katalog',
  '/kategoriyalar',
  '/tanlagich',
  '/qidiruv',
  '/blog',
  '/savollar',
  '/yetkazish',
  '/kuzatuv',
  '/aloqa',
  '/biz-haqimizda',
  '/hamkorlik',
  '/kabinet',
  '/kabinet/ballar',
  '/kabinet/buyurtmalar',
  '/kabinet/sevimlilar',
  '/savat',
] as const;

export interface MenuTarget {
  targetType: MenuTargetType;
  targetValue?: string | null;
}

/** Nishondan sayt ichidagi manzil (locale prefiksisiz). */
export function menuHref(t: MenuTarget): string {
  const v = (t.targetValue ?? '').trim();
  switch (t.targetType) {
    case 'HOME':
      return '';
    case 'CATEGORY':
      return `/katalog?category=${encodeURIComponent(v)}`;
    case 'COLLECTION':
      return `/katalog?collection=${encodeURIComponent(v)}`;
    case 'PAGE':
      return `/sahifa/${v}`;
    case 'BLOG':
      return v ? `/blog/${v}` : '/blog';
    case 'ROUTE':
      return v;
    case 'URL':
      return v;
  }
}

/** Tashqi manzilmi — bunga `locale` prefiksi qo'yilmaydi. */
export function isExternal(t: MenuTarget): boolean {
  return t.targetType === 'URL';
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Shakl xatolari — bazaga qaramasdan aniqlanadiganlari.
 * Qaytaradi: xato matni yoki `null`.
 */
export function validateTargetShape(t: MenuTarget): string | null {
  const v = (t.targetValue ?? '').trim();

  switch (t.targetType) {
    case 'HOME':
      return null;
    case 'CATEGORY':
    case 'COLLECTION':
    case 'PAGE':
      if (!SLUG.test(v)) return `«${t.targetType}» uchun slug kerak (masalan: soch-parvarishi)`;
      return null;
    case 'BLOG':
      if (v && !SLUG.test(v)) return 'Maqola slugi noto‘g‘ri';
      return null;
    case 'ROUTE':
      if (!(MENU_ROUTES as readonly string[]).includes(v)) {
        return `«${v}» — bunday sahifa yo‘q. Mumkin bo‘lganlari: ${MENU_ROUTES.join(', ')}`;
      }
      return null;
    case 'URL':
      // Faqat http(s). `javascript:` menyuga tushsa — bu XSS.
      if (!/^https?:\/\/[^\s]+$/i.test(v)) return 'Tashqi havola http:// yoki https:// bilan boshlanishi kerak';
      return null;
    default:
      return 'Noma’lum nishon turi';
  }
}

/** Shu turlar uchun bazadan mavjudligi tekshiriladi. */
export function needsLookup(type: MenuTargetType): boolean {
  return type === 'CATEGORY' || type === 'COLLECTION' || type === 'PAGE' || type === 'BLOG';
}

/* ------------------------------------------------------------------ *
 * Daraxt qurish va yashash mumkin bo'lgan bandlarni saralash
 * ------------------------------------------------------------------ *
 *
 * Bu ikki amal ham sof: ularga bazadan olingan qatorlar va qaysi
 * sluglar tirik ekani beriladi. Prisma bu yerga kirmaydi, shuning
 * uchun ularni testda to'g'ridan-to'g'ri tekshirish mumkin — va
 * tekshirish kerak ham, chunki ikkalasida ham nozik qoida bor.
 */

export interface MenuRow {
  id: string;
  parentId: string | null;
  labelUz: string;
  labelRu: string;
  noteUz: string | null;
  noteRu: string | null;
  targetType: string;
  targetValue: string | null;
  isHighlighted: boolean;
}

export interface PublicMenuItem {
  id: string;
  labelUz: string;
  labelRu: string;
  noteUz: string | null;
  noteRu: string | null;
  href: string;
  external: boolean;
  highlighted: boolean;
  children: PublicMenuItem[];
}

/** Tekis ro'yxatdan ikki qavatli daraxt. */
export function buildTree(rows: MenuRow[], parentId: string | null = null): PublicMenuItem[] {
  return rows
    .filter((r) => r.parentId === parentId)
    .map((r) => ({
      id: r.id,
      labelUz: r.labelUz,
      labelRu: r.labelRu,
      noteUz: r.noteUz,
      noteRu: r.noteRu,
      href: menuHref(r as MenuTarget),
      external: isExternal(r as MenuTarget),
      highlighted: r.isHighlighted,
      children: buildTree(rows, r.id),
    }));
}

/**
 * Nishoni endi mavjud bo'lmagan bandlarni olib tashlaydi.
 *
 * Ikki qoida:
 *   1. Nishoni yo'qolgan band tushadi (kategoriya o'chirilgan,
 *      sahifa nashrdan olingan). Xato berilmaydi: bitta buzilgan
 *      havola uchun butun sarlavhani yiqitish mumkin emas.
 *   2. OTASI tushgan bola ham tushadi. Aks holda ochiluvchi menyusi
 *      bor bo'lim yo'qolib, uning ichki bandlari yuqori darajaga
 *      chiqib qolardi — foydalanuvchi buni «menyu buzildi» deb ko'radi.
 */
export function keepResolvable(rows: MenuRow[], alive: Record<string, Set<string>>): MenuRow[] {
  const ok = new Set(
    rows
      .filter((r) => {
        if (!needsLookup(r.targetType as MenuTargetType)) return true;
        if (r.targetType === 'BLOG' && !r.targetValue) return true;
        return alive[r.targetType]?.has(r.targetValue ?? '') ?? false;
      })
      .map((r) => r.id),
  );
  return rows.filter((r) => ok.has(r.id) && (!r.parentId || ok.has(r.parentId)));
}
