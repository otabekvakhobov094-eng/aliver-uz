/**
 * Uzum to'lovining sof mantig'i.
 *
 * `click.util.ts` va `payme.util.ts` bilan bir xil naqsh: Nest va
 * Prisma ga bog'liq bo'lmagan qism alohida faylda, shuning uchun uni
 * to'g'ridan-to'g'ri sinash mumkin.
 */

export interface UzumConfig {
  mode: 'mock' | 'sandbox' | 'live';
  enabled: boolean;
  merchantId: string;
  serviceId: string;
  checkoutUrl: string;
  webUrl: string;
}

/** Jangovar rejim uchun majburiy sozlamalar. */
export const UZUM_REQUIRED = ['UZUM_MERCHANT_ID', 'UZUM_SERVICE_ID', 'UZUM_CHECKOUT_URL'] as const;

export function missingUzumConfig(cfg: UzumConfig): string[] {
  const missing: string[] = [];
  if (!cfg.merchantId) missing.push('UZUM_MERCHANT_ID');
  if (!cfg.serviceId) missing.push('UZUM_SERVICE_ID');
  if (!cfg.checkoutUrl) missing.push('UZUM_CHECKOUT_URL');
  return missing;
}

/**
 * Jangovar rejimga chiqishga to'sqinlik qiladigan sabab, yoki `null`.
 *
 * `UZUM_ENABLED` alohida bayroq: kalitlar to'liq bo'lgani hali
 * integratsiya tayyor degani emas. Callback maydonlari va imzo sxemasi
 * Uzum hujjatidan olinadi, hujjat esa shartnoma bilan keladi. Kalitlar
 * bor, hujjat yo'q holda sotuvga chiqish eng qimmat xato bo'lardi:
 * pul kelardi, biz esa uni qaysi buyurtmaga yozishni bilmasdik.
 */
export function uzumBlockReason(cfg: UzumConfig): string | null {
  if (cfg.mode === 'mock') return null;
  if (!cfg.enabled) {
    return 'UZUM_ENABLED qo‘yilmagan — shartnoma va callback hujjati kutilmoqda';
  }
  const missing = missingUzumConfig(cfg);
  return missing.length > 0 ? `sozlama yetishmayapti: ${missing.join(', ')}` : null;
}

/** Maket sahifasi — mijoz bizning soxta to'lov ekranimizga boradi. */
export function uzumMockUrl(webUrl: string, orderId: string): string {
  return `${webUrl}/uz/tolov/maket?order=${encodeURIComponent(orderId)}&provider=UZUM`;
}

/**
 * To'lov havolasi.
 *
 * Manzil kodda emas, sozlamada: sandbox va jangovar stend orasida
 * ko'chirish uchun kodni qayta yig'ish kerak bo'lmasin.
 *
 * Summa TIYINDA uzatiladi — butun tizimda shunday, shuning uchun bu
 * yerda o'girish YO'Q. Bir joyda so'm, boshqasida tiyin bo'lib qolishi
 * eng ko'p uchraydigan pul xatosi.
 */
export function uzumPayUrl(params: {
  checkoutUrl: string;
  merchantId: string;
  serviceId: string;
  amountTiyin: bigint;
  orderNumber: string;
  returnUrl: string;
}): string {
  const url = new URL(params.checkoutUrl);
  url.searchParams.set('merchant_id', params.merchantId);
  url.searchParams.set('service_id', params.serviceId);
  url.searchParams.set('amount', params.amountTiyin.toString());
  url.searchParams.set('order_id', params.orderNumber);
  url.searchParams.set('return_url', params.returnUrl);
  return url.toString();
}
