import { apiBase } from './api-base';

// Manzil HAR SO'ROVDA hisoblanadi: brauzerda nisbiy `/api`, serverda
// to'liq manzil. Modul yuklanganda bir marta hisoblansa, server uchun
// qurilgan qiymat brauzerga ham tushib qolardi.

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
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
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new AdminApiError(res.status, body?.message ?? res.statusText);
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

  templateUrl: () => `${apiBase()}/admin/import/products/template`,
};
