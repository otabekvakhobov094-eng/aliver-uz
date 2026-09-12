import { apiBase } from './api-base';

/**
 * Mijoz sessiyasini uzaytirish.
 *
 * NEGA KERAK. Kirish tokeni 15 daqiqa yashaydi, refresh tokeni esa 30
 * kun. Server `POST /auth/refresh` ni BERIB qo'ygan, lekin sayt uni
 * hech qachon chaqirmagan: natijada mijoz 15 daqiqadan keyin, ko'pincha
 * buyurtma rasmiylashtirayotgan joyida, «kiring» degan xabarga
 * uchrardi. Xato chiqmagani uchun buni nosozlik deb hech kim aytmagan.
 *
 * Bir vaqtda ketayotgan bir nechta so'rov 401 olsa, uzaytirish BIR
 * MARTA bo'ladi: refresh tokeni rotatsiyaga tushadi va ikkinchi
 * chaqiruv o'zidan oldingisini bekor qilib yuborardi.
 */
const AUTH_PATHS = ['/auth/otp/request', '/auth/otp/verify', '/auth/refresh', '/auth/logout'];

let inFlight: Promise<boolean> | null = null;

export function isAuthPath(path: string): boolean {
  return AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}?`));
}

export function refreshSession(): Promise<boolean> {
  inFlight ??= fetch(`${apiBase()}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
