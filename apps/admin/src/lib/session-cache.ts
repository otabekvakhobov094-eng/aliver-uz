import { adminApi } from './api';

/**
 * Kim kirgan va nima qila oladi — BIR MARTA so'raladi.
 *
 * NEGA. Har bir sahifa o'zini `AdminShell` ga o'raydi, qobiq esa har
 * ochilishda huquqlarni qaytadan so'rardi. Natijada menyudan bosilgan
 * HAR BIR bo'lim butun ekranni «Yuklanmoqda…» ga almashtirardi:
 * yuqori qator ham, yon menyu ham yo'qolib, keyin qaytadan chizilardi.
 * Aynan shu narsa panelni «silliq emas» qilib ko'rsatadi — sahifa
 * emas, BUTUN interfeys yonib-o'chadi.
 *
 * Endi javob modul ichida saqlanadi: ikkinchi sahifadan boshlab qobiq
 * darrov chiziladi, yangilanish esa orqa fonda ketadi.
 */

export interface AdminSession {
  role: string;
  permissions: string[];
  fullName: string | null;
  email: string | null;
}

let cached: AdminSession | null = null;
let pending: Promise<AdminSession> | null = null;

/** Darhol beriladigan qiymat — bo'lsa. Qobiq shuning uchun kutmaydi. */
export function cachedSession(): AdminSession | null {
  return cached;
}

export function loadSession(): Promise<AdminSession> {
  pending ??= adminApi
    .permissions()
    .then((res) => {
      cached = {
        role: res.role,
        permissions: res.permissions ?? [],
        fullName: res.fullName ?? null,
        email: res.email ?? null,
      };
      return cached;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** Chiqishda tozalanadi: keyingi kirgan odam boshqasining huquqlarini ko'rmasin. */
export function clearSession(): void {
  cached = null;
  pending = null;
}
