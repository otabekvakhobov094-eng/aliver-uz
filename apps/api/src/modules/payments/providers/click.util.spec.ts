import {
  CLICK_ACTION,
  clickAmountToTiyin,
  clickPayUrl,
  clickSignString,
  tiyinToClickAmount,
  verifyClickSign,
  type ClickRequest,
} from './click.util';
import { md5 } from '../webhook.util';

const SECRET = 'test_secret_key';

const prepareReq = (over: Partial<ClickRequest> = {}): ClickRequest => {
  const base: ClickRequest = {
    click_trans_id: '123456789',
    service_id: '12345',
    merchant_trans_id: 'ALV-260910-4821',
    amount: '189000.00',
    action: String(CLICK_ACTION.PREPARE),
    sign_time: '2026-09-10 12:00:00',
    sign_string: '',
    ...over,
  };
  base.sign_string =
    over.sign_string ??
    md5(
      `${base.click_trans_id}${base.service_id}${SECRET}${base.merchant_trans_id}${base.amount}${base.action}${base.sign_time}`,
    );
  return base;
};

describe('Click imzosi', () => {
  it('to‘g‘ri imzoni qabul qiladi (prepare)', () => {
    expect(verifyClickSign(prepareReq(), SECRET)).toBe(true);
  });

  it('noto‘g‘ri kalitni rad etadi', () => {
    expect(verifyClickSign(prepareReq(), 'boshqa_kalit')).toBe(false);
  });

  it('summa o‘zgartirilsa imzo mos kelmaydi', () => {
    const req = prepareReq();
    req.amount = '1.00';
    expect(verifyClickSign(req, SECRET)).toBe(false);
  });

  it('complete da merchant_prepare_id imzoga kiradi', () => {
    const req: ClickRequest = {
      click_trans_id: '999',
      service_id: '12345',
      merchant_trans_id: 'ALV-260910-4821',
      merchant_prepare_id: '77',
      amount: '189000.00',
      action: String(CLICK_ACTION.COMPLETE),
      sign_time: '2026-09-10 12:05:00',
      sign_string: md5(`999${'12345'}${SECRET}ALV-260910-482177189000.00${1}2026-09-10 12:05:00`),
    };
    expect(verifyClickSign(req, SECRET)).toBe(true);

    // prepare_id o'zgarsa imzo buziladi
    req.merchant_prepare_id = '78';
    expect(verifyClickSign(req, SECRET)).toBe(false);
  });

  it('imzo bo‘lmasa rad etiladi', () => {
    expect(verifyClickSign(prepareReq({ sign_string: '' }), SECRET)).toBe(false);
  });

  it('prepare va complete imzolari har xil bo‘ladi', () => {
    const a = clickSignString({
      clickTransId: '1',
      serviceId: '2',
      secretKey: SECRET,
      merchantTransId: 'X',
      amount: '10.00',
      action: '0',
      signTime: 't',
    });
    const b = clickSignString({
      clickTransId: '1',
      serviceId: '2',
      secretKey: SECRET,
      merchantTransId: 'X',
      merchantPrepareId: '5',
      amount: '10.00',
      action: '1',
      signTime: 't',
    });
    expect(a).not.toBe(b);
  });
});

describe('Click summasi', () => {
  it('so‘mni tiyinga aniq o‘giradi', () => {
    expect(clickAmountToTiyin('189000.00')).toBe(18_900_000n);
    expect(clickAmountToTiyin('189000')).toBe(18_900_000n);
    expect(clickAmountToTiyin('0.01')).toBe(1n);
    expect(clickAmountToTiyin('12.5')).toBe(1250n);
  });

  it('suzuvchi nuqta xatosiga yo‘l qo‘ymaydi', () => {
    // 0.29 * 100 JavaScript da 28.999... beradi; bizda aniq 29 tiyin.
    expect(clickAmountToTiyin('0.29')).toBe(29n);
    expect(clickAmountToTiyin('1234567.89')).toBe(123_456_789n);
  });

  it('noto‘g‘ri formatni rad etadi', () => {
    expect(clickAmountToTiyin('abc')).toBeNull();
    expect(clickAmountToTiyin('-10.00')).toBeNull();
    expect(clickAmountToTiyin('10.001')).toBeNull();
    expect(clickAmountToTiyin('')).toBeNull();
  });

  it('teskari o‘girish ham aniq', () => {
    expect(tiyinToClickAmount(18_900_000n)).toBe('189000.00');
    expect(tiyinToClickAmount(1n)).toBe('0.01');
    expect(tiyinToClickAmount(0n)).toBe('0.00');
  });

  it('ikki tomonlama o‘girish qiymatni saqlaydi', () => {
    for (const t of [0n, 1n, 99n, 100n, 123_456_789n]) {
      expect(clickAmountToTiyin(tiyinToClickAmount(t))).toBe(t);
    }
  });
});

describe('Click havolasi', () => {
  it('kerakli parametrlarni qo‘shadi', () => {
    const url = clickPayUrl({
      baseUrl: 'https://my.click.uz/services/pay',
      serviceId: '12345',
      merchantId: '54321',
      amountTiyin: 18_900_000n,
      merchantTransId: 'ALV-260910-4821',
      returnUrl: 'https://aliver.uz/uz/buyurtma/1',
    });
    expect(url).toContain('service_id=12345');
    expect(url).toContain('amount=189000.00');
    expect(url).toContain('transaction_param=ALV-260910-4821');
  });
});
