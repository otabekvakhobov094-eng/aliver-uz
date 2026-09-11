import { customAlphabet } from 'nanoid';

/**
 * Buyurtma raqami: ALV-YYMMDD-XXXX
 *
 * Ketma-ket raqam (ALV-000001) ataylab ishlatilmaydi:
 *  - raqobatchi kunlik buyurtmalar sonini bilib oladi;
 *  - parallel yozuvda dublikat xavfi bor.
 * Kuzatuv baribir raqam + telefon juftligini talab qiladi (TZ 39),
 * shuning uchun xavfsizlik yo‘qolmaydi. Ekspertiza B-2.
 */
const alphabet = '0123456789';
const rnd = customAlphabet(alphabet, 4);

export function generateOrderNumber(prefix = 'ALV', at: Date = new Date()): string {
  const yy = String(at.getFullYear()).slice(2);
  const mm = String(at.getMonth() + 1).padStart(2, '0');
  const dd = String(at.getDate()).padStart(2, '0');
  return `${prefix}-${yy}${mm}${dd}-${rnd()}`;
}

export function generateReturnNumber(at: Date = new Date()): string {
  return generateOrderNumber('RET', at);
}

export const ORDER_NUMBER_RE = /^(ALV|RET)-\d{6}-\d{4}$/;
