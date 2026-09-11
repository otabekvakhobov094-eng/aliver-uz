/**
 * Admin panel sidebar. Har bir bo'lim uchun talab qilinadigan huquq
 * ko'rsatilgan — foydalanuvchi ko'ra olmaydigan bo'lim menyuda ham chiqmaydi.
 * TZ 58 va 74.
 */
export interface NavItem {
  href: string;
  label: string;
  permission: string;
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

export const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', permission: 'dashboard.view', stage: 5, ready: true },
  { href: '/orders', label: 'Buyurtmalar', permission: 'orders.view', stage: 3, ready: true },
  { href: '/products', label: 'Mahsulotlar', permission: 'products.view', stage: 2, ready: true },
  { href: '/import', label: 'Import', permission: 'products.create', stage: 2, ready: true },
  { href: '/categories', label: 'Kategoriyalar', permission: 'categories.view', stage: 2, ready: true },
  { href: '/collections', label: 'Kolleksiyalar', permission: 'collections.view', stage: 2, ready: false },
  { href: '/inventory', label: 'Ombor', permission: 'inventory.view', stage: 3, ready: true },
  { href: '/customers', label: 'Mijozlar', permission: 'customers.view', stage: 6, ready: true },
  { href: '/returns', label: 'Qaytarishlar', permission: 'returns.view', stage: 6, ready: true },
  { href: '/payments', label: 'To‘lovlar', permission: 'payments.view', stage: 4, ready: true },
  { href: '/reconcile', label: 'Moslashtirish', permission: 'payments.view', stage: 4, ready: true },
  { href: '/fiscal', label: 'Fiskal cheklar', permission: 'fiscal.view', stage: 4, ready: true },
  { href: '/reviews', label: 'Sharhlar', permission: 'reviews.view', stage: 6, ready: false },
  { href: '/discounts', label: 'Chegirmalar', permission: 'discounts.view', stage: 7, ready: false },
  { href: '/content#banners', label: 'Bannerlar', permission: 'banners.view', stage: 7, ready: true },
  { href: '/content', label: 'Sahifalar', permission: 'content.view', stage: 7, ready: true },
  { href: '/content#blog', label: 'Blog', permission: 'blog.view', stage: 7, ready: true },
  { href: '/b2b', label: 'B2B lidlar', permission: 'b2b.view', stage: 7, ready: true },
  { href: '/reports', label: 'Hisobotlar', permission: 'reports.view', stage: 7, ready: true },
  { href: '/users', label: 'Adminlar', permission: 'users.view', stage: 1, ready: true },
  { href: '/roles', label: 'Rollar', permission: 'roles.view', stage: 1, ready: true },
  { href: '/audit', label: 'Audit log', permission: 'audit.view', stage: 5, ready: true },
  { href: '/delivery', label: 'Yetkazish', permission: 'settings.view', stage: 5, ready: true },
  { href: '/notifications', label: 'Bildirishnomalar', permission: 'settings.view', stage: 5, ready: true },
  { href: '/settings', label: 'Sozlamalar', permission: 'settings.view', stage: 1, ready: true },
];

export function visibleNav(permissions: string[], roleCode?: string): NavItem[] {
  if (roleCode === 'SUPER_ADMIN') return NAV;
  const owned = new Set(permissions);
  return NAV.filter((item) => owned.has(item.permission));
}
