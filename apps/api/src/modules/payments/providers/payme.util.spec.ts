import {
  PAYME_ERROR,
  PAYME_STATE,
  isTransactionExpired,
  normalizePaymeTime,
  paymeAmountToTiyin,
  paymeCheckoutUrl,
  rpcError,
  rpcResult,
} from './payme.util';

describe('Payme summasi', () => {
  it('tiyindagi butun sonni qabul qiladi', () => {
    expect(paymeAmountToTiyin(18_900_000)).toBe(18_900_000n);
    expect(paymeAmountToTiyin(0)).toBe(0n);
  });

  it('kasrli yoki manfiy summani rad etadi', () => {
    expect(paymeAmountToTiyin(100.5)).toBeNull();
    expect(paymeAmountToTiyin(-1)).toBeNull();
  });

  it('son bo‘lmagan qiymatni rad etadi', () => {
    expect(paymeAmountToTiyin('100')).toBeNull();
    expect(paymeAmountToTiyin(null)).toBeNull();
    expect(paymeAmountToTiyin(undefined)).toBeNull();
    expect(paymeAmountToTiyin(Number.NaN)).toBeNull();
  });
});

describe('JSON-RPC javoblari', () => {
  it('natija javobi jsonrpc va id ni saqlaydi', () => {
    expect(rpcResult(7, { allow: true })).toEqual({
      jsonrpc: '2.0',
      id: 7,
      result: { allow: true },
    });
  });

  it('id bo‘lmasa 0 qo‘yiladi', () => {
    expect(rpcResult(undefined, {}).id).toBe(0);
    expect(rpcError(null, PAYME_ERROR.INTERNAL).id).toBe(0);
  });

  it('xato javobi uch tilli xabar beradi', () => {
    const err = rpcError(1, PAYME_ERROR.ORDER_NOT_FOUND);
    expect(err.error.code).toBe(-31050);
    expect(err.error.message).toEqual({
      uz: 'Buyurtma topilmadi',
      ru: 'Заказ не найден',
      en: 'Order not found',
    });
  });

  it('data maydoni faqat berilganda qo‘shiladi', () => {
    expect(rpcError(1, PAYME_ERROR.INVALID_AMOUNT)).not.toHaveProperty('error.data');
    expect(rpcError(1, PAYME_ERROR.INVALID_AMOUNT, 'amount')).toHaveProperty(
      'error.data',
      'amount',
    );
  });
});

describe('checkout havolasi', () => {
  it('base64 ichida merchant, buyurtma va summa bo‘ladi', () => {
    const url = paymeCheckoutUrl({
      baseUrl: 'https://checkout.paycom.uz',
      merchantId: 'm123',
      orderField: 'order_id',
      orderValue: 'ALV-260910-4821',
      amountTiyin: 18_900_000n,
      returnUrl: 'https://aliver.uz/uz/buyurtma/1',
    });
    const encoded = url.split('/').pop()!;
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');

    expect(decoded).toContain('m=m123');
    expect(decoded).toContain('ac.order_id=ALV-260910-4821');
    expect(decoded).toContain('a=18900000');
  });
});

describe('tranzaksiya muddati', () => {
  const TWELVE_HOURS = 12 * 3600 * 1000;

  it('12 soat ichida muddati tugamaydi', () => {
    const created = 1_000_000_000_000;
    expect(isTransactionExpired(created, created + TWELVE_HOURS - 1, TWELVE_HOURS)).toBe(false);
  });

  it('12 soatdan keyin muddati tugaydi', () => {
    const created = 1_000_000_000_000;
    expect(isTransactionExpired(created, created + TWELVE_HOURS + 1, TWELVE_HOURS)).toBe(true);
  });
});

describe('vaqt normallashtirish', () => {
  it('millisekundni o‘zgartirmaydi', () => {
    expect(normalizePaymeTime(1_757_500_000_000, 0)).toBe(1_757_500_000_000);
  });

  it('soniyani millisekundga o‘giradi', () => {
    expect(normalizePaymeTime(1_757_500_000, 0)).toBe(1_757_500_000_000);
  });

  it('noto‘g‘ri qiymatda zaxira vaqtni beradi', () => {
    expect(normalizePaymeTime('x', 42)).toBe(42);
    expect(normalizePaymeTime(0, 42)).toBe(42);
    expect(normalizePaymeTime(-5, 42)).toBe(42);
  });
});

describe('holat kodlari', () => {
  it('Payme hujjatidagi qiymatlarga mos', () => {
    expect(PAYME_STATE.CREATED).toBe(1);
    expect(PAYME_STATE.PERFORMED).toBe(2);
    expect(PAYME_STATE.CANCELLED_BEFORE_PERFORM).toBe(-1);
    expect(PAYME_STATE.CANCELLED_AFTER_PERFORM).toBe(-2);
  });
});
