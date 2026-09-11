import { BadRequestException } from '@nestjs/common';

/**
 * Telefon raqamini yagona ko'rinishga keltiradi: +998901234567
 *
 * Mijozlar raqamni turlicha yozadi (+998 90 ..., 90..., 0 90...),
 * baza esa bitta ko'rinishni biladi — aks holda bitta odam uchun
 * bir nechta hisob paydo bo'ladi.
 */
export function normalizePhone(input: string): string {
  const digits = String(input).replace(/\D/g, '');
  const withCountry = digits.startsWith('998') ? digits : `998${digits.replace(/^0+/, '')}`;
  if (withCountry.length !== 12) {
    throw new BadRequestException('Telefon raqami noto‘g‘ri. Namuna: +998 90 123 45 67');
  }
  return `+${withCountry}`;
}

/** Ko'rsatish uchun: +998901234567 -> +998 90 123 45 67 */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length !== 12) return phone;
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
}
