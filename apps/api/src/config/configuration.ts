import { z } from 'zod';

const bool = () =>
  z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1');

const int = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number(v)))
    .pipe(z.number().int());

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  TZ: z.string().default('Asia/Tashkent'),

  API_PORT: int(4000),
  API_URL: z.string().url().default('http://localhost:4000'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  ADMIN_URL: z.string().url().default('http://localhost:3001'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL majburiy'),
  REDIS_URL: z.string().min(1, 'REDIS_URL majburiy'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET juda qisqa'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET juda qisqa'),
  JWT_ACCESS_TTL: int(900),
  JWT_REFRESH_TTL: int(2592000),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: bool(),

  OTP_LENGTH: int(5),
  OTP_TTL_SECONDS: int(300),
  OTP_RESEND_COOLDOWN_SECONDS: int(60),
  OTP_MAX_PER_PHONE_PER_DAY: int(5),
  OTP_MAX_VERIFY_ATTEMPTS: int(5),
  OTP_MAX_PER_IP_PER_HOUR: int(20),
  OTP_DEV_FIXED_CODE: z.string().optional(),

  /**
   * SMS provayderi.
   *  - `console` — SMS yuborilmaydi, matn logga chiqadi (development).
   *  - `eskiz` / `playmobile` — haqiqiy provayder, shartnoma va kalit kerak.
   */
  SMS_PROVIDER: z.enum(['console', 'eskiz', 'playmobile']).default('console'),
  SMS_SENDER: z.string().default('ALIVER'),
  SMS_API_URL: z.string().optional(),
  SMS_API_LOGIN: z.string().optional(),
  SMS_API_PASSWORD: z.string().optional(),
  /** Bitta xabar uchun urinishlar soni. */
  SMS_MAX_ATTEMPTS: int(5),

  /**
   * Telegram. `TELEGRAM_BOT_TOKEN` bo'lmasa bildirishnomalar logga
   * chiqadi va "yuborilgan" deb belgilanmaydi — maket rejimi.
   */
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ORDERS_CHAT_ID: z.string().optional(),
  /** Operatorlar kanaliga qaysi tilda yoziladi. */
  TELEGRAM_LANG: z.enum(['uz', 'ru']).default('uz'),

  /** Bildirishnomalar tunda yuborilmaydi (mahalliy vaqt, Asia/Tashkent). */
  NOTIFY_QUIET_FROM: int(22),
  NOTIFY_QUIET_TO: int(8),

  /**
   * To'lov rejimi.
   *  - `mock`    — provayder kalitlari yo'q. To'lov havolasi bizning
   *                soxta to'lov sahifamizga olib boradi, webhook esa
   *                imzosiz qabul qilinadi. Faqat development uchun.
   *  - `sandbox` — provayderning test muhiti: imzo TEKSHIRILADI.
   *  - `live`    — jangovar rejim.
   *
   * Productionda `mock` ATAYLAB taqiqlanadi (pastdagi tekshiruvga qarang).
   */
  PAYMENTS_MODE: z.enum(['mock', 'sandbox', 'live']).default('mock'),

  CLICK_MERCHANT_ID: z.string().optional(),
  CLICK_SERVICE_ID: z.string().optional(),
  CLICK_SECRET_KEY: z.string().optional(),
  CLICK_MERCHANT_USER_ID: z.string().optional(),
  CLICK_CHECKOUT_URL: z.string().default('https://my.click.uz/services/pay'),

  PAYME_MERCHANT_ID: z.string().optional(),
  PAYME_KEY: z.string().optional(),
  PAYME_TEST_KEY: z.string().optional(),
  PAYME_CHECKOUT_URL: z.string().default('https://checkout.paycom.uz'),
  /** Payme tranzaksiyasining amal qilish muddati (millisekund). Standart 12 soat. */
  PAYME_TRANSACTION_TIMEOUT_MS: int(43_200_000),

  /**
   * Fiskal chek. `mock` — OFD provayderi tanlanmagan: chek shakllantiriladi,
   * saqlanadi va "yuborilgan" deb belgilanadi, lekin hech qayerga ketmaydi.
   */
  OFD_PROVIDER: z.enum(['mock', 'soliq']).default('mock'),
  OFD_API_URL: z.string().optional(),
  OFD_API_TOKEN: z.string().optional(),
  OFD_TERMINAL_ID: z.string().optional(),
  OFD_MAX_ATTEMPTS: int(8),

  SEED_SUPERADMIN_EMAIL: z.string().email().default('admin@aliver.uz'),
  SEED_SUPERADMIN_PASSWORD: z.string().default('Admin12345!'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Muhit o'zgaruvchilari ilova ko'tarilishida bir marta tekshiriladi.
 * Noto'g'ri konfiguratsiya bilan ishga tushishdan ko'ra darrov to'xtash yaxshiroq.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Muhit o‘zgaruvchilari noto‘g‘ri:\n${lines.join('\n')}`);
  }
  if (parsed.data.APP_ENV === 'production') {
    if (parsed.data.JWT_ACCESS_SECRET.includes('dev_')) {
      throw new Error('Productionda dev JWT kaliti ishlatilmaydi');
    }
    if (parsed.data.OTP_DEV_FIXED_CODE) {
      throw new Error('Productionda OTP_DEV_FIXED_CODE bo‘lmasligi kerak');
    }
  }

  // Maket rejimi FAQAT development da ishlaydi.
  //
  // Bu tekshiruv ataylab `APP_ENV === 'production'` dan tashqarida:
  // maket rejimida webhook imzosi tekshirilmaydi va `/payments/mock/confirm`
  // ochiq turadi — ya'ni buyurtma id sini bilgan har kim tovarni bepul
  // olishi mumkin. Ochiq staging ham bunga chidamaydi. `APP_ENV`
  // ko'rsatilmasa `development` bo'ladi, shuning uchun NODE_ENV ham
  // alohida tekshiriladi.
  const devOnly = parsed.data.APP_ENV === 'development' && parsed.data.NODE_ENV !== 'production';

  if (!devOnly) {
    if (parsed.data.PAYMENTS_MODE === 'mock') {
      throw new Error(
        `PAYMENTS_MODE=mock faqat development uchun (hozir APP_ENV=${parsed.data.APP_ENV}, ` +
          `NODE_ENV=${parsed.data.NODE_ENV}). sandbox yoki live tanlang.`,
      );
    }
    if (parsed.data.OFD_PROVIDER === 'mock') {
      throw new Error(
        `OFD_PROVIDER=mock faqat development uchun (hozir APP_ENV=${parsed.data.APP_ENV}). ` +
          'Fiskal chek qonun talabi.',
      );
    }
  }

  // SMS provayderi tanlangan bo'lsa, kaliti ham bo'lishi shart.
  if (parsed.data.SMS_PROVIDER !== 'console') {
    const missing: string[] = [];
    if (!parsed.data.SMS_API_URL) missing.push('SMS_API_URL');
    if (!parsed.data.SMS_API_LOGIN) missing.push('SMS_API_LOGIN');
    if (!parsed.data.SMS_API_PASSWORD) missing.push('SMS_API_PASSWORD');
    if (missing.length > 0) {
      throw new Error(
        `SMS_PROVIDER=${parsed.data.SMS_PROVIDER} uchun sozlamalar yetishmaydi: ${missing.join(', ')}`,
      );
    }
  }

  // Productionda mijozga SMS yuborilmasligi jiddiy nosozlik: mijoz
  // buyurtmasi holatidan bexabar qoladi.
  if (parsed.data.APP_ENV === 'production' && parsed.data.SMS_PROVIDER === 'console') {
    throw new Error('Productionda SMS_PROVIDER=console bo‘lishi mumkin emas');
  }

  // Kalitlar bo'lmasa jangovar rejim ishga tushmaydi: "to'lov ishlamayapti"
  // deb keyin qidirgandan ko'ra, darrov sababini aytgan yaxshi.
  if (parsed.data.PAYMENTS_MODE !== 'mock') {
    const missing: string[] = [];
    if (!parsed.data.CLICK_SERVICE_ID) missing.push('CLICK_SERVICE_ID');
    if (!parsed.data.CLICK_SECRET_KEY) missing.push('CLICK_SECRET_KEY');
    if (!parsed.data.CLICK_MERCHANT_ID) missing.push('CLICK_MERCHANT_ID');
    if (!parsed.data.PAYME_MERCHANT_ID) missing.push('PAYME_MERCHANT_ID');
    if (!parsed.data.PAYME_KEY) missing.push('PAYME_KEY');
    if (missing.length > 0) {
      throw new Error(
        `PAYMENTS_MODE=${parsed.data.PAYMENTS_MODE} uchun kalitlar yetishmaydi: ${missing.join(', ')}`,
      );
    }
  }

  return parsed.data;
}

export const configuration = () => validateEnv(process.env as Record<string, unknown>);
