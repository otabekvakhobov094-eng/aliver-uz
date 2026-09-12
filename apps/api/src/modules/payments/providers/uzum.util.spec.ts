import {
  type UzumConfig,
  missingUzumConfig,
  uzumBlockReason,
  uzumMockUrl,
  uzumPayUrl,
} from './uzum.util';

function cfg(over: Partial<UzumConfig> = {}): UzumConfig {
  return {
    mode: 'live',
    enabled: false,
    merchantId: '',
    serviceId: '',
    checkoutUrl: '',
    webUrl: 'https://aliver.uz',
    ...over,
  };
}

const FULL = {
  enabled: true,
  merchantId: 'm-1',
  serviceId: 's-1',
  checkoutUrl: 'https://checkout.uzum.uz/pay',
};

describe('Uzum — maket rejimi', () => {
  it('maket hech qanday sozlama talab qilmaydi: oqim bugun sinaladi', () => {
    expect(uzumBlockReason(cfg({ mode: 'mock' }))).toBeNull();
  });

  it('maket havolasi o‘z sahifamizga va provayderni ochiq aytadi', () => {
    const url = uzumMockUrl('https://aliver.uz', 'o-1');
    expect(url).toContain('/uz/tolov/maket');
    expect(url).toContain('provider=UZUM');
    expect(url).toContain('order=o-1');
  });
});

describe('Uzum — jangovar rejim to‘sig‘i', () => {
  /**
   * Eng qimmat xato: kalitlar to'liq, callback hujjati esa yo'q holda
   * sotuvga chiqish. Pul kelardi, biz esa uni qaysi buyurtmaga
   * yozishni bilmasdik. Shuning uchun bayroq sozlamadan ALOHIDA.
   */
  it('sozlama to‘liq bo‘lsa ham UZUM_ENABLED siz ochilmaydi', () => {
    const reason = uzumBlockReason(cfg({ ...FULL, enabled: false }));
    expect(reason).toMatch(/UZUM_ENABLED/);
  });

  it('yoqilgan, lekin sozlama yetishmasa — nomma-nom aytadi', () => {
    const reason = uzumBlockReason(cfg({ enabled: true, merchantId: 'm-1' }));
    expect(reason).toContain('UZUM_SERVICE_ID');
    expect(reason).toContain('UZUM_CHECKOUT_URL');
    expect(reason).not.toContain('UZUM_MERCHANT_ID');
  });

  it('yoqilgan va to‘liq bo‘lsa to‘siq yo‘q', () => {
    expect(uzumBlockReason(cfg(FULL))).toBeNull();
  });

  it('yetishmayotganlar ro‘yxati barqaror tartibda', () => {
    expect(missingUzumConfig(cfg())).toEqual([
      'UZUM_MERCHANT_ID',
      'UZUM_SERVICE_ID',
      'UZUM_CHECKOUT_URL',
    ]);
  });
});

describe('Uzum — to‘lov havolasi', () => {
  const base = {
    checkoutUrl: 'https://checkout.uzum.uz/pay',
    merchantId: 'm-1',
    serviceId: 's-1',
    orderNumber: 'ALV-1001',
    returnUrl: 'https://aliver.uz/uz/buyurtma/o-1',
  };

  it('barcha majburiy parametrlarni qo‘yadi', () => {
    const url = new URL(uzumPayUrl({ ...base, amountTiyin: 18900000n }));
    expect(url.searchParams.get('merchant_id')).toBe('m-1');
    expect(url.searchParams.get('service_id')).toBe('s-1');
    expect(url.searchParams.get('order_id')).toBe('ALV-1001');
    expect(url.searchParams.get('return_url')).toBe(base.returnUrl);
  });

  /**
   * Butun tizimda pul tiyinda. Bu yerda so'mga o'girish bo'lsa,
   * Uzum 100 barobar kam summa so'rardi va buni faqat birinchi
   * haqiqiy to'lovda bilardik.
   */
  it('summani TIYINDA uzatadi, so‘mga o‘girmaydi', () => {
    const url = new URL(uzumPayUrl({ ...base, amountTiyin: 18900000n }));
    expect(url.searchParams.get('amount')).toBe('18900000');
  });

  it('katta summa ham aniq qoladi — BigInt, suzuvchi nuqta emas', () => {
    const url = new URL(uzumPayUrl({ ...base, amountTiyin: 999999999999n }));
    expect(url.searchParams.get('amount')).toBe('999999999999');
  });

  it('manzil sozlamadan olinadi — sandbox ga ko‘chirish uchun', () => {
    const url = uzumPayUrl({ ...base, checkoutUrl: 'https://sandbox.uzum.uz/pay', amountTiyin: 1n });
    expect(url).toContain('sandbox.uzum.uz');
  });

  it('manzilda avvaldan parametr bo‘lsa u yo‘qolmaydi', () => {
    const url = new URL(
      uzumPayUrl({ ...base, checkoutUrl: 'https://checkout.uzum.uz/pay?lang=uz', amountTiyin: 1n }),
    );
    expect(url.searchParams.get('lang')).toBe('uz');
    expect(url.searchParams.get('merchant_id')).toBe('m-1');
  });

  it('buyurtma raqami kodlanadi', () => {
    const url = new URL(uzumPayUrl({ ...base, orderNumber: 'ALV 10/01', amountTiyin: 1n }));
    expect(url.searchParams.get('order_id')).toBe('ALV 10/01');
    expect(url.toString()).not.toContain('ALV 10/01');
  });
});
