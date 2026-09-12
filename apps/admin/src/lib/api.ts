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

export interface AdminMenuItem {
  id: string;
  location: string;
  parentId: string | null;
  labelUz: string;
  labelRu: string;
  noteUz: string | null;
  noteRu: string | null;
  targetType: string;
  targetValue: string | null;
  sortOrder: number;
  isActive: boolean;
  isHighlighted: boolean;
  /** Server hisoblab beradi — bandning saytdagi manzili. */
  href: string;
  /**
   * Nishoni endi mavjud emas (kategoriya o'chirilgan, sahifa nashrdan
   * olingan). Bunday band SAYTDA KO'RINMAYDI, admin esa uni qizil
   * holda ko'radi va tuzatadi.
   */
  broken: boolean;
}

export interface MenuOptions {
  targetTypes: string[];
  routes: string[];
}

export interface LoyaltyBalance {
  points: number;
  /** Ballning so'mdagi qiymati, tiyinda — string (BigInt). */
  amount: string;
  rate: {
    pointsPerSum: string;
    tiyinPerPoint: string;
    maxRedeemSharePercent: number;
    expiryMonths: number;
    expiryWarnDays: number;
  };
  /** `none` — kuyadigan ball yo'q; `warning` — 14 kun ichida kuyadi. */
  stage: 'none' | 'active' | 'warning' | 'due';
  expiresAt: string | null;
  daysLeft: number | null;
}

export interface LoyaltyExpiringRow {
  customerId: string;
  phone: string | null;
  name: string | null;
  points: number;
  amount: string;
  lastActivityAt: string;
  expiresAt: string | null;
  daysLeft: number | null;
}

export interface LoyaltyExpiredRow {
  id: string;
  customerId: string;
  phone: string | null;
  name: string | null;
  points: number;
  amount: string;
  createdAt: string;
}

export interface LoyaltyEntry {
  id: string;
  kind: string;
  points: number;
  amount: string;
  comment: string | null;
  orderNumber: string | null;
  createdAt: string;
}

export interface LoyaltyView {
  balance: LoyaltyBalance;
  history: LoyaltyEntry[];
}

export interface UzumSyncRow {
  sku: string;
  externalId: string | null;
  nameUz: string;
  local: { priceTiyin: string | null; available: number | null };
  remote: { priceTiyin: string | null; stock: number | null };
  target: { priceTiyin: string | null; stock: number | null };
  action: 'ok' | 'stock' | 'price' | 'both' | 'only-here' | 'only-there';
  note: string;
}

export interface UzumSyncPlan {
  rows: UzumSyncRow[];
  summary: {
    total: number;
    ok: number;
    needsStock: number;
    needsPrice: number;
    onlyHere: number;
    onlyThere: number;
    /** Narx faqat ustama sozlanganda taqqoslanadi. */
    priceSyncEnabled: boolean;
    markupPercent: number | null;
    reserveStock: number;
  };
}

export interface UzumStatus {
  ready: boolean;
  missing: string[];
  baseUrl: string;
}

export interface UzumProductPreview {
  total: number;
  readable: number;
  unreadable: number;
  alreadyInCatalog: number;
  newToCatalog: number;
  sample: Array<{ externalId: string; nameUz: string; sku: string | null }>;
}

export interface UzumReviewImport {
  total: number;
  readable: number;
  unreadable: number;
  created: number;
  duplicate: number;
  unmatched: number;
  unmatchedSample: Array<{ externalId: string; sku: string | null; rating: number }>;
  dryRun: boolean;
}

export interface ShopifyPreview {
  sourceUrl: string;
  usdToUzs: number;
  total: number;
  willCreate: number;
  willUpdate: number;
  images: number;
  variants: number;
  brands: Array<{ name: string; count: number }>;
  categories: Array<{ name: string; count: number }>;
  sample: Array<{
    handle: string;
    title: string;
    brand: string;
    category: string;
    collections: string[];
    variants: number;
    images: number;
    minPriceSum: number;
    maxPriceSum: number;
    published: boolean;
  }>;
}

export interface ShopifyImportResult {
  jobId: string;
  total: number;
  created: number;
  updated: number;
  failed: number;
  brands: string[];
  errors: Array<{ row: number; column: string; message: string }>;
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
  period: { from: string; to: string; key?: string };
  orders: { count: number; revenue: string; discount: string; shipping: string };
  newCustomers: number;
  topProducts: Array<{ productName: string; _sum: { quantity: number | null; lineTotal: string | null } }>;
  b2b: Array<{ status: string; _count: number }>;
  attribution: Array<{ utmSource: string | null; _count: number; _sum: { grandTotal: string | null } }>;
}

/**
 * So'rov muddati.
 *
 * Bunsiz `fetch` CHEKSIZ kutadi va aynan shu adminka «qotib qolgan»
 * degan holatni yaratardi: tugma «Tekshirilmoqda…» da abadiy turardi,
 * xato ham, natija ham chiqmasdi.
 *
 * Render'ning bepul servisi 15 daqiqa trafiksiz qolsa uxlaydi va
 * uyg'onishi bir daqiqagacha ketadi, shuning uchun muddat 60 soniya —
 * sovuq startni kesib yubormasligi kerak.
 */
const TIMEOUT_MS = 60_000;

/** Tarmoq yiqilgani yoki muddat o'tgani — 4xx/5xx dan FARQLI holat. */
export class AdminNetworkError extends Error {
  constructor(
    message: string,
    readonly kind: 'timeout' | 'offline',
  ) {
    super(message);
    this.name = 'AdminNetworkError';
  }
}

async function once<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === 'TimeoutError';
    throw new AdminNetworkError(
      timedOut
        ? 'Server javob bermadi (60 soniya kutildi).'
        : 'Serverga ulanib bo‘lmadi.',
      timedOut ? 'timeout' : 'offline',
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string; errors?: Record<string, string> }
      | null;
    throw new AdminApiError(res.status, body?.message ?? res.statusText, body?.errors);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/**
 * Sovuq startda BIR MARTA qayta urinadi.
 *
 * Uxlab qolgan servisga birinchi so'rov muddati o'tishi bilan tugaydi,
 * ikkinchisi esa odatda o'tadi — chunki birinchi so'rov servisni
 * uyg'otib yuborgan bo'ladi.
 *
 * Qayta urinish FAQAT o'qish so'rovlari va login uchun: `POST` bilan
 * yozilgan amalni takrorlash uni ikki marta bajarishi mumkin.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const safeToRetry = method === 'GET' || path === '/admin/auth/login';

  try {
    return await once<T>(path, init);
  } catch (e) {
    if (safeToRetry && e instanceof AdminNetworkError && e.kind === 'timeout') {
      return once<T>(path, init);
    }
    throw e;
  }
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
  images: Array<{
    id: string;
    url: string;
    urlWebp: string | null;
    altUz: string | null;
    altRu: string | null;
    kind: string;
    sortOrder: number;
  }>;
  categories: Array<{ categoryId: string }>;
  collections: Array<{ collectionId: string }>;
  tags: Array<{ tag: { slug: string } }>;
}

export interface GiftCardRow {
  id: string;
  tail: string;
  masked: string;
  initialAmount: string;
  remaining: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';
  recipientName: string | null;
  recipientPhone: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface GiftCardExpiringRow {
  id: string;
  masked: string;
  remaining: string;
  initialAmount: string;
  recipientName: string | null;
  recipientPhone: string | null;
  expiresAt: string | null;
  daysLeft: number | null;
}

export interface IssuedGiftCard {
  id: string;
  /** FAQAT shu javobda. Keyin hech qayerdan ko'rib bo'lmaydi. */
  code: string;
  amount: string;
  expiresAt: string | null;
  warning: string;
}

export interface AdminBrand {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  /** O'chirish mumkinmi — 0 bo'lmasa o'chirish rad etiladi. */
  productCount?: number;
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

  giftCards: (params: { tail?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params.tail) qs.set('tail', params.tail);
    if (params.page) qs.set('page', String(params.page));
    return request<{ items: GiftCardRow[]; total: number; page: number; perPage: number }>(
      `/admin/gift-cards?${qs.toString()}`,
    );
  },

  /** Muddati tugayotgan sertifikatlar — qoldig'i bor kartalar. */
  giftCardsExpiring: (days?: number) =>
    request<{ days: number; totalRemaining: string; items: GiftCardExpiringRow[] }>(
      `/admin/gift-cards/expiring${days ? `?days=${days}` : ''}`,
    ),

  issueGiftCard: (body: {
    amountSum: number;
    recipientName?: string;
    recipientPhone?: string;
    message?: string;
    expiresAt?: string;
  }) => request<IssuedGiftCard>('/admin/gift-cards', { method: 'POST', body: JSON.stringify(body) }),

  cancelGiftCard: (id: string, reason: string) =>
    request<{ id: string }>(`/admin/gift-cards/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  createBrand: (body: { name: string; slug?: string; logoUrl?: string }) =>
    request<AdminBrand>('/admin/catalog/brands', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateBrand: (id: string, body: { name: string; slug?: string; logoUrl?: string }) =>
    request<AdminBrand>(`/admin/catalog/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteBrand: (id: string) =>
    request<{ ok: true }>(`/admin/catalog/brands/${id}`, { method: 'DELETE' }),

  createCategory: (body: unknown) =>
    request<AdminCategory>('/admin/catalog/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateCategory: (id: string, body: unknown) =>
    request<AdminCategory>(`/admin/catalog/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteCategory: (id: string) =>
    request<{ ok: true }>(`/admin/catalog/categories/${id}`, { method: 'DELETE' }),

  /* ------------------------------- Media ------------------------------- */

  /**
   * Rasm yuklash. `Content-Type` ATAYLAB qo'yilmaydi — multipart chegarasini
   * brauzer o'zi yozadi va uni qo'lda yozish deyarli har doim buziladi.
   */
  async uploadProductImage(
    productId: string,
    file: File,
    alt: { altUz: string; altRu: string; kind?: string },
  ) {
    const form = new FormData();
    form.append('file', file);
    form.append('altUz', alt.altUz);
    form.append('altRu', alt.altRu);
    if (alt.kind) form.append('kind', alt.kind);
    const res = await fetch(`${apiBase()}/admin/media/products/${productId}`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) {
      const text = await res.text();
      let message = `Yuklab bo‘lmadi (HTTP ${res.status})`;
      try {
        const parsed = JSON.parse(text) as { message?: string | string[] };
        if (parsed.message) {
          message = Array.isArray(parsed.message) ? parsed.message.join('; ') : parsed.message;
        }
      } catch {
        // Javob JSON bo'lmasa (masalan nginx ning 413 sahifasi) matn qoladi.
        if (text.trim()) message = text.slice(0, 200);
      }
      throw new Error(message);
    }
    return (await res.json()) as { id: string };
  },

  reorderProductImages: (productId: string, imageIds: string[]) =>
    request<{ ok: true }>(`/admin/media/products/${productId}/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ imageIds }),
    }),

  setMainProductImage: (productId: string, imageId: string) =>
    request<{ ok: true }>(`/admin/media/products/${productId}/main/${imageId}`, {
      method: 'PUT',
    }),

  deleteProductImage: (productId: string, imageId: string) =>
    request<{ ok: true }>(`/admin/media/products/${productId}/${imageId}`, {
      method: 'DELETE',
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

  bulkThreshold: (variantIds: string[], threshold: number) =>
    request<{ updated: number; requested: number; threshold: number }>(
      '/admin/inventory/bulk/threshold',
      { method: 'POST', body: JSON.stringify({ variantIds, threshold }) },
    ),

  bulkRetryFiscal: (ids: string[]) =>
    request<{ sent: number; failed: Array<{ id: string; message?: string }> }>(
      '/admin/fiscal/receipts/bulk/retry',
      { method: 'POST', body: JSON.stringify({ ids }) },
    ),

  bulkCancelFiscal: (ids: string[], reason: string) =>
    request<{ cancelled: number; failed: Array<{ id: string; message?: string }> }>(
      '/admin/fiscal/receipts/bulk/cancel',
      { method: 'POST', body: JSON.stringify({ ids, reason }) },
    ),

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
  reportOverview: (period: string, from?: string, to?: string) => {
    const qs = new URLSearchParams({ period });
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    return request<ReportOverview>(`/admin/reports/overview?${qs.toString()}`);
  },

  /**
   * CSV eksporti. `request` ishlatilmaydi — javob JSON emas, fayl.
   *
   * Brauzerdagi oddiy `<a href>` bu yerda ishlamaydi: so'rov cookie
   * bilan ketishi kerak va `credentials: 'include'` faqat `fetch` da
   * bor. Shuning uchun blob olinadi va vaqtinchalik havola yasaladi.
   */
  async exportReportCsv(period: string, from?: string, to?: string): Promise<void> {
    const qs = new URLSearchParams({ period });
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const res = await fetch(`${apiBase()}/admin/reports/export?${qs.toString()}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Eksport qilib bo‘lmadi (HTTP ${res.status})`);

    const blob = await res.blob();
    // Fayl nomini server beradi; bermasa o'zimiz yasaymiz.
    const disposition = res.headers.get('content-disposition') ?? '';
    const match = /filename="?([^";]+)"?/.exec(disposition);
    const name = match?.[1] ?? `aliver-hisobot-${period}.csv`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Darhol bo'shatilsa Safari yuklashni tugatmasdan uzib qo'yadi.
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  },

  dashboard: (period: string, from?: string, to?: string) => {
    const qs = new URLSearchParams({ period });
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    return request<DashboardData>(`/admin/reports/dashboard?${qs.toString()}`);
  },

  shopifyPreview: (sourceUrl: string, usdToUzs: number) =>
    request<ShopifyPreview>('/admin/import/shopify/preview', {
      method: 'POST',
      body: JSON.stringify({ sourceUrl, usdToUzs }),
    }),
  shopifyImport: (sourceUrl: string, usdToUzs: number) =>
    request<ShopifyImportResult>('/admin/import/shopify/run', {
      method: 'POST',
      body: JSON.stringify({ sourceUrl, usdToUzs }),
    }),

  loyalty: (customerId: string) => request<LoyaltyView>(`/admin/loyalty/${customerId}`),

  /** Tez orada kuyadigan ballar. */
  loyaltyExpiring: (days?: number) =>
    request<{ days: number; totalPoints: number; items: LoyaltyExpiringRow[] }>(
      `/admin/loyalty/expiring${days ? `?days=${days}` : ''}`,
    ),

  /** Kuygan ballar hisoboti. */
  loyaltyExpired: (params: { from?: string; to?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const tail = qs.toString();
    return request<{ totalPoints: number; totalAmount: string; items: LoyaltyExpiredRow[] }>(
      `/admin/loyalty/expired${tail ? `?${tail}` : ''}`,
    );
  },
  adjustLoyalty: (customerId: string, points: number, comment: string) =>
    request<unknown>(`/admin/loyalty/${customerId}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ points, comment }),
    }),

  uzumStatus: () => request<UzumStatus>('/admin/uzum/status'),
  uzumPreview: () => request<UzumProductPreview>('/admin/uzum/products/preview'),

  /** Ikki do'kon o'rtasidagi farq — narx va qoldiq. */
  uzumSyncPlan: () => request<UzumSyncPlan>('/admin/uzum/sync/plan'),

  /**
   * CSV manzili.
   *
   * Faylni `fetch` bilan olib, keyin blob qilish shart emas: havola
   * bir xil manbaga boradi va session cookie o'zi ketadi. Blob yo'li
   * esa katta faylni xotiraga yuklab, yuklab olishni sekinlashtirardi.
   */
  uzumSyncCsvUrl: () => `${apiBase()}/admin/uzum/sync/export.csv`,
  uzumImportReviews: (dryRun: boolean) =>
    request<UzumReviewImport>(`/admin/uzum/reviews/import?dryRun=${dryRun}`, { method: 'POST' }),

  menu: (location: 'HEADER' | 'FOOTER') =>
    request<AdminMenuItem[]>(`/admin/menu?location=${location}`),
  menuOptions: () => request<MenuOptions>('/admin/menu/options'),
  createMenuItem: (body: Record<string, unknown>) =>
    request<AdminMenuItem>('/admin/menu', { method: 'POST', body: JSON.stringify(body) }),
  updateMenuItem: (id: string, body: Record<string, unknown>) =>
    request<AdminMenuItem>(`/admin/menu/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteMenuItem: (id: string) => request<{ ok: true }>(`/admin/menu/${id}`, { method: 'DELETE' }),
  reorderMenu: (ids: string[]) =>
    request<{ ok: true }>('/admin/menu/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }),

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
