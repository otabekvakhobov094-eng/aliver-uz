import type { Tiyin, Uuid } from '@aliver/types';

import { apiBase } from './api-base';

/* ----------------------------- Javob tiplari ----------------------------- */

export interface CartLine {
  itemId: Uuid;
  variantId: Uuid;
  productId: Uuid;
  slug: string;
  nameUz: string;
  nameRu: string;
  variantLabel: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: Tiyin;
  oldUnitPrice: Tiyin | null;
  lineTotal: Tiyin;
  discountAmount: Tiyin;
  availableStock: number;
  exceedsStock: boolean;
  vatRate: number;
}

export interface Cart {
  id: Uuid;
  token: string;
  items: CartLine[];
  itemsCount: number;
  subtotal: Tiyin;
  discountTotal: Tiyin;
  vatTotal: Tiyin;
  grandTotal: Tiyin;
  couponCode: string | null;
  couponError: string | null;
  appliedDiscounts: Array<{ code: string | null; amount: Tiyin }>;
  freeShipping: boolean;
  /** Namuna tanlash holati — TZ-3. */
  sample: {
    unlocked: boolean;
    remaining: Tiyin;
    threshold: Tiyin;
    /** 0..1 — progress chizig'i uchun. */
    progress: number;
    selectedVariantId: Uuid | null;
    selectedName: string | null;
  };
  warnings: string[];
}

export interface LoyaltyBalance {
  points: number;
  /** «Ikki valyuta»: ball har doim so'mda ham ko'rsatiladi. */
  amount: Tiyin;
  rate: {
    pointsPerSum: Tiyin;
    tiyinPerPoint: Tiyin;
    maxRedeemSharePercent: number;
    expiryMonths: number;
    expiryWarnDays: number;
  };
  /**
   * `none` — kuyadigan ball yo'q; `warning` — muddat yaqin.
   * Balans nol bo'lganda sana ko'rsatilmaydi.
   */
  stage: 'none' | 'active' | 'warning' | 'due';
  expiresAt: string | null;
  daysLeft: number | null;
}

export interface LoyaltyEntry {
  id: Uuid;
  kind: 'EARN' | 'REDEEM' | 'EXPIRE' | 'ADJUST' | 'REVERSAL';
  points: number;
  amount: Tiyin;
  comment: string | null;
  createdAt: string;
  orderNumber: string | null;
}

export interface LoyaltyQuote {
  points: number;
  amount: Tiyin;
  maxPoints: number;
  reason: 'ok' | 'balance' | 'cap' | 'nothing';
}

export interface SampleOption {
  variantId: Uuid;
  sku: string;
  nameUz: string;
  nameRu: string;
  imageUrl: string | null;
  available: number;
}

export interface DeliveryRegion {
  id: Uuid;
  code: string;
  nameUz: string;
  nameRu: string;
  districts: Array<{ id: Uuid; code: string; nameUz: string; nameRu: string }>;
}

export interface DeliveryQuote {
  code: string;
  type: 'COURIER' | 'EXPRESS' | 'PICKUP';
  nameUz: string;
  nameRu: string;
  descUz: string | null;
  descRu: string | null;
  price: Tiyin;
  /** Chegirmasiz asl narx — "bepul" belgisini ko‘rsatish uchun. */
  basePrice: Tiyin;
  isFree: boolean;
  freeThreshold: Tiyin | null;
  /** Bepul yetkazishgacha qancha qoldi. */
  amountToFree: Tiyin;
  daysMin: number;
  daysMax: number;
  available: boolean;
  /** Mavjud bo‘lmasa — nima uchun (masalan, ekspress faqat Toshkentda). */
  unavailableReasonUz: string | null;
  unavailableReasonRu: string | null;
}

export interface OrderView {
  id: Uuid;
  number: string;
  status: string;
  paymentStatus: string;
  paymentProvider: string | null;
  placedAt: string;
  contactPhone: string;
  firstName: string;
  lastName: string | null;
  comment: string | null;
  delivery: {
    code: string | null;
    nameUz: string | null;
    nameRu: string | null;
    type: string;
    regionName: string | null;
    districtName: string | null;
    addressLine: string | null;
    landmark: string | null;
    etaFrom: string | null;
    etaTo: string | null;
  };
  totals: {
    subtotal: Tiyin;
    discountTotal: Tiyin;
    shippingTotal: Tiyin;
    vatTotal: Tiyin;
    grandTotal: Tiyin;
  };
  items: Array<{
    id: Uuid;
    productName: string;
    variantName: string | null;
    sku: string;
    imageUrl: string | null;
    quantity: number;
    unitPrice: Tiyin;
    oldUnitPrice: Tiyin | null;
    discountAmount: Tiyin;
    lineTotal: Tiyin;
  }>;
  timeline: Array<{ status: string; at: string; source: string; comment: string | null }>;
  reservationExpiresAt: string | null;
  /** Onlayn to'lov hali kutilyaptimi. */
  canPay: boolean;
  /** Fiskal chek — yuborilgan bo'lsa. */
  receipt: { url: string | null; fiscalSign: string | null } | null;
  /** Jo'natma: kuryer va trek raqami. */
  shipment: {
    status: string;
    carrier: string | null;
    trackingNo: string | null;
    trackUrl: string | null;
    courierName: string | null;
    courierPhone: string | null;
    shippedAt: string | null;
  } | null;
}

export interface CreateOrderInput {
  phone: string;
  firstName: string;
  lastName?: string;
  regionId: Uuid;
  districtId?: Uuid;
  addressLine: string;
  landmark?: string;
  deliveryMethodCode: string;
  paymentProvider: 'CLICK' | 'PAYME' | 'UZUM' | 'CASH_ON_DELIVERY';
  /** Server baribir qayta hisoblaydi — bu faqat so'rov. */
  loyaltyPoints?: number;
  otpCode?: string;
  comment?: string;
  acceptOffer: boolean;
  idempotencyKey?: string;
}

/* --------------------------------- Xato --------------------------------- */

export class ShopError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ShopError';
  }
}

/**
 * So'rov uchun eng uzoq kutish.
 *
 * Render'ning bepul instansi harakatsizlikdan «uxlab qoladi» va
 * birinchi so'rov 50 soniyagacha kutadi. Taymautsiz esa `fetch` umuman
 * tugamasligi mumkin: mijoz «Yuklanmoqda…» yozuvini cheksiz ko'radi va
 * sayt buzilgan deb o'ylaydi — foydalanuvchi aynan shuni ko'rsatdi.
 *
 * 60 soniya — uyg'onish uchun yetarli, lekin cheksiz emas.
 */
const TIMEOUT_MS = 60_000;

/** Tarmoq yoki taymaut — serverning javobi emas. */
export class ShopNetworkError extends Error {
  constructor(readonly kind: 'timeout' | 'offline') {
    super(kind === 'timeout' ? 'So‘rov vaqti tugadi' : 'Tarmoqqa ulanib bo‘lmadi');
    this.name = 'ShopNetworkError';
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      ...init,
      // Savat `cart_token` cookie'sida yashaydi — mehmon uchun ham ishlashi shart.
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      signal: init?.signal ?? AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    // `AbortSignal.timeout` `TimeoutError` tashlaydi, tarmoq uzilsa —
    // `TypeError`. Ikkalasi ham serverning javobi EMAS, shuning uchun
    // ular alohida turda qaytariladi: chaqiruvchi «qayta urinish»
    // taklif qila oladi, «xato» deb ko'rsatmaydi.
    const timedOut = e instanceof DOMException && e.name === 'TimeoutError';
    throw new ShopNetworkError(timedOut ? 'timeout' : 'offline');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      code?: string;
      message?: string | string[];
    } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? 'Xatolik yuz berdi');
    throw new ShopError(res.status, body?.code ?? 'ERROR', message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ------------------------------- To'lovlar ------------------------------- */

export interface PaymentLink {
  kind: 'redirect' | 'none';
  url: string | null;
  /** true — provayder kalitlari hali yo'q, maket sahifasi ochiladi. */
  mock: boolean;
  provider: 'CLICK' | 'PAYME' | 'UZUM' | 'CASH_ON_DELIVERY';
}

export interface PaymentStatusView {
  orderNumber: string | null;
  orderStatus: string | null;
  provider: string;
  status:
    'PENDING' | 'WAITING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  amount: Tiyin;
  paidAt: string | null;
  failureReason: string | null;
}


/* ------------------------------ Kabinet ------------------------------ */

export interface Profile {
  id: Uuid;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  locale: 'UZ' | 'RU';
  telegramLinked: boolean;
  stats: {
    ordersCount: number;
    totalSpent: Tiyin;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
    wishlistCount: number;
    returnsCount: number;
  };
  createdAt: string;
}

export interface SavedAddress {
  id: Uuid;
  label: string | null;
  recipient: string;
  phone: string;
  regionId: Uuid;
  regionNameUz: string | null;
  regionNameRu: string | null;
  districtId: Uuid | null;
  districtNameUz: string | null;
  districtNameRu: string | null;
  street: string;
  landmark: string | null;
  isDefault: boolean;
}

export interface WishlistEntry {
  id: Uuid;
  variantId: Uuid;
  productId: Uuid;
  slug: string;
  nameUz: string;
  nameRu: string;
  variantLabel: string;
  imageUrl: string | null;
  price: Tiyin;
  oldPrice: Tiyin | null;
  availableStock: number;
  onSale: boolean;
  addedAt: string;
}

export interface ConsentState {
  current: Array<{
    type: string;
    granted: boolean;
    documentSlug: string | null;
    documentVer: string | null;
    at: string;
  }>;
  history: ConsentState['current'];
}

/* ----------------------------- Qaytarishlar ----------------------------- */

export interface ReturnEligibility {
  eligible: boolean;
  reason: string;
  deadline: string | null;
  daysLeft: number;
  shippingTotal: Tiyin;
  lines: Array<{
    orderItemId: Uuid;
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    returnableQuantity: number;
    refundPerUnit: Tiyin;
  }>;
  openReturn: { id: Uuid; number: string; status: string } | null;
}

export interface ReturnView {
  id: Uuid;
  number: string;
  status: string;
  reasonCode: string;
  comment: string | null;
  resolutionNote: string | null;
  refundAmount: Tiyin;
  refundedAt: string | null;
  refundMethod: string | null;
  createdAt: string;
  order: { id: Uuid; number: string; shippingTotal: Tiyin };
  items: Array<{
    id: Uuid;
    orderItemId: Uuid;
    productName: string;
    variantName: string | null;
    sku: string;
    imageUrl: string | null;
    quantity: number;
    refundAmount: Tiyin;
    condition: string;
    restocked: boolean;
  }>;
  receipts: Array<{ id: Uuid; status: string; receiptUrl: string | null; fiscalSign: string | null }>;
}

export interface ReturnSummary {
  id: Uuid;
  number: string;
  status: string;
  orderNumber: string | null;
  refundAmount: Tiyin;
  itemsCount: number;
  createdAt: string;
}

export const shopApi = {
  cart: () => call<Cart>('/cart'),

  addToCart: (variantId: Uuid, quantity = 1) =>
    call<Cart>('/cart/items', { method: 'POST', body: JSON.stringify({ variantId, quantity }) }),

  updateCartItem: (itemId: Uuid, quantity: number) =>
    call<Cart>(`/cart/items/${itemId}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),

  removeCartItem: (itemId: Uuid) => call<Cart>(`/cart/items/${itemId}`, { method: 'DELETE' }),

  applyCoupon: (code: string) =>
    call<Cart>('/cart/coupon', { method: 'POST', body: JSON.stringify({ code }) }),

  removeCoupon: () => call<Cart>('/cart/coupon', { method: 'DELETE' }),

  samples: () => call<SampleOption[]>('/cart/samples'),

  /* ----------------------------- Sodiqlik ----------------------------- */

  loyaltyBalance: () => call<LoyaltyBalance>('/loyalty/balance'),
  loyaltyHistory: () => call<LoyaltyEntry[]>('/loyalty/history'),
  loyaltyQuote: (subtotal: string, points: number) =>
    call<LoyaltyQuote>(`/loyalty/quote?subtotal=${subtotal}&points=${points}`),

  /** `null` — tanlovni bekor qiladi. */
  chooseSample: (variantId: Uuid | null) =>
    call<Cart>('/cart/sample', { method: 'POST', body: JSON.stringify({ variantId }) }),

  regions: () => call<DeliveryRegion[]>('/delivery/regions'),

  quotes: (params: { regionId: Uuid; subtotal: string; freeShipping?: boolean }) => {
    const qs = new URLSearchParams({
      regionId: params.regionId,
      subtotal: params.subtotal,
      ...(params.freeShipping ? { freeShipping: 'true' } : {}),
    });
    return call<DeliveryQuote[]>(`/delivery/quotes?${qs.toString()}`);
  },

  requestOrderOtp: (phone: string) =>
    call<{ expiresInSeconds: number; resendAfterSeconds: number }>('/orders/otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  createOrder: (input: CreateOrderInput) =>
    call<OrderView>('/orders', { method: 'POST', body: JSON.stringify(input) }),

  order: (id: Uuid) => call<OrderView>(`/orders/${id}/public`),

  track: (number: string, phone: string) =>
    call<OrderView>('/orders/track', { method: 'POST', body: JSON.stringify({ number, phone }) }),

  myOrders: () =>
    call<
      Array<{
        id: Uuid;
        number: string;
        status: string;
        paymentStatus: string;
        grandTotal: Tiyin;
        placedAt: string;
        items: Array<{ imageUrl: string | null; productName: string }>;
      }>
    >('/orders/my'),

  cancelOrder: (id: Uuid, comment?: string) =>
    call<unknown>(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ comment }) }),

  /** To'lovga o'tish havolasini oladi. */
  startPayment: (orderId: Uuid, provider?: 'CLICK' | 'PAYME' | 'UZUM') =>
    call<PaymentLink>('/payments/start', {
      method: 'POST',
      body: JSON.stringify({ orderId, ...(provider ? { provider } : {}) }),
    }),

  /** Kutish sahifasi shu holatni so'rab turadi. */
  paymentStatus: (orderId: Uuid) => call<PaymentStatusView>(`/payments/status/${orderId}`),

  /** MAKET: to'lovni tasdiqlash yoki bekor qilish (faqat development). */
  mockConfirm: (orderId: Uuid, outcome: 'PAID' | 'CANCELLED') =>
    call<PaymentStatusView>('/payments/mock/confirm', {
      method: 'POST',
      body: JSON.stringify({ orderId, outcome }),
    }),

  /* ------------------------------ Kabinet ------------------------------ */

  profile: () => call<Profile>('/account'),

  updateProfile: (body: Partial<Pick<Profile, 'firstName' | 'lastName' | 'email' | 'locale'>>) =>
    call<Profile>('/account', { method: 'PUT', body: JSON.stringify(body) }),

  addresses: () => call<SavedAddress[]>('/account/addresses'),

  saveAddress: (body: Record<string, unknown>) =>
    call<SavedAddress | null>('/account/addresses', { method: 'POST', body: JSON.stringify(body) }),

  setDefaultAddress: (id: Uuid) =>
    call<SavedAddress[]>(`/account/addresses/${id}/default`, { method: 'PUT' }),

  deleteAddress: (id: Uuid) =>
    call<SavedAddress[]>(`/account/addresses/${id}`, { method: 'DELETE' }),

  wishlist: () => call<WishlistEntry[]>('/account/wishlist'),

  addToWishlist: (variantId: Uuid) =>
    call<WishlistEntry[]>('/account/wishlist', {
      method: 'POST',
      body: JSON.stringify({ variantId }),
    }),

  removeFromWishlist: (variantId: Uuid) =>
    call<WishlistEntry[]>(`/account/wishlist/${variantId}`, { method: 'DELETE' }),

  consents: () => call<ConsentState>('/account/consents'),

  setConsent: (type: string, granted: boolean) =>
    call<ConsentState>('/account/consents', {
      method: 'POST',
      body: JSON.stringify({ type, granted }),
    }),

  exportData: () => call<Record<string, unknown>>('/account/export'),
  telegramLink: () => call<{ configured: boolean; url: string | null; expiresInSeconds?: number }>('/telegram/link'),

  /* ----------------------------- Qaytarishlar ----------------------------- */

  returnReasons: () =>
    call<{
      reasons: Array<{ code: string; uz: string; ru: string }>;
      statuses: Array<{ code: string; uz: string; ru: string }>;
    }>('/returns/reasons'),

  returnEligibility: (orderId: Uuid, phone?: string) =>
    call<ReturnEligibility>(
      `/returns/eligibility/${orderId}${phone ? `?phone=${encodeURIComponent(phone)}` : ''}`,
    ),

  createReturn: (body: {
    orderId: Uuid;
    phone?: string;
    reasonCode: string;
    comment?: string;
    items: Array<{ orderItemId: Uuid; quantity: number }>;
    opened?: boolean;
  }) => call<ReturnView>('/returns', { method: 'POST', body: JSON.stringify(body) }),

  myReturns: () => call<ReturnSummary[]>('/returns/my'),

  returnView: (id: Uuid) => call<ReturnView>(`/returns/${id}`),

  cancelReturn: (id: Uuid) => call<ReturnView>(`/returns/${id}/cancel`, { method: 'POST' }),
};

/** Har checkout uchun bitta kalit — tugmani ikki marta bosish himoyasi. */
export function newIdempotencyKey(): string {
  const g = globalThis.crypto;
  if (g && 'randomUUID' in g) return g.randomUUID();
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
