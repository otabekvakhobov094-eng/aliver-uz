import { telHref, telegramHandle } from './store-settings';

/**
 * Do'kon aloqa ma'lumotlari.
 *
 * Telefon va Telegram adminda odam qo'li bilan kiritiladi, ya'ni
 * ular har xil ko'rinishda keladi: «+998 90 199 99 33», «@aliver_uz»,
 * «aliver_uz», ba'zan to'liq havola. Sayt ularning hammasidan
 * ishlaydigan havola yasay olishi kerak.
 */
describe('telHref', () => {
  it('bo‘shliq va qavslar tashlanadi', () => {
    expect(telHref('+998 90 199 99 33')).toBe('tel:+998901999933');
    expect(telHref('(90) 199-99-33')).toBe('tel:+901999933');
  });
});

describe('telegramHandle', () => {
  it('@ bilan ham, usiz ham ishlaydi', () => {
    expect(telegramHandle('@aliver_uz')).toEqual({
      handle: '@aliver_uz',
      href: 'https://t.me/aliver_uz',
    });
    expect(telegramHandle('aliver_uz')).toEqual({
      handle: '@aliver_uz',
      href: 'https://t.me/aliver_uz',
    });
  });

  it('to‘liq havola yozilgan bo‘lsa ham ishlaydi', () => {
    // Xodim brauzerdan nusxa ko'chirib qo'yishi mumkin — va o'shanda
    // havola «t.me/https://t.me/...» bo'lib buzilardi.
    expect(telegramHandle('https://t.me/aliver_uz').href).toBe('https://t.me/aliver_uz');
  });

  it('ortiqcha bo‘shliq tozalanadi', () => {
    expect(telegramHandle('  @aliver_uz  ').handle).toBe('@aliver_uz');
  });
});
