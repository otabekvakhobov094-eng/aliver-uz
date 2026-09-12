import type { Tiyin } from '../../common/money';

export type ProviderCode = 'CLICK' | 'PAYME' | 'UZUM' | 'CASH_ON_DELIVERY';

/**
 * To'lov havolasi — mijoz shu manzilga yuboriladi.
 *
 * `kind`:
 *  - `redirect` — provayder sahifasiga o'tiladi (Click, Payme);
 *  - `none`     — havola kerak emas (naqd to'lov).
 */
export interface PaymentLink {
  kind: 'redirect' | 'none';
  url: string | null;
  /** Maket rejimida true — interfeys buni ochiq aytadi. */
  mock: boolean;
}

/**
 * Har bir provayder shu shartnomani bajaradi.
 *
 * TZ 36–38 da faqat "Click va Payme ulanadi" deyilgan. Ekspertiza A-9:
 * ikkita provayder bitta interfeys ostida bo'lmasa, uchinchisi
 * (Uzum, Apelsin) qo'shilganda butun buyurtma moduli qayta yoziladi.
 */
export interface PaymentGateway {
  readonly code: ProviderCode;

  /** Mijozni to'lovga yuborish uchun havola. */
  createLink(params: {
    orderId: string;
    orderNumber: string;
    amount: Tiyin;
    returnUrl: string;
  }): Promise<PaymentLink> | PaymentLink;

  /**
   * Provayderdagi holatni so'rash. Webhook yo'qolgan bo'lsa,
   * kutish sahifasi shu orqali haqiqatni biladi.
   */
  poll?(params: { paymentId: string; providerTxnId: string | null }): Promise<{
    state: 'PENDING' | 'PAID' | 'CANCELLED' | 'FAILED';
    providerTxnId?: string | null;
  }>;

  /** Qaytarish. Provayder qo'llab-quvvatlamasa — `supported: false`. */
  refund?(params: {
    paymentId: string;
    providerTxnId: string | null;
    amount: Tiyin;
    reason: string;
  }): Promise<{ supported: boolean; externalId?: string | null; message?: string }>;
}

/** Provayder nomlarini bir joyda ushlab turamiz. */
export const PROVIDER_LABEL: Record<ProviderCode, { uz: string; ru: string }> = {
  CLICK: { uz: 'Click', ru: 'Click' },
  PAYME: { uz: 'Payme', ru: 'Payme' },
  UZUM: { uz: 'Uzum', ru: 'Uzum' },
  CASH_ON_DELIVERY: { uz: 'Yetkazilganda naqd', ru: 'Наличными при получении' },
};

/** Onlayn to'lov — rezerv muddati faqat shularda ishlaydi. */
export const ONLINE_PROVIDERS: ProviderCode[] = ['CLICK', 'PAYME', 'UZUM'];
