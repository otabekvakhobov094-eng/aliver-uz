import { formatPhone, normalizePhone } from './phone';

describe('telefon normalizatsiyasi', () => {
  it.each([
    ['+998 90 123 45 67', '+998901234567'],
    ['998901234567', '+998901234567'],
    ['90 123 45 67', '+998901234567'],
    ['(90) 123-45-67', '+998901234567'],
    ['0901234567', '+998901234567'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('noto‘g‘ri raqamni rad etadi', () => {
    expect(() => normalizePhone('123')).toThrow();
    expect(() => normalizePhone('+9989012345678888')).toThrow();
  });

  it('ko‘rsatish uchun formatlaydi', () => {
    expect(formatPhone('+998901234567')).toBe('+998 90 123 45 67');
  });
});
