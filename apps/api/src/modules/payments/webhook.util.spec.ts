import { base64, md5, parseBasicAuth, safeEqual, sanitizePayload } from './webhook.util';

describe('safeEqual', () => {
  it('bir xil satrlarni tan oladi', () => {
    expect(safeEqual('abc123', 'abc123')).toBe(true);
  });

  it('farqli satrlarni rad etadi', () => {
    expect(safeEqual('abc123', 'abc124')).toBe(false);
  });

  it('uzunligi har xil satrlarda ham yiqilmaydi', () => {
    expect(safeEqual('abc', 'abcdef')).toBe(false);
    expect(safeEqual('', 'a')).toBe(false);
  });

  it('bo‘sh qiymatlarda ham xato bermaydi', () => {
    expect(safeEqual('', '')).toBe(true);
  });
});

describe('md5', () => {
  it('ma’lum qiymatni to‘g‘ri hisoblaydi', () => {
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
  });
});

describe('parseBasicAuth', () => {
  it('Paycom kalitini ajratadi', () => {
    const header = `Basic ${base64('Paycom:my_secret_key')}`;
    expect(parseBasicAuth(header)).toEqual({ login: 'Paycom', password: 'my_secret_key' });
  });

  it('parolda ikki nuqta bo‘lsa ham to‘g‘ri ajratadi', () => {
    const header = `Basic ${base64('Paycom:a:b:c')}`;
    expect(parseBasicAuth(header)?.password).toBe('a:b:c');
  });

  it('noto‘g‘ri sarlavhada null qaytaradi', () => {
    expect(parseBasicAuth(undefined)).toBeNull();
    expect(parseBasicAuth('Bearer xyz')).toBeNull();
    expect(parseBasicAuth('Basic')).toBeNull();
  });
});

describe('sanitizePayload', () => {
  it('imzo va kalitlarni niqoblaydi', () => {
    const out = sanitizePayload({
      click_trans_id: 123,
      sign_string: 'deadbeef',
      nested: { password: 'x', amount: 500 },
    }) as Record<string, unknown>;

    expect(out.click_trans_id).toBe(123);
    expect(out.sign_string).toBe('***');
    expect((out.nested as Record<string, unknown>).password).toBe('***');
    expect((out.nested as Record<string, unknown>).amount).toBe(500);
  });

  it('massivlar ichida ham ishlaydi', () => {
    const out = sanitizePayload([{ token: 'a' }, { amount: 1 }]) as Array<Record<string, unknown>>;
    expect(out[0]!.token).toBe('***');
    expect(out[1]!.amount).toBe(1);
  });
});
