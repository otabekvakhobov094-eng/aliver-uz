import { discountPercent, formatPhone, formatPrice, formatTiyin } from './format';

describe('formatlash', () => {
  it('tiyinni so‘mga o‘girib formatlaydi', () => {
    expect(formatTiyin('57400000')).toBe('574 000');
    expect(formatTiyin(18900000n)).toBe('189 000');
  });

  it('tilga qarab birlikni qo‘yadi', () => {
    expect(formatPrice('18900000', 'UZ')).toBe('189 000 so‘m');
    expect(formatPrice('18900000', 'RU')).toBe('189 000 сум');
  });

  it('chegirma foizini hisoblaydi', () => {
    expect(discountPercent('24900000', '18900000')).toBe(24);
    expect(discountPercent('10000', '20000')).toBe(0);
  });

  it('telefonni formatlaydi', () => {
    expect(formatPhone('+998901234567')).toBe('+998 90 123 45 67');
  });
});
