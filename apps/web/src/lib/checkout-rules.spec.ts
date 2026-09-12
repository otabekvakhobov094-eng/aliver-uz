import {
  type CheckoutFormState,
  blockerMessage,
  canSubmitOrder,
  checkoutBlockers,
} from './checkout-rules';

/**
 * Buyurtma tugmasining sharti.
 *
 * Bu yerdagi xato savdoni JIMGINA to'xtatadi: tugma bosilmaydi,
 * server hech qanday so'rov ko'rmaydi, logda hech narsa yo'q.
 * Shuning uchun har bir shart alohida sinaladi.
 */

function state(over: Partial<CheckoutFormState> = {}): CheckoutFormState {
  return {
    phone: '+998 90 123 45 67',
    firstName: 'Dilnoza',
    regionId: 'reg-1',
    methodCode: 'COURIER_TASHKENT',
    addressLine: 'Amir Temur 12, 4-xonadon',
    needsAddress: true,
    needsOtp: false,
    otpCode: '',
    accept: true,
    hasBlockingItems: false,
    submitting: false,
    ...over,
  };
}

describe('canSubmitOrder', () => {
  it('to‘liq to‘ldirilgan forma yuboriladi', () => {
    expect(canSubmitOrder(state())).toBe(true);
  });

  it('telefonda 9 ta raqam yetarli', () => {
    expect(canSubmitOrder(state({ phone: '901234567' }))).toBe(true);
  });

  it('telefon qisqa bo‘lsa yuborilmaydi', () => {
    expect(checkoutBlockers(state({ phone: '+998 90 12' }))).toContain('phone');
  });

  it('formatlash belgilari raqam o‘rnini bosmaydi', () => {
    // «+998 ( ) - » belgilari 9 ta raqamdek ko'rinishi mumkin edi.
    expect(checkoutBlockers(state({ phone: '+998 (  )   -  -  ' }))).toContain('phone');
  });

  it('bir harfli ism qabul qilinmaydi', () => {
    expect(checkoutBlockers(state({ firstName: 'D' }))).toContain('name');
  });

  it('faqat bo‘sh joydan iborat ism qabul qilinmaydi', () => {
    expect(checkoutBlockers(state({ firstName: '   ' }))).toContain('name');
  });

  it('viloyat tanlanmasa yuborilmaydi', () => {
    expect(checkoutBlockers(state({ regionId: '' }))).toContain('region');
  });

  it('yetkazib berish usuli tanlanmasa yuborilmaydi', () => {
    expect(checkoutBlockers(state({ methodCode: '' }))).toContain('method');
  });

  it('kuryerda manzil majburiy', () => {
    expect(checkoutBlockers(state({ addressLine: 'uy' }))).toContain('address');
  });

  it('OLIB KETISHDA manzil so‘ralmaydi', () => {
    // Punkt manzili o'zi ma'lum. Manzilni talab qilish mijozni boshi
    // berk ko'chaga olib borardi: maydon ko'rinmaydi, tugma esa
    // ishlamaydi.
    expect(canSubmitOrder(state({ needsAddress: false, addressLine: '' }))).toBe(true);
  });

  it('naqd to‘lovda SMS kodi majburiy', () => {
    expect(checkoutBlockers(state({ needsOtp: true, otpCode: '' }))).toContain('otp');
  });

  it('naqd to‘lovda to‘liq kod bilan o‘tadi', () => {
    expect(canSubmitOrder(state({ needsOtp: true, otpCode: '12345' }))).toBe(true);
  });

  it('onlayn to‘lovda SMS kodi so‘ralmaydi', () => {
    expect(canSubmitOrder(state({ needsOtp: false, otpCode: '' }))).toBe(true);
  });

  it('oferta qabul qilinmasa yuborilmaydi', () => {
    expect(checkoutBlockers(state({ accept: false }))).toContain('accept');
  });

  it('qoldiqdan ko‘p tovar bo‘lsa yuborilmaydi', () => {
    // Aks holda har bosishda server 409 qaytarardi va mijoz nima
    // qilish kerakligini o'zi topishi kerak bo'lardi.
    expect(checkoutBlockers(state({ hasBlockingItems: true }))).toContain('stock');
  });

  it('yuborilayotgan paytda ikkinchi marta bosib bo‘lmaydi', () => {
    expect(canSubmitOrder(state({ submitting: true }))).toBe(false);
  });
});

describe('blockerMessage', () => {
  it('birinchi yetishmayotgan narsa formadagi tartibda bo‘ladi', () => {
    // Ismi ham, roziligi ham yo'q bo'lsa — avval ism haqida aytiladi,
    // chunki u formada yuqorida turadi.
    const blockers = checkoutBlockers(state({ firstName: '', accept: false }));
    expect(blockers[0]).toBe('name');
  });

  it('«yuborilmoqda» uchun izoh yo‘q — tugmaning o‘zi shuni aytadi', () => {
    expect(blockerMessage('submitting', 'uz')).toBeNull();
  });

  it('hech narsa yetishmasa izoh ham yo‘q', () => {
    expect(blockerMessage(undefined, 'uz')).toBeNull();
  });

  it('ruscha va o‘zbekcha matnlar bir-biridan farq qiladi', () => {
    expect(blockerMessage('accept', 'ru')).not.toBe(blockerMessage('accept', 'uz'));
    expect(blockerMessage('accept', 'ru')).toMatch(/оферт/i);
  });

  it('har bir sabab uchun matn bor', () => {
    // Matni yo'q sabab tugmani jimgina bloklab qo'yardi — ya'ni
    // aynan tuzatmoqchi bo'lgan holat qaytib kelardi.
    for (const b of ['stock', 'phone', 'name', 'region', 'method', 'address', 'otp', 'accept'] as const) {
      expect(blockerMessage(b, 'uz')).toBeTruthy();
      expect(blockerMessage(b, 'ru')).toBeTruthy();
    }
  });
});
