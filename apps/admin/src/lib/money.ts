import { t } from './i18n';
import { fmtNumber } from './order-labels';

/**
 * Tiyinni pul satriga aylantiradi.
 *
 * Pul HECH QACHON suzuvchi nuqtada saqlanmaydi — bazada tiyin,
 * bu yerda esa faqat ko'rsatish uchun bo'linadi.
 *
 * Valyuta belgisi tarjimadan olinadi: ruscha ekranda «сум» bo'lishi
 * kerak. Ilgari u kodga qat'iy yozilgani uchun ruscha panelda
 * «1 845 000 so'm» bo'lib chiqardi.
 */
export function money(tiyin: string | number | bigint | null | undefined): string {
  const value = Number(tiyin ?? 0) / 100;
  return `${fmtNumber(value)} ${t('so‘m')}`;
}
