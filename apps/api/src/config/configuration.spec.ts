import { validateEnv } from './configuration';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('env tekshiruvi', () => {
  it('to‘g‘ri konfiguratsiyani qabul qiladi', () => {
    const env = validateEnv({ ...base });
    expect(env.OTP_TTL_SECONDS).toBe(300);
    expect(env.APP_ENV).toBe('development');
  });

  it('DATABASE_URL bo‘lmasa to‘xtaydi', () => {
    const { DATABASE_URL, ...rest } = base;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('productionda dev kalitni rad etadi', () => {
    expect(() =>
      validateEnv({ ...base, APP_ENV: 'production', JWT_ACCESS_SECRET: 'dev_access_secret_x' }),
    ).toThrow(/dev JWT/);
  });

  it('productionda OTP dev kodini rad etadi', () => {
    expect(() =>
      validateEnv({ ...base, APP_ENV: 'production', OTP_DEV_FIXED_CODE: '11111' }),
    ).toThrow(/OTP_DEV_FIXED_CODE/);
  });
});

describe("to'lov rejimi", () => {
  it('development da maket rejimi ruxsat etiladi', () => {
    const env = validateEnv({ ...base });
    expect(env.PAYMENTS_MODE).toBe('mock');
    expect(env.OFD_PROVIDER).toBe('mock');
  });

  it('staging da maket rejimi rad etiladi', () => {
    // Ochiq stendda imzosiz webhook va bir bosishli "to'lov" bo'lmasligi kerak.
    expect(() => validateEnv({ ...base, APP_ENV: 'staging' })).toThrow(/PAYMENTS_MODE=mock/);
  });

  it('NODE_ENV=production da ham maket rejimi rad etiladi', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(/PAYMENTS_MODE=mock/);
  });

  it('maket bo‘lmaganda kalitlar talab qilinadi', () => {
    expect(() =>
      validateEnv({ ...base, APP_ENV: 'staging', PAYMENTS_MODE: 'sandbox', OFD_PROVIDER: 'soliq' }),
    ).toThrow(/kalitlar yetishmaydi/);
  });

  it('kalitlar bo‘lsa sandbox ishga tushadi', () => {
    const env = validateEnv({
      ...base,
      APP_ENV: 'staging',
      PAYMENTS_MODE: 'sandbox',
      OFD_PROVIDER: 'soliq',
      CLICK_SERVICE_ID: '1',
      CLICK_SECRET_KEY: 'k',
      CLICK_MERCHANT_ID: '2',
      PAYME_MERCHANT_ID: 'm',
      PAYME_KEY: 'key',
    });
    expect(env.PAYMENTS_MODE).toBe('sandbox');
  });

  it('fiskal chek maketi productionda rad etiladi', () => {
    expect(() =>
      validateEnv({
        ...base,
        APP_ENV: 'staging',
        PAYMENTS_MODE: 'sandbox',
        CLICK_SERVICE_ID: '1',
        CLICK_SECRET_KEY: 'k',
        CLICK_MERCHANT_ID: '2',
        PAYME_MERCHANT_ID: 'm',
        PAYME_KEY: 'key',
      }),
    ).toThrow(/OFD_PROVIDER=mock/);
  });

  it('Payme tranzaksiya muddati standart 12 soat', () => {
    expect(validateEnv({ ...base }).PAYME_TRANSACTION_TIMEOUT_MS).toBe(43_200_000);
  });
});
