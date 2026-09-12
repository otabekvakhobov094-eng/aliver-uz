import { createHash } from 'node:crypto';
import {
  buildEvent,
  buildUserData,
  fbcFromClickId,
  hashCity,
  hashEmail,
  hashName,
  hashPhone,
} from './meta-capi.util';

const sha = (v: string) => createHash('sha256').update(v, 'utf8').digest('hex');

describe('Meta Conversions API', () => {
  describe('telefonni normallashtirish', () => {
    it('turli yozuvlar BIR XIL xesh beradi', () => {
      // Bu testning butun mazmuni shu. Mijoz raqamni «+998 90 123-45-67»
      // deb ham, «901234567» deb ham yozadi. Normallashtirish bo'lmasa
      // ular ikki xil xesh beradi va Facebook bir odamni ikki deb biladi
      // — ya'ni moslik topilmaydi va CAPI ning ma'nosi qolmaydi.
      const expected = sha('998901234567');
      expect(hashPhone('+998 90 123-45-67')).toBe(expected);
      expect(hashPhone('998901234567')).toBe(expected);
      expect(hashPhone('901234567')).toBe(expected);
      expect(hashPhone('(90) 123 45 67')).toBe(expected);
    });

    it('ichki formatdagi boshlang‘ich nol olib tashlanadi', () => {
      expect(hashPhone('0901234567')).toBe(sha('998901234567'));
    });

    it('juda qisqa raqam yuborilmaydi', () => {
      expect(hashPhone('123')).toBeUndefined();
      expect(hashPhone('')).toBeUndefined();
      expect(hashPhone(null)).toBeUndefined();
    });
  });

  describe('e-pochta', () => {
    it('kichik harfga o‘giriladi va bo‘shliqlar kesiladi', () => {
      const expected = sha('anvar@example.com');
      expect(hashEmail('  Anvar@Example.COM ')).toBe(expected);
    });

    it('e-pochtaga o‘xshamasa yuborilmaydi', () => {
      expect(hashEmail('anvar')).toBeUndefined();
      expect(hashEmail('')).toBeUndefined();
    });
  });

  describe('ism va shahar', () => {
    it('faqat harflar qoladi', () => {
      expect(hashName('  Anvar  ')).toBe(sha('anvar'));
      expect(hashName("O‘g‘abek")).toBe(sha('o‘g‘abek'.replace(/[^\p{L}]/gu, '')));
    });

    it('shahardagi bo‘shliqlar olib tashlanadi', () => {
      expect(hashCity('Toshkent ')).toBe(sha('toshkent'));
    });
  });

  describe('user_data', () => {
    it('shaxsiy ma’lumot XESHLANADI, texnik maydonlar — yo‘q', () => {
      const data = buildUserData({
        email: 'a@b.uz',
        phone: '901234567',
        fbp: 'fb.1.123.456',
        clientIp: '84.54.1.1',
        userAgent: 'Mozilla/5.0',
      });
      // Xeshlangan
      expect(data.em).toBe(sha('a@b.uz'));
      expect(data.ph).toBe(sha('998901234567'));
      // Xeshlanmagan — Meta ularni ochiq kutadi
      expect(data.fbp).toBe('fb.1.123.456');
      expect(data.client_ip_address).toBe('84.54.1.1');
      expect(data.client_user_agent).toBe('Mozilla/5.0');
    });

    it('ochiq telefon yoki e-pochta HECH QACHON chiqmaydi', () => {
      const data = buildUserData({ email: 'a@b.uz', phone: '+998901234567' });
      const json = JSON.stringify(data);
      expect(json).not.toContain('a@b.uz');
      expect(json).not.toContain('998901234567');
    });

    it('bo‘sh maydonlar umuman yuborilmaydi', () => {
      const data = buildUserData({ email: null, phone: '' });
      expect(Object.keys(data)).toHaveLength(0);
    });
  });

  describe('hodisa', () => {
    it('vaqt SONIYADA bo‘ladi, millisekundda emas', () => {
      // Millisekund yuborilsa Meta hodisani «kelajakdan» deb rad etadi.
      const e = buildEvent({
        eventName: 'Purchase',
        eventId: 'order-1',
        eventTime: 1_700_000_000_000,
        identity: {},
      });
      expect(e.event_time).toBe(1_700_000_000);
    });

    it('`event_id` o‘zgartirilmaydi — brauzer bilan birlashtirish shunga bog‘liq', () => {
      const e = buildEvent({ eventName: 'Purchase', eventId: 'order-abc', identity: {} });
      expect(e.event_id).toBe('order-abc');
      expect(e.action_source).toBe('website');
    });

    it('summa va mahsulotlar `custom_data` ga tushadi', () => {
      const e = buildEvent({
        eventName: 'Purchase',
        eventId: 'order-1',
        identity: {},
        value: 250_000,
        items: [{ id: 'sku-1', quantity: 2, price: 125_000 }],
      });
      const custom = e.custom_data as Record<string, unknown>;
      expect(custom.value).toBe(250_000);
      expect(custom.currency).toBe('UZS');
      expect(custom.content_ids).toEqual(['sku-1']);
    });

    it('summa berilmasa `value` umuman qo‘yilmaydi', () => {
      // Nol yuborish noto'g'ri: Facebook uni «qiymati nol konversiya»
      // deb hisoblaydi va optimizatsiyani buzadi.
      const e = buildEvent({ eventName: 'Lead', eventId: 'lead-1', identity: {} });
      expect(e.custom_data).not.toHaveProperty('value');
    });
  });

  it('fbclid dan fbc yasaydi', () => {
    expect(fbcFromClickId('AbC123', 1_700_000_000_000)).toBe('fb.1.1700000000000.AbC123');
    expect(fbcFromClickId(null)).toBeUndefined();
  });
});
