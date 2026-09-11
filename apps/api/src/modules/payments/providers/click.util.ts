import { md5, safeEqual } from '../webhook.util';

/**
 * Click Shop API xato kodlari.
 * Manba: Click merchant hujjatlari, "Error codes" bo'limi.
 */
export const CLICK_ERROR = {
  SUCCESS: 0,
  SIGN_CHECK_FAILED: -1,
  INCORRECT_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  USER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  FAILED_TO_UPDATE_USER: -7,
  ERROR_IN_REQUEST: -8,
  TRANSACTION_CANCELLED: -9,
} as const;

export const CLICK_ERROR_NOTE: Record<number, string> = {
  0: 'Muvaffaqiyatli',
  [-1]: 'Imzo noto‘g‘ri',
  [-2]: 'Summa mos kelmadi',
  [-3]: 'Amal topilmadi',
  [-4]: 'Allaqachon to‘langan',
  [-5]: 'Buyurtma topilmadi',
  [-6]: 'Tranzaksiya topilmadi',
  [-7]: 'Ma’lumotni yangilab bo‘lmadi',
  [-8]: 'So‘rovda xato',
  [-9]: 'Tranzaksiya bekor qilingan',
};

export const CLICK_ACTION = { PREPARE: 0, COMPLETE: 1 } as const;

export interface ClickRequest {
  click_trans_id: string;
  service_id: string;
  click_paydoc_id?: string;
  merchant_trans_id: string;
  merchant_prepare_id?: string;
  amount: string;
  action: string;
  error?: string;
  error_note?: string;
  sign_time: string;
  sign_string: string;
}

/**
 * Click imzosi.
 *
 * PREPARE  (action=0):
 *   md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
 * COMPLETE (action=1) — o'rtaga `merchant_prepare_id` qo'shiladi:
 *   md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
 *
 * Diqqat: `amount` AYNAN so'rovda kelgan ko'rinishda qo'shiladi
 * ("10000.00" ni "10000" ga aylantirsak imzo mos kelmaydi).
 */
export function clickSignString(params: {
  clickTransId: string;
  serviceId: string;
  secretKey: string;
  merchantTransId: string;
  merchantPrepareId?: string | null;
  amount: string;
  action: string;
  signTime: string;
}): string {
  const middle =
    params.merchantPrepareId !== undefined && params.merchantPrepareId !== null
      ? `${params.merchantTransId}${params.merchantPrepareId}`
      : params.merchantTransId;

  return md5(
    `${params.clickTransId}${params.serviceId}${params.secretKey}${middle}${params.amount}${params.action}${params.signTime}`,
  );
}

export function verifyClickSign(req: ClickRequest, secretKey: string): boolean {
  const isComplete = req.action === String(CLICK_ACTION.COMPLETE);
  const expected = clickSignString({
    clickTransId: req.click_trans_id,
    serviceId: req.service_id,
    secretKey,
    merchantTransId: req.merchant_trans_id,
    merchantPrepareId: isComplete ? (req.merchant_prepare_id ?? '') : null,
    amount: req.amount,
    action: req.action,
    signTime: req.sign_time,
  });
  return safeEqual(expected, req.sign_string ?? '');
}

/**
 * Click summani SO'MDA yuboradi ("189000.00"), bizda esa hamma joyda
 * tiyin. O'girish faqat shu yerda bo'ladi.
 *
 * `Number` ataylab ishlatilmaydi: 0.1 + 0.2 muammosi pulga tegmasligi
 * kerak. Satr butun va kasr qismga bo'linadi va tiyin butun sonda
 * yig'iladi.
 */
export function clickAmountToTiyin(amount: string): bigint | null {
  const trimmed = (amount ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const [whole, frac = ''] = trimmed.split('.');
  const tiyin = frac.padEnd(2, '0');
  return BigInt(whole!) * 100n + BigInt(tiyin);
}

/** Tiyindan Click kutadigan so'm satriga. */
export function tiyinToClickAmount(tiyin: bigint): string {
  const sign = tiyin < 0n ? '-' : '';
  const abs = tiyin < 0n ? -tiyin : tiyin;
  return `${sign}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
}

/** To'lov havolasi. */
export function clickPayUrl(params: {
  baseUrl: string;
  serviceId: string;
  merchantId: string;
  amountTiyin: bigint;
  merchantTransId: string;
  returnUrl: string;
}): string {
  const qs = new URLSearchParams({
    service_id: params.serviceId,
    merchant_id: params.merchantId,
    amount: tiyinToClickAmount(params.amountTiyin),
    transaction_param: params.merchantTransId,
    return_url: params.returnUrl,
  });
  return `${params.baseUrl}?${qs.toString()}`;
}
