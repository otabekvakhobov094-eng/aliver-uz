import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Imzolarni SOLISHTIRISH faqat shu funksiya orqali.
 *
 * Oddiy `a === b` satrlarni belgima-belgi solishtiradi va birinchi farqda
 * to'xtaydi — shu vaqt farqidan foydalanib imzoni belgima-belgi topish
 * mumkin. `timingSafeEqual` har doim bir xil vaqt sarflaydi.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a ?? '', 'utf8');
  const bufB = Buffer.from(b ?? '', 'utf8');
  if (bufA.length !== bufB.length) {
    // Uzunlik farqi ham sir emas, lekin baribir doimiy vaqt saqlaymiz.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function md5(input: string): string {
  return createHash('md5').update(input, 'utf8').digest('hex');
}

/**
 * Loglarga tushmasligi kerak bo'lgan maydonlar.
 * Webhook payload'i to'liq saqlanadi (nizolar uchun kerak), lekin
 * imzo va kalitlar niqoblanadi.
 */
const SECRET_KEYS = [
  'sign_string',
  'signature',
  'secret',
  'secret_key',
  'key',
  'password',
  'authorization',
  'token',
  'card',
  'pan',
  'cvv',
];

export function sanitizePayload(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[chuqur]';
  if (Array.isArray(value)) return value.map((v) => sanitizePayload(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEYS.includes(k.toLowerCase()) ? '***' : sanitizePayload(v, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Basic auth sarlavhasidan login va parolni ajratadi.
 * Payme merchant API aynan shu usuldan foydalanadi: `Basic base64(Paycom:KEY)`.
 */
export function parseBasicAuth(
  header: string | undefined,
): { login: string; password: string } | null {
  if (!header) return null;
  const [scheme, encoded] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return null;
  }
  const idx = decoded.indexOf(':');
  if (idx < 0) return null;
  return { login: decoded.slice(0, idx), password: decoded.slice(idx + 1) };
}

/** Base64url — Payme checkout havolasi shu ko'rinishda bo'ladi. */
export function base64(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64');
}
