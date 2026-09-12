import { apiBase } from './api-base';

// Manzil HAR SO'ROVDA hisoblanadi: brauzerda nisbiy `/api`, serverda
// to'liq manzil. Modul yuklanganda bir marta hisoblansa, server uchun
// qurilgan qiymat brauzerga ham tushib qolardi.

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /**
     * Maydon bo'yicha xatolar, API bergan bo'lsa. Umumiy xabar bilan
     * cheklanib qolsak, foydalanuvchi 20 ta maydonli formada qaysi biri
     * noto'g'ri ekanini topa olmaydi.
     */
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export interface CmsRecord {
  id: string;
  slug?: string;
  placement?: string;
  titleUz?: string | null;
  titleRu?: string | null;
  questionUz?: string;
  fromPath?: string;
  toPath?: string;
  isPublished?: boolean;
  isActive?: boolean;
  updatedAt?: string;
}

export interface B2bLead {
  id: string; company: string; contactPerson: string; phone: string; telegram: string | null;
  city: string | null; businessType: string | null; monthlyVolume: string | null;
  comment: string | null; status: string; createdAt: string;
}

export interface AdminCollection {
  id: string;
  slug: string;
  nameUz: string;
  nameRu: string;
  isActive?: boolean;
  productCount?: number;
}

export interface AdminDiscount {
  id: string;
  code: string | null;
  nameUz: string;
  nameRu: string;
  type: 'PERCENT' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  scope: 'CART' | 'PRODUCT' | 'CATEGORY' | 'COLLECTION';
  value: number;
  minOrderAmount: string | null;
  maxDiscountAmount: string | null;
  minQuantity: number | null;
  usageLimit: number | null;
  usagePerCustomer: number | null;
  usedCount: number;
  stackable: boolean;
  priority: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

export interface AdminReview {
  id: string;
  rating: number;
  body: string | null;
  mediaUrls: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isVerified: boolean;
  adminReply: string | null;
  createdAt: string;
  product: { id: string; slug: string; nameUz: string };
  customer: { id: string; fullName: string | null; phone: string | null };
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'BLOCKED';
  lastLoginAt: string | null;
  twoFaEnabled: boolean;
  createdAt: string;
  role: { id: string; code: string; name: string };
}

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  adminCount: number;
  permissions: string[];
}

export interface PermissionMatrix {
  modules: Array<{ key: string; label: string }>;
  actions: Array<{ key: string; label: string }>;
  permissions: string[];
}

export type SettingType = 'string' | 'number' | 'boolean' | 'enum' | 'stringList';

export interface SettingItem {
  key: string;
  group: string;
  label: string;
  help?: string;
  type: SettingType;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  unit?: string;
  sensitive?: boolean;
  value: unknown;
  missing: boolean;
}

export interface SettingsPayload {
  groups: Array<{ key: string; label: string; help?: string }>;
  settings: SettingItem[];
}

export interface DashboardData {
  period: { from: string; to: string; key: string };
  revenue: string;
  orders: number;
  avgOrder: string;
  newCustomers: number;
  paidOrders: number;
  allOrders: number;
  cancelledOrders: number;
  lowStock: number;
  previous: { revenue: string; orders: number };
  series: Array<{ day: string; revenue: string; orders: number }>;
}

export interface ReportOverview {
  period: { from: string; to: string };
  orders: { count: number; revenue: string; discount: string; shipping: string };
  newCustomers: number;
  topProducts: Array<{ productName: string; _sum: { quantity: number | null; lineTotal: string | null } }>;
  b2b: Array<{ status: string; _count: number }>;
  attribution: Array<{ utmSource: string | null; _count: number; _sum: { grandTotal: string | null } }>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string; errors?: Record<string, string> }
      | null;
    throw new AdminApiError(res.status, body?.message ?? res.statusText, body?.errors);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export interface AdminProduct {
  id: string;
  slug: string;
  nameUz: string;
  nameRu: string;
  status: string;
  ikpuCode: string;
  vatRate: number;
  minPrice: string;
  maxPrice: string;
  hasSale: boolean;
  inStock: boolean;
  variantsCount: number;
  imageUrl: string | null;
  updatedAt: string;
}

/** Mahsulot formasidagi bitta variant. */
export interface AdminVariantInput {
  id?: string;
  sku: string;
  barcode?: string | null;
  options?: Record<string, string>;
  /** So'mda, matn — forma inputidan kelganidek. Backend tiyinga aylantiradi. */
  price: string;
  oldPrice?: string | null;
  costPrice?: string | null;
  weightGrams?: number | null;
  volumeMl?: number | null;
  isActive?: boolean;
}

export interface AdminKeyIngredient {
  nameUz: string;
  nameRu: string;
  roleUz: string;
  roleRu: string;
}

/** `GET /admin/catalog/products/:id` javobi — Prisma yozuvi to'liq qaytadi. */
export interface AdminProductDetail {
  id: string;
  slug: string;
  brandId: string | null;
  nameUz: string;
  nameRu: string;
  nameEn: string | null;
  shortDescUz: string | null;
  shortDescRu: string | null;
  descUz: string | null;
  descRu: string | null;
  benefitsUz: string | null;
  benefitsRu: string | null;
  ingredientsUz: string;
  ingredientsRu: string;
  keyIngredients: AdminKeyIngredient[] | null;
  claimUz: string | null;
  claimRu: string | null;
  howToUseUz: string | null;
  howToUseRu: string | null;
  warningsUz: string;
  warningsRu: string;
  countryOfOrigin: string | null;
  manufacturer: string | null;
  shelfLifeMonths: number | null;
  ikpuCode: string;
  vatRate: number;
  unitCode: string;
  status: string;
  isFeatured: boolean;
  seoTitleUz: string | null;
  seoTitleRu: string | null;
  seoDescUz: string | null;
  seoDescRu: string | null;
  variants: Array<{
    id: string;
    sku: string;
    barcode: string | null;
    options: Record<string, string> | null;
    price: string;
    oldPrice: string | null;
    costPrice: string | null;
    weightGrams: number | null;
    volumeMl: number | null;
    isActive: boolean;
  }>;
  images: Array<{ id: string; url: string; altUz: string | null; kind: string }>;
  categories: Array<{ categoryId: string }>;
  collections: Array<{ collectionId: string }>;
  tags: Array<{ tag: { slug: string } }>;
}

export interface AdminBrand {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
}

export interface AdminCategory {
  id: string;
  slug: string;
  nameUz: string;
  nameRu: string;
  isActive: boolean;
  depth: number;
  productCount?: number;
  children: AdminCategory[];
}

export interface ImportSummary {
  jobId: string | null;
  mode: string;
  totalRows: number;
  products: number;
  created: number;
  updated: number;
  skipped: number;
  errorRows: number;
  errors: Array<{ row: number; column: string; message: string }>;
  plan: Array<{ productSlug: string; action: 'create' | 'update' | 'skip'; variants: number }>;
}

export interface AdminOrderRow {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  paymentProvider: string | null;
  firstName: string;
  lastName: string | null;
  contactPhone: string;
  regionName: string | null;
  itemsCount: number;
  grandTotal: string;
  placedAt: string;
  reservationExpiresAt: string | null;
}

export interface AdminOrderDetail {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  contactPhone: string;
  firstName: string;
  lastName: string | null;
  comment: string | null;
  regionName: string | null;
  districtName: string | null;
  addressLine: string | null;
  landmark: string | null;
  deliveryType: string;
  deliveryEtaFrom: string | null;
  deliveryEtaTo: string | null;
  appliedCouponCode: string | null;
  reservationExpiresAt: string | null;
  placedAt: string;
  subtotal: string;
  discountTotal: string;
  shippingTotal: string;
  vatTotal: string;
  grandTotal: string;
  deliveryMethod: { code: string; nameUz: string; nameRu: string } | null;
  customer: { id: string; phone: string; ordersCount: number; totalSpent: string } | null;
  items: Array<{
    id: string;
    productName: string;
    variantName: string | null;
    sku: string;
    ikpuCode: string;
    vatRate: number;
    quantity: number;
    unitPrice: string;
    discountAmount: string;
    vatAmount: string;
    lineTotal: string;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    status: string;
    amount: string;
    createdAt: string;
  }>;
  reservations: Array<{
    id: string;
    variantId: string;
    quantity: number;
    status: string;
    expiresAt: string | null;
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    source: string;
    comment: string | null;
    createdAt: string;
    admin: { fullName: string } | null;
  }>;
}

export interface LowStockRow {
  variantId: string;
  sku: string;
  options: Record<string, string>;
  productName: string;
  productSlug: string;
  available: number;
  threshold: number;
}

export interface StockMovement {
  id: string;
  delta: number;
  reason: string;
  comment: string | null;
  createdAt: string;
  admin: { fullName: string } | null;
}

/* ------------------------------- To'lovlar ------------------------------- */

export interface AdminPaymentRow {
  id: string;
  orderId: string;
  orderNumber: string | null;
  contactPhone: string | null;
  provider: string;
  status: string;
  amount: string;
  refundedAmount: string;
  providerTxnId: string | null;
  paidAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface AdminPaymentDetail extends AdminPaymentRow {
  order: { id: string; number: string; grandTotal: string; status: string } | null;
  transactions: Array<{
    id: string;
    state: string;
    amount: string;
    reason: number | null;
    performedAt: string | null;
    cancelledAt: string | null;
    createdAt: string;
  }>;
  fiscal: Array<{
    id: string;
    type: string;
    status: string;
    totalAmount: string;
    fiscalSign: string | null;
    receiptUrl: string | null;
  }>;
  logs: Array<{
    id: string;
    direction: string;
    endpoint: string | null;
    httpStatus: number | null;
    createdAt: string;
    request: unknown;
    response: unknown;
  }>;
}

export interface FiscalReceiptRow {
  id: string;
  orderId: string;
  orderNumber: string | null;
  type: string;
  status: string;
  totalAmount: string;
  vatAmount: string;
  fiscalSign: string | null;
  receiptUrl: string | null;
  attempts: number;
  lastError: string | null;
  nextRetryAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface ReconcileMismatch {
  kind: 'MISSING_LOCALLY' | 'MISSING_AT_PROVIDER' | 'AMOUNT_MISMATCH' | 'CANCELLED_AT_PROVIDER';
  providerTxnId: string | null;
  orderNumber: string | null;
  paymentId: string | null;
  localAmount: string | null;
  providerAmount: string | null;
  note: string;
  severity: 1 | 2 | 3;
}

export interface ReconcileReport {
  mode: string;
  provider: string;
  source: string;
  checkedLocal: number;
  checkedProvider: number;
  matched: number;
  mismatches: ReconcileMismatch[];
  totals: { localPaid: string; providerPerformed: string; difference: string };
}


/* ------------------------- Yetkazish va jo'natmalar ------------------------ */

export interface AdminRegion {
  id: string;
  code: string;
  nameUz: string;
  nameRu: string;
  sortOrder: number;
  isActive: boolean;
  districtsCount: number;
  districts: Array<{
    id: string;
    code: string;
    nameUz: string;
    nameRu: string;
    sortOrder: number;
    isActive: boolean;
  }>;
}

export interface AdminDeliveryMethod {
  id: string;
  code: string;
  type: 'COURIER' | 'EXPRESS' | 'PICKUP';
  nameUz: string;
  nameRu: string;
  descUz: string | null;
  descRu: string | null;
  basePrice: string;
  freeThreshold: string | null;
  minOrderAmount: string | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
  sortOrder: number;
  ordersCount: number;
  regionsConfigured: number;
}

export interface MethodRegionRow {
  regionId: string;
  regionNameUz: string;
  regionNameRu: string;
  regionActive: boolean;
  configured: boolean;
  price: string;
  freeThreshold: string | null;
  daysMin: number;
  daysMax: number;
  isAvailable: boolean;
}

export interface Shipment {
  id: string;
  orderId: string;
  status: string;
  carrier: string | null;
  trackingNo: string | null;
  trackUrl: string | null;
  courierName: string | null;
  courierPhone: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface NotificationRow {
  id: string;
  channel: string;
  status: string;
  recipient: string;
  template: string;
  lang: string;
  body: string | null;
  orderId: string | null;
  orderNumber: string | null;
  attempts: number;
  error: string | null;
  scheduledAt: string;
  sentAt: string | null;
  createdAt: string;
  smsParts: number | null;
}

export interface AuditRow {
  id: string;
  module: string;
  action: string;
  recordId: string | null;
  adminName: string | null;
  adminEmail: string | null;
  ip: string | null;
  createdAt: string;
  changedFields: string[];
}

export interface AuditDetail extends AuditRow {
  userAgent: string | null;
  before: unknown;
  after: unknown;
  diff: Array<{ field: string; before: unknown; after: unknown }>;
}


/* ----------------------------- Qaytarishlar ----------------------------- */

export interface AdminReturnRow {
  id: string;
  number: string;
  status: string;
  reasonCode: string;
  orderNumber: string | null;
  contactPhone: string | null;
  refundAmount: string;
  itemsCount: number;
  createdAt: string;
}

export interface AdminReturnDetail {
  id: string;
  number: string;
  status: string;
  reasonCode: string;
  comment: string | null;
  resolutionNote: string | null;
  refundAmount: string;
  refundedAt: string | null;
  refundMethod: string | null;
  handledBy: string | null;
  createdAt: string;
  order: { id: string; number: string; shippingTotal: string };
  items: Array<{
    id: string;
    orderItemId: string;
    productName: string;
    variantName: string | null;
    sku: string;
    imageUrl: string | null;
    quantity: number;
    refundAmount: string;
    condition: string;
    restocked: boolean;
  }>;
  receipts: Array<{ id: string; status: string; receiptUrl: string | null; fiscalSign: string | null }>;
}

/* ------------------------------- Mijozlar ------------------------------- */

export interface AdminCustomerRow {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  status: string;
  locale: string;
  ordersCount: number;
  totalSpent: string;
  lastOrderAt: string | null;
  segment: string;
  createdAt: string;
}

export interface AdminCustomerDetail {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  status: string;
  locale: string;
  telegramLinked: boolean;
  segment: string;
  stats: {
    ordersCount: number;
    totalSpent: string;
    avgCheck: string;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
  };
  addresses: Array<{
    id: string;
    label: string | null;
    recipient: string;
    phone: string;
    address: string;
    isDefault: boolean;
  }>;
  orders: Array<{
    id: string;
    number: string;
    status: string;
    paymentStatus: string;
    grandTotal: string;
    placedAt: string;
  }>;
  returns: Array<{ id: string; number: string; status: string; refundAmount: string; createdAt: string }>;
  notes: Array<{ id: string; body: string; adminName: string | null; createdAt: string }>;
  consents: Array<{ type: string; granted: boolean; at: string }>;
  createdAt: string;
}

export const adminApi = {
  login: (email: string, password: string, totp?: string) =>
    request<{ admin: { id: string; email: string; fullName: string; role: string } }>(
      '/admin/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password, totp }) },
    ),
  me: () => request('/admin/me'),
  permissions: () => request<{ role: string; permissions: string[] }>('/admin/permissions'),
  logout: () => request('/admin/auth/logout', { method: 'POST' }),

  products: (params: { q?: string; status?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.status) qs.set('status', params.status);
    if (params.page) qs.set('page', String(params.page));
    return request<{ items: AdminProduct[]; total: number; page: number; perPage: number }>(
      `/admin/catalog/products?${qs.toString()}`,
    );
  },

  bulkStatus: (ids: string[], status: string) =>
    request<{ updated: number }>('/admin/catalog/products/bulk/status', {
      method: 'POST',
      body: JSON.stringify({ ids, status }),
    }),

  productDetail: (id: string) =>
    request<AdminProductDetail>(`/admin/catalog/products/${id}`),

  createProduct: (body: unknown) =>
    request<AdminProductDetail>('/admin/catalog/products', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateProduct: (id: string, body: unknown) =>
    request<AdminProductDetail>(`/admin/catalog/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteProduct: (id: string) =>
    request<{ ok: true }>(`/admin/catalog/products/${id}`, { method: 'DELETE' }),

  brands: () => request<AdminBrand[]>('/admin/catalog/brands'),

  categories: () => request<AdminCategory[]>('/admin/catalog/categories'),

  /** Import: fayl multipart bilan yuboriladi, shuning uchun Content-Type qo'yilmaydi. */
  async importProducts(file: File, mode: string): Promise<ImportSummary> {
    const form = new FormData();
    form.append('file', file);
    form.append('mode', mode);
    const res = await fetch(`${apiBase()}/admin/import/products`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new AdminApiError(res.status, body?.message ?? res.statusText);
    }
    return (await res.json()) as ImportSummary;
  },

  orders: (params: {
    q?: string;
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return request<{ items: AdminOrderRow[]; total: number; page: number; perPage: number }>(
      `/admin/orders?${qs.toString()}`,
    );
  },

  order: (id: string) => request<AdminOrderDetail>(`/admin/orders/${id}`),

  /** Ruxsat etilgan status o'tishlari — tugmalar shu ro'yxatdan chiziladi. */
  orderTransitions: () => request<Record<string, string[]>>('/admin/orders/transitions'),

  changeOrderStatus: (id: string, status: string, comment?: string) =>
    request<unknown>(`/admin/orders/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, comment }),
    }),

  lowStock: () => request<LowStockRow[]>('/admin/inventory/low-stock'),

  variantStock: (variantId: string) =>
    request<{ totalStock: number; reservedStock: number; availableStock: number } | null>(
      `/admin/inventory/variants/${variantId}`,
    ),

  stockMovements: (variantId: string) =>
    request<StockMovement[]>(`/admin/inventory/variants/${variantId}/movements`),

  /** Qoldiqni qo'lda o'zgartirish — sabab MAJBURIY (ekspertiza A-6). */
  adjustStock: (variantId: string, delta: number, reason: string, comment: string) =>
    request<unknown>(`/admin/inventory/variants/${variantId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ delta, reason, comment }),
    }),

  expireReservations: () =>
    request<{ checked: number; cancelled: number }>('/admin/inventory/reservations/expire', {
      method: 'POST',
    }),

  payments: (params: {
    q?: string;
    provider?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return request<{
      items: AdminPaymentRow[];
      total: number;
      page: number;
      perPage: number;
      totals: { paid: string; refunded: string };
    }>(`/admin/payments?${qs.toString()}`);
  },

  payment: (id: string) => request<AdminPaymentDetail>(`/admin/payments/${id}`),

  /** Naqd to'lovni qabul qilish — shu paytda fiskal chek ham navbatga tushadi. */
  markCashPaid: (id: string, comment?: string) =>
    request<unknown>(`/admin/payments/${id}/cash`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    }),

  refundPayment: (id: string, amount: string, reason: string) =>
    request<unknown>(`/admin/payments/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount), reason }),
    }),

  reconcile: (dateFrom: string, dateTo: string, provider?: string) => {
    const qs = new URLSearchParams({ dateFrom, dateTo, ...(provider ? { provider } : {}) });
    return request<ReconcileReport>(`/admin/payments/reconcile?${qs.toString()}`);
  },

  fiscalReceipts: (params: { status?: string; type?: string; page?: number }) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return request<{
      items: FiscalReceiptRow[];
      total: number;
      page: number;
      perPage: number;
      mock: boolean;
    }>(`/admin/fiscal/receipts?${qs.toString()}`);
  },

  retryFiscalReceipt: (id: string) =>
    request<{ status: string; error?: string }>(`/admin/fiscal/receipts/${id}/retry`, {
      method: 'POST',
    }),

  /** Chek qurilishida xato bo‘lgan buyurtma uchun chekni qayta qurish. */
  rebuildFiscalReceipt: (orderId: string) =>
    request<{ rebuilt: boolean; message: string }>(`/admin/fiscal/orders/${orderId}/rebuild`, {
      method: 'POST',
    }),

  runFiscalQueue: () =>
    request<{ sent: number; failed: number }>('/admin/fiscal/queue/run', { method: 'POST' }),

  /* ------------------------------ Yetkazish ------------------------------ */

  deliveryRegions: () => request<AdminRegion[]>('/admin/delivery/regions'),

  upsertRegion: (body: Record<string, unknown>) =>
    request<unknown>('/admin/delivery/regions', { method: 'POST', body: JSON.stringify(body) }),

  setRegionActive: (id: string, isActive: boolean) =>
    request<unknown>(`/admin/delivery/regions/${id}/active`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    }),

  upsertDistrict: (body: Record<string, unknown>) =>
    request<unknown>('/admin/delivery/districts', { method: 'POST', body: JSON.stringify(body) }),

  setDistrictActive: (id: string, isActive: boolean) =>
    request<unknown>(`/admin/delivery/districts/${id}/active`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    }),

  deliveryMethods: () => request<AdminDeliveryMethod[]>('/admin/delivery/methods'),

  upsertDeliveryMethod: (body: Record<string, unknown>) =>
    request<unknown>('/admin/delivery/methods', { method: 'POST', body: JSON.stringify(body) }),

  setMethodActive: (id: string, isActive: boolean) =>
    request<unknown>(`/admin/delivery/methods/${id}/active`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    }),

  methodRegions: (id: string) =>
    request<{ method: Record<string, unknown>; rows: MethodRegionRow[] }>(
      `/admin/delivery/methods/${id}/regions`,
    ),

  saveMethodRegions: (id: string, rows: Array<Record<string, unknown>>) =>
    request<{ rows: MethodRegionRow[] }>(`/admin/delivery/methods/${id}/regions`, {
      method: 'PUT',
      body: JSON.stringify({ rows }),
    }),

  /* ------------------------------ Jo'natmalar ------------------------------ */

  carriers: () =>
    request<{
      carriers: Array<{ code: string; label: string }>;
      transitions: Record<string, string[]>;
    }>('/admin/shipments/carriers'),

  orderShipments: (orderId: string) => request<Shipment[]>(`/admin/shipments/order/${orderId}`),

  assignShipment: (orderId: string, body: Record<string, unknown>) =>
    request<Shipment>(`/admin/shipments/order/${orderId}/assign`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  changeShipmentStatus: (id: string, status: string, note?: string) =>
    request<Shipment>(`/admin/shipments/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    }),

  waybill: (orderId: string) =>
    request<Record<string, unknown>>(`/admin/shipments/order/${orderId}/waybill`),

  /* ------------------------- Buyurtma guruh amallari ------------------------- */

  bulkOrderStatus: (orderIds: string[], status: string, comment?: string) =>
    request<{
      changed: number;
      failed: Array<{ orderId: string; number: string | null; message: string }>;
    }>('/admin/orders/bulk/status', {
      method: 'POST',
      body: JSON.stringify({ orderIds, status, comment }),
    }),

  orderNotifications: (orderId: string) =>
    request<NotificationRow[]>(`/admin/orders/${orderId}/notifications`),

  orderAudit: (orderId: string) =>
    request<Array<{ id: string; module: string; action: string; adminName: string | null; createdAt: string; diff: Array<{ field: string; before: unknown; after: unknown }> }>>(
      `/admin/orders/${orderId}/audit`,
    ),

  /* ---------------------------- Bildirishnomalar ---------------------------- */

  notifications: (params: { channel?: string; status?: string; template?: string; page?: number }) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return request<{
      items: NotificationRow[];
      total: number;
      page: number;
      perPage: number;
      smsMock: boolean;
      telegramMock: boolean;
    }>(`/admin/notifications?${qs.toString()}`);
  },

  notificationTemplates: () =>
    request<
      Array<{
        key: string;
        staff: boolean;
        samples: Array<{ lang: string; text: string; parts: number; encoding: string; length: number }>;
      }>
    >('/admin/notifications/templates'),

  retryNotification: (id: string) =>
    request<{ status: string; error?: string }>(`/admin/notifications/${id}/retry`, {
      method: 'POST',
    }),

  runNotificationQueue: () =>
    request<{ sent: number; failed: number }>('/admin/notifications/queue/run', { method: 'POST' }),

  /* -------------------------------- Audit -------------------------------- */

  audit: (params: {
    module?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return request<{ items: AuditRow[]; total: number; page: number; perPage: number }>(
      `/admin/audit?${qs.toString()}`,
    );
  },

  auditFacets: () => request<{ modules: string[]; actions: string[] }>('/admin/audit/facets'),

  auditEntry: (id: string) => request<AuditDetail>(`/admin/audit/${id}`),

  /* ----------------------------- Qaytarishlar ----------------------------- */

  returns: (params: { status?: string; q?: string; page?: number }) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return request<{ items: AdminReturnRow[]; total: number; page: number; perPage: number }>(
      `/admin/returns?${qs.toString()}`,
    );
  },

  returnEntry: (id: string) => request<AdminReturnDetail>(`/admin/returns/${id}`),

  returnTransitions: () => request<Record<string, string[]>>('/admin/returns/transitions'),

  changeReturnStatus: (
    id: string,
    status: string,
    comment?: string,
    conditions?: Array<{ returnItemId: string; condition: string }>,
  ) =>
    request<AdminReturnDetail>(`/admin/returns/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, comment, conditions }),
    }),

  /* ------------------------------- Mijozlar ------------------------------- */

  customers: (params: { q?: string; segment?: string; status?: string; page?: number }) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    }
    return request<{ items: AdminCustomerRow[]; total: number; page: number; perPage: number }>(
      `/admin/customers?${qs.toString()}`,
    );
  },

  customer: (id: string) => request<AdminCustomerDetail>(`/admin/customers/${id}`),

  customerSegments: () =>
    request<Array<{ code: string; uz: string; ru: string }>>('/admin/customers/segments'),

  addCustomerNote: (id: string, body: string) =>
    request<AdminCustomerDetail>(`/admin/customers/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  setCustomerStatus: (id: string, status: 'ACTIVE' | 'BLOCKED') =>
    request<AdminCustomerDetail>(`/admin/customers/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  /* ------------------------------- CMS 7-etap ------------------------------- */

  contentPages: () => request<CmsRecord[]>('/admin/content/pages'),
  blogPosts: () => request<CmsRecord[]>('/admin/content/blog'),
  banners: () => request<CmsRecord[]>('/admin/content/banners'),
  faqs: () => request<CmsRecord[]>('/admin/content/faq'),
  redirects: () => request<CmsRecord[]>('/admin/content/redirects'),
  createCms: (section: string, body: Record<string, unknown>) =>
    request<CmsRecord>(`/admin/content/${section}`, { method: 'POST', body: JSON.stringify(body) }),
  updateCms: (section: string, id: string, body: Record<string, unknown>) =>
    request<CmsRecord>(`/admin/content/${section}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCms: (section: string, id: string) =>
    request<void>(`/admin/content/${section}/${id}`, { method: 'DELETE' }),
  b2bLeads: (status?: string) => request<B2bLead[]>(`/admin/b2b${status ? `?status=${status}` : ''}`),
  updateB2bLead: (id: string, body: Record<string, unknown>) =>
    request<B2bLead>(`/admin/b2b/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  reportOverview: (from?: string, to?: string) => {
    const qs = new URLSearchParams(); if (from) qs.set('from', from); if (to) qs.set('to', to);
    return request<ReportOverview>(`/admin/reports/overview?${qs.toString()}`);
  },

  dashboard: (period: string, from?: string, to?: string) => {
    const qs = new URLSearchParams({ period });
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    return request<DashboardData>(`/admin/reports/dashboard?${qs.toString()}`);
  },

  collections: () => request<AdminCollection[]>('/admin/collections'),
  createCollection: (body: Record<string, unknown>) =>
    request<AdminCollection>('/admin/collections', { method: 'POST', body: JSON.stringify(body) }),
  updateCollection: (id: string, body: Record<string, unknown>) =>
    request<AdminCollection>(`/admin/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteCollection: (id: string) =>
    request<{ ok: true }>(`/admin/collections/${id}`, { method: 'DELETE' }),

  discounts: (state?: string) =>
    request<AdminDiscount[]>(`/admin/discounts${state ? `?state=${state}` : ''}`),
  createDiscount: (body: Record<string, unknown>) =>
    request<AdminDiscount>('/admin/discounts', { method: 'POST', body: JSON.stringify(body) }),
  updateDiscount: (id: string, body: Record<string, unknown>) =>
    request<AdminDiscount>(`/admin/discounts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  toggleDiscount: (id: string) =>
    request<AdminDiscount>(`/admin/discounts/${id}/toggle`, { method: 'POST' }),
  deleteDiscount: (id: string) =>
    request<{ ok: true }>(`/admin/discounts/${id}`, { method: 'DELETE' }),

  reviews: (params?: { status?: string; rating?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.rating) qs.set('rating', params.rating);
    const s = qs.toString();
    return request<{ items: AdminReview[]; counts: Record<string, number> }>(
      `/admin/reviews${s ? `?${s}` : ''}`,
    );
  },
  moderateReview: (id: string, status: string, adminReply?: string | null) =>
    request<AdminReview>(`/admin/reviews/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ status, adminReply }),
    }),
  bulkModerateReviews: (ids: string[], status: string) =>
    request<{ updated: number }>('/admin/reviews/bulk', {
      method: 'POST',
      body: JSON.stringify({ ids, status }),
    }),

  users: (params?: { q?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.status) qs.set('status', params.status);
    const suffix = qs.toString();
    return request<AdminUser[]>(`/admin/users${suffix ? `?${suffix}` : ''}`);
  },

  createUser: (body: {
    fullName: string;
    email: string;
    phone?: string;
    roleId: string;
    password: string;
  }) =>
    request<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(body) }),

  updateUser: (
    id: string,
    body: { fullName?: string; phone?: string | null; roleId?: string; status?: string },
  ) => request<AdminUser>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  resetUserPassword: (id: string, password: string) =>
    request<{ ok: true }>(`/admin/users/${id}/password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  deleteUser: (id: string) => request<{ ok: true }>(`/admin/users/${id}`, { method: 'DELETE' }),

  roles: () => request<AdminRole[]>('/admin/roles'),
  permissionMatrix: () => request<PermissionMatrix>('/admin/roles/matrix'),
  createRole: (body: { name: string; code?: string; description?: string; permissions: string[] }) =>
    request<AdminRole>('/admin/roles', { method: 'POST', body: JSON.stringify(body) }),
  updateRole: (
    id: string,
    body: { name?: string; description?: string | null; permissions?: string[] },
  ) => request<AdminRole>(`/admin/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteRole: (id: string) => request<{ ok: true }>(`/admin/roles/${id}`, { method: 'DELETE' }),

  settings: () => request<SettingsPayload>('/admin/settings'),

  saveSettings: (changes: Record<string, unknown>) =>
    request<{ saved: number; values: Record<string, unknown> }>('/admin/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ changes }),
    }),

  templateUrl: () => `${apiBase()}/admin/import/products/template`,
};
