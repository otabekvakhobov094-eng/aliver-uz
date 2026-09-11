/**
 * Admin panel sidebar. Har bir bo'lim uchun talab qilinadigan huquq
 * ko'rsatilgan — foydalanuvchi ko'ra olmaydigan bo'lim menyuda ham chiqmaydi.
 * TZ 58 va 74.
 */
export interface NavItem {
  href: string;
  label: string;
  permission: string;
  /** Qaysi etapda ishga tushadi — MVP rejasini ko'rsatib turadi. */
  stage: number;
}

export const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', permission: 'dashboard.view', stage: 5 },
  { href: '/orders', label: 'Buyurtmalar', permission: 'orders.view', stage: 3 },
  { href: '/products', label: 'Mahsulotlar', permission: 'products.view', stage: 2 },
  { href: '/import', label: 'Import', permission: 'products.create', stage: 2 },
  { href: '/categories', label: 'Kategoriyalar', permission: 'categories.view', stage: 2 },
  { href: '/collections', label: 'Kolleksiyalar', permission: 'collections.view', stage: 2 },
  { href: '/inventory', label: 'Ombor', permission: 'inventory.view', stage: 3 },
  { href: '/customers', label: 'Mijozlar', permission: 'customers.view', stage: 6 },
  { href: '/returns', label: 'Qaytarishlar', permission: 'returns.view', stage: 6 },
  { href: '/payments', label: 'To‘lovlar', permission: 'payments.view', stage: 4 },
  { href: '/reconcile', label: 'Moslashtirish', permission: 'payments.view', stage: 4 },
  { href: '/fiscal', label: 'Fiskal cheklar', permission: 'fiscal.view', stage: 4 },
  { href: '/reviews', label: 'Sharhlar', permission: 'reviews.view', stage: 6 },
  { href: '/discounts', label: 'Chegirmalar', permission: 'discounts.view', stage: 7 },
  { href: '/content#banners', label: 'Bannerlar', permission: 'banners.view', stage: 7 },
  { href: '/content', label: 'Sahifalar', permission: 'content.view', stage: 7 },
  { href: '/content#blog', label: 'Blog', permission: 'blog.view', stage: 7 },
  { href: '/b2b', label: 'B2B lidlar', permission: 'b2b.view', stage: 7 },
  { href: '/reports', label: 'Hisobotlar', permission: 'reports.view', stage: 7 },
  { href: '/users', label: 'Adminlar', permission: 'users.view', stage: 1 },
  { href: '/roles', label: 'Rollar', permission: 'roles.view', stage: 1 },
  { href: '/audit', label: 'Audit log', permission: 'audit.view', stage: 5 },
  { href: '/delivery', label: 'Yetkazish', permission: 'settings.view', stage: 5 },
  { href: '/notifications', label: 'Bildirishnomalar', permission: 'settings.view', stage: 5 },
  { href: '/settings', label: 'Sozlamalar', permission: 'settings.view', stage: 1 },
];

export function visibleNav(permissions: string[], roleCode?: string): NavItem[] {
  if (roleCode === 'SUPER_ADMIN') return NAV;
  const owned = new Set(permissions);
  return NAV.filter((item) => owned.has(item.permission));
}
