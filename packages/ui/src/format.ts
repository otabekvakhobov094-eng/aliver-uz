/**
 * Narxni ko'rsatish. Server pul summasini TIYINDA, satr sifatida yuboradi
 * ("57400000"), chunki JSON da BigInt yo'q. Frontendda ham raqamga
 * o'girmasdan formatlaymiz — aks holda katta summalarda aniqlik yo'qoladi.
 */
export function formatTiyin(value: string | bigint | number): string {
  const t = typeof value === 'bigint' ? value : BigInt(String(value));
  const sum = t / 100n;
  return sum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatPrice(value: string | bigint | number, locale: 'UZ' | 'RU' = 'UZ'): string {
  return `${formatTiyin(value)} ${locale === 'RU' ? 'сум' : 'so‘m'}`;
}

/** Chegirma foizi: 249 000 -> 189 000 = -24% */
export function discountPercent(oldValue: string | bigint, newValue: string | bigint): number {
  const o = BigInt(String(oldValue));
  const n = BigInt(String(newValue));
  if (o <= 0n || n >= o) return 0;
  return Number(((o - n) * 100n) / o);
}

export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length !== 12) return phone;
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
}
