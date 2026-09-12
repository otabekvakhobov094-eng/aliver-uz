/**
 * Admin panel sidebar. Har bir bo'lim uchun talab qilinadigan huquq
 * ko'rsatilgan — foydalanuvchi ko'ra olmaydigan bo'lim menyuda ham chiqmaydi.
 * TZ 58 va 74.
 *
 * BO'LIMLARGA AJRATILGAN. Ilgari 30 ta band bitta uzun ro'yxat edi va
 * kerakli bo'limni topish uchun ko'z bilan skanerlashga to'g'ri kelardi.
 * Guruhlar ISH OQIMI bo'yicha: buyurtma keldi → to'lov → chek →
 * qaytarish bitta joyda, katalog boshqa joyda. Alifbo yoki texnik
 * tartib emas — xodim kun davomida shu ketma-ketlikda ishlaydi.
 */
export interface NavItem {
  href: string;
  label: string;
  permission: string;
  /** Sidebardagi guruh. `SECTIONS` dagi kalitlardan biri. */
  section: SectionKey;
  /** Ikonka nomi — `NavIcon` komponenti shu bo'yicha chizadi. */
  icon: IconName;
  /** Qaysi etapda rejalashtirilgan — yo'l xaritasi uchun ma'lumot. */
  stage: number;
  /**
   * Sahifa haqiqatan mavjudmi. Bu `stage` dan ALOHIDA maydon va ataylab
   * shunday: ilgari menyu `stage <= 2` bo'yicha ochilardi va natija teskari
   * chiqqan edi — bosiladigan bo'limlar aynan sahifasi yo'qlari bo'lib
   * 404 berardi, ishlaydigan 20 ta sahifa esa o'chirilgan turardi.
   * Shuning uchun mezon bitta: route mavjudmi yoki yo'q.
   */
  ready: boolean;
}

export type SectionKey =
  | 'main'
  | 'sales'
  | 'catalog'
  | 'customers'
  | 'marketing'
  | 'content'
  | 'insights'
  | 'settings';

export const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  // Birinchi guruhda sarlavha yo'q: Dashboard yolg'iz turadi va unga
  // sarlavha qo'yish ortiqcha shovqin bo'lardi.
  { key: 'main', label: '' },
  { key: 'sales', label: 'Savdo' },
  { key: 'catalog', label: 'Katalog' },
  { key: 'customers', label: 'Mijozlar' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'content', label: 'Kontent' },
  { key: 'insights', label: 'Tahlil' },
  { key: 'settings', label: 'Sozlamalar' },
];

export type IconName =
  | 'home'
  | 'orders'
  | 'card'
  | 'scale'
  | 'receipt'
  | 'return'
  | 'box'
  | 'tag'
  | 'grid'
  | 'layers'
  | 'warehouse'
  | 'upload'
  | 'store'
  | 'users'
  | 'star'
  | 'gift'
  | 'percent'
  | 'briefcase'
  | 'menu'
  | 'page'
  | 'image'
  | 'pen'
  | 'chart'
  | 'history'
  | 'truck'
  | 'bell'
  | 'shield'
  | 'gear'
  | 'coin';

export const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', permission: 'dashboard.view', section: 'main', icon: 'home', stage: 5, ready: true },

  { href: '/orders', label: 'Buyurtmalar', permission: 'orders.view', section: 'sales', icon: 'orders', stage: 3, ready: true },
  { href: '/payments', label: 'To‘lovlar', permission: 'payments.view', section: 'sales', icon: 'card', stage: 4, ready: true },
  { href: '/reconcile', label: 'Moslashtirish', permission: 'payments.view', section: 'sales', icon: 'scale', stage: 4, ready: true },
  { href: '/fiscal', label: 'Fiskal cheklar', permission: 'fiscal.view', section: 'sales', icon: 'receipt', stage: 4, ready: true },
  { href: '/returns', label: 'Qaytarishlar', permission: 'returns.view', section: 'sales', icon: 'return', stage: 6, ready: true },

  { href: '/products', label: 'Mahsulotlar', permission: 'products.view', section: 'catalog', icon: 'box', stage: 2, ready: true },
  { href: '/brands', label: 'Brendlar', permission: 'products.view', section: 'catalog', icon: 'tag', stage: 2, ready: true },
  { href: '/categories', label: 'Kategoriyalar', permission: 'categories.view', section: 'catalog', icon: 'grid', stage: 2, ready: true },
  { href: '/collections', label: 'Kolleksiyalar', permission: 'collections.view', section: 'catalog', icon: 'layers', stage: 2, ready: true },
  { href: '/inventory', label: 'Ombor', permission: 'inventory.view', section: 'catalog', icon: 'warehouse', stage: 3, ready: true },
  { href: '/import', label: 'Import', permission: 'products.create', section: 'catalog', icon: 'upload', stage: 2, ready: true },
  { href: '/uzum', label: 'Uzum Seller', permission: 'products.view', section: 'catalog', icon: 'store', stage: 2, ready: true },

  { href: '/customers', label: 'Mijozlar', permission: 'customers.view', section: 'customers', icon: 'users', stage: 6, ready: true },
  { href: '/loyalty', label: 'Bonus ballar', permission: 'customers.view', section: 'customers', icon: 'coin', stage: 3, ready: true },
  { href: '/reviews', label: 'Sharhlar', permission: 'reviews.view', section: 'customers', icon: 'star', stage: 6, ready: true },
  { href: '/b2b', label: 'B2B lidlar', permission: 'b2b.view', section: 'customers', icon: 'briefcase', stage: 7, ready: true },

  { href: '/discounts', label: 'Chegirmalar', permission: 'discounts.view', section: 'marketing', icon: 'percent', stage: 7, ready: true },
  { href: '/gift-cards', label: 'Sovg‘a sertifikatlari', permission: 'discounts.view', section: 'marketing', icon: 'gift', stage: 3, ready: true },

  { href: '/menu', label: 'Sayt menyusi', permission: 'content.view', section: 'content', icon: 'menu', stage: 7, ready: true },
  { href: '/content', label: 'Sahifalar', permission: 'content.view', section: 'content', icon: 'page', stage: 7, ready: true },
  { href: '/content#banners', label: 'Bannerlar', permission: 'banners.view', section: 'content', icon: 'image', stage: 7, ready: true },
  { href: '/content#blog', label: 'Blog', permission: 'blog.view', section: 'content', icon: 'pen', stage: 7, ready: true },

  { href: '/reports', label: 'Hisobotlar', permission: 'reports.view', section: 'insights', icon: 'chart', stage: 7, ready: true },
  { href: '/audit', label: 'Audit log', permission: 'audit.view', section: 'insights', icon: 'history', stage: 5, ready: true },

  { href: '/settings', label: 'Sozlamalar', permission: 'settings.view', section: 'settings', icon: 'gear', stage: 1, ready: true },
  { href: '/delivery', label: 'Yetkazish', permission: 'settings.view', section: 'settings', icon: 'truck', stage: 5, ready: true },
  { href: '/notifications', label: 'Bildirishnomalar', permission: 'settings.view', section: 'settings', icon: 'bell', stage: 5, ready: true },
  { href: '/users', label: 'Adminlar', permission: 'users.view', section: 'settings', icon: 'shield', stage: 1, ready: true },
  { href: '/roles', label: 'Rollar', permission: 'roles.view', section: 'settings', icon: 'shield', stage: 1, ready: true },
];

export function visibleNav(permissions: string[], roleCode?: string): NavItem[] {
  if (roleCode === 'SUPER_ADMIN') return NAV;
  const owned = new Set(permissions);
  return NAV.filter((item) => owned.has(item.permission));
}

/**
 * Ko'rinadigan bandlarni guruhlarga ajratadi.
 *
 * BO'SH GURUH QAYTARILMAYDI: operator faqat buyurtmalarni ko'rsa,
 * sidebarda «Katalog» degan bo'sh sarlavha osilib turmasligi kerak.
 */
export function navSections(
  items: NavItem[],
): Array<{ key: SectionKey; label: string; items: NavItem[] }> {
  return SECTIONS.map((s) => ({
    ...s,
    items: items.filter((i) => i.section === s.key),
  })).filter((s) => s.items.length > 0);
}
