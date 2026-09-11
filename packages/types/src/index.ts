/**
 * Frontend va backend o'rtasidagi umumiy tiplar.
 *
 * MUHIM: pul summalari API dan TIYINDA, SATR ko'rinishida keladi
 * ("57400000"), chunki JSON da BigInt yo'q va Number aniqlikni yo'qotadi.
 */

export type Tiyin = string;
export type Uuid = string;
export type Locale = 'UZ' | 'RU' | 'EN';

export interface ApiError {
  statusCode: number;
  code: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

/* ---------- Auth ---------- */

export interface RequestOtpResponse {
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

export interface CustomerProfile {
  id: Uuid;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  locale: Locale;
  ordersCount: number;
}

export interface AdminProfile {
  id: Uuid;
  email: string;
  fullName: string;
  phone: string | null;
  twoFaEnabled: boolean;
  role: { code: string; name: string };
}

/* ---------- Katalog ---------- */

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'HIDDEN' | 'OUT_OF_STOCK' | 'ARCHIVED';

export interface VariantSummary {
  id: Uuid;
  sku: string;
  options: Record<string, string>;
  price: Tiyin;
  oldPrice: Tiyin | null;
  availableStock: number;
}

export interface ProductSummary {
  id: Uuid;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: Tiyin;
  oldPrice: Tiyin | null;
  ratingAvg: number;
  ratingCount: number;
  badges: Array<'SALE' | 'NEW' | 'TOP' | 'LOW_STOCK'>;
}

/* ---------- Buyurtma ---------- */

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKING'
  | 'READY'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING'
  | 'WAITING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface OrderSummary {
  id: Uuid;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  grandTotal: Tiyin;
  itemsCount: number;
  placedAt: string;
}
