/**
 * Huquqlar matritsasi — TZ 74.
 * Kod: "<modul>.<harakat>". Seed shu ro'yxatdan bazani to'ldiradi.
 */
export const MODULES = [
  'dashboard',
  'orders',
  'products',
  'categories',
  'collections',
  'inventory',
  'customers',
  'reviews',
  'discounts',
  'banners',
  'content',
  'blog',
  'b2b',
  'reports',
  'returns',
  'fiscal',
  'payments',
  'users',
  'roles',
  'settings',
  'audit',
] as const;

export const ACTIONS = ['view', 'create', 'update', 'delete', 'export', 'approve'] as const;

export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];
export type PermissionCode = `${Module}.${Action}`;

export const ALL_PERMISSIONS: PermissionCode[] = MODULES.flatMap((m) =>
  ACTIONS.map((a) => `${m}.${a}` as PermissionCode),
);

/** TZ 73 — tizim rollari va ularning standart huquqlari. */
export const ROLE_PRESETS: Record<string, { name: string; permissions: PermissionCode[] | '*' }> = {
  SUPER_ADMIN: { name: 'Super Admin', permissions: '*' },

  ADMINISTRATOR: {
    name: 'Administrator',
    permissions: ALL_PERMISSIONS.filter(
      (p) => !p.startsWith('roles.') && !p.startsWith('users.delete'),
    ),
  },

  // Operator buyurtma bilan ishlaydi, lekin narxni o'zgartira olmaydi (TZ 74 misoli).
  OPERATOR: {
    name: 'Operator',
    permissions: [
      'dashboard.view',
      'orders.view',
      'orders.create',
      'orders.update',
      'customers.view',
      'customers.update',
      'returns.view',
      'returns.create',
      'products.view',
      'inventory.view',
    ],
  },

  WAREHOUSE_MANAGER: {
    name: 'Ombor menejeri',
    permissions: [
      'dashboard.view',
      'orders.view',
      'orders.update',
      'inventory.view',
      'inventory.update',
      'inventory.export',
      'products.view',
      'returns.view',
      'returns.update',
    ],
  },

  CONTENT_MANAGER: {
    name: 'Kontent menejeri',
    permissions: [
      'dashboard.view',
      'products.view',
      'products.create',
      'products.update',
      'categories.view',
      'categories.create',
      'categories.update',
      'collections.view',
      'collections.create',
      'collections.update',
      'content.view',
      'content.create',
      'content.update',
      'blog.view',
      'blog.create',
      'blog.update',
      'banners.view',
      'banners.create',
      'banners.update',
      'reviews.view',
      'reviews.approve',
    ],
  },

  MARKETING: {
    name: 'Marketing',
    permissions: [
      'dashboard.view',
      'discounts.view',
      'discounts.create',
      'discounts.update',
      'banners.view',
      'banners.create',
      'banners.update',
      'customers.view',
      'reports.view',
      'reports.export',
      'b2b.view',
      'b2b.update',
    ],
  },

  FINANCE: {
    name: 'Moliya',
    permissions: [
      'dashboard.view',
      'orders.view',
      'payments.view',
      'payments.update',
      'fiscal.view',
      'fiscal.update',
      'returns.view',
      'returns.approve',
      'reports.view',
      'reports.export',
      'audit.view',
    ],
  },

  SUPPORT: {
    name: 'Qo‘llab-quvvatlash',
    permissions: [
      'dashboard.view',
      'orders.view',
      'customers.view',
      'customers.update',
      'reviews.view',
      'returns.view',
      'returns.create',
      'b2b.view',
    ],
  },
};
