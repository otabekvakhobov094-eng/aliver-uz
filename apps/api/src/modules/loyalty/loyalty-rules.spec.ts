import {
  MAX_REDEEM_SHARE,
  POINTS_PER_SUM,
  TIYIN_PER_POINT,
  expiresAt,
  expiryState,
  expiryWarnKey,
  planRedeem,
  pointsForOrder,
  pointsToTiyin,
  reversalFor,
  tiyinToPoints,
} from './loyalty-rules';

describe('Ball berish', () => {
  it('har 1 000 so‘mga 1 ball', () => {
    expect(pointsForOrder({ itemsTotalAfterDiscount: 18_900_00n })).toBe(18);
    expect(POINTS_PER_SUM).toBe(1_000_00n);
  });

  it('pastga yaxlitlanadi — yarim ball degan narsa yo‘q', () => {
    expect(pointsForOrder({ itemsTotalAfterDiscount: 1_999_00n })).toBe(1);
  });

  it('nol yoki manfiy summa ball bermaydi', () => {
    expect(pointsForOrder({ itemsTotalAfterDiscount: 0n })).toBe(0);
    expect(pointsForOrder({ itemsTotalAfterDiscount: -500_00n })).toBe(0);
  });

  /**
   * Ball bilan qoplangan qismga ball BERILMAYDI. Aks holda mijoz
   * ballarni aylantirib, cheksiz ball ishlab chiqarardi.
   */
  it('ball bilan to‘langan qismga ball berilmaydi', () => {
    expect(
      pointsForOrder({ itemsTotalAfterDiscount: 100_000_00n, paidWithPoints: 40_000_00n }),
    ).toBe(60);
  });

  it('hammasi ball bilan to‘langan bo‘lsa yangi ball yo‘q', () => {
    expect(
      pointsForOrder({ itemsTotalAfterDiscount: 50_000_00n, paidWithPoints: 50_000_00n }),
    ).toBe(0);
  });
});

describe('Ball va so‘m o‘rtasida', () => {
  it('1 ball = 100 so‘m', () => {
    expect(TIYIN_PER_POINT).toBe(100_00n);
    expect(pointsToTiyin(25)).toBe(2_500_00n);
  });

  it('teskari hisob ham mos keladi', () => {
    expect(tiyinToPoints(2_500_00n)).toBe(25);
  });

  it('to‘liq bo‘lmagan ball pastga tashlanadi', () => {
    expect(tiyinToPoints(2_599_00n)).toBe(25);
  });

  it('manfiy va nol xavfsiz', () => {
    expect(pointsToTiyin(0)).toBe(0n);
    expect(pointsToTiyin(-5)).toBe(0n);
    expect(tiyinToPoints(-100n)).toBe(0);
  });
});

describe('Ball ishlatish rejasi', () => {
  const ORDER = 200_000_00n; // 200 000 so'm

  it('chegara ichida so‘ralgani to‘liq beriladi', () => {
    const p = planRedeem({ requestedPoints: 50, balance: 500, itemsTotalAfterDiscount: ORDER });
    expect(p.points).toBe(50);
    expect(p.amount).toBe(5_000_00n);
    expect(p.reason).toBe('ok');
  });

  /**
   * Uchta chegara birga qo'llanadi va eng KICHIGI g'olib chiqadi.
   * Ularni alohida tekshirish har safar bittasini unutishga olib
   * kelardi.
   */
  it('balans yetmasa balans bilan cheklanadi', () => {
    const p = planRedeem({ requestedPoints: 500, balance: 30, itemsTotalAfterDiscount: ORDER });
    expect(p.points).toBe(30);
    expect(p.reason).toBe('balance');
  });

  it('buyurtmaning yarmidan ko‘pini qoplab bo‘lmaydi', () => {
    // 200 000 so'm → yarmi 100 000 so'm → 1000 ball.
    const p = planRedeem({ requestedPoints: 5000, balance: 9999, itemsTotalAfterDiscount: ORDER });
    expect(p.maxPoints).toBe(1000);
    expect(p.points).toBe(1000);
    expect(p.amount).toBe(100_000_00n);
    expect(p.reason).toBe('cap');
  });

  it('ulush chegarasi e’lon qilingan foizga mos', () => {
    expect(MAX_REDEEM_SHARE).toBe(50);
  });

  it('bo‘sh balansda hech narsa berilmaydi', () => {
    const p = planRedeem({ requestedPoints: 100, balance: 0, itemsTotalAfterDiscount: ORDER });
    expect(p.points).toBe(0);
    expect(p.amount).toBe(0n);
    expect(p.reason).toBe('nothing');
  });

  it('juda kichik buyurtmada ball ishlatib bo‘lmaydi', () => {
    // 150 so'm → yarmi 75 so'm → 0 ball.
    const p = planRedeem({ requestedPoints: 10, balance: 100, itemsTotalAfterDiscount: 150_00n });
    expect(p.maxPoints).toBe(0);
    expect(p.reason).toBe('nothing');
  });

  it('manfiy va kasr so‘rov xavfsiz ishlanadi', () => {
    expect(planRedeem({ requestedPoints: -50, balance: 100, itemsTotalAfterDiscount: ORDER }).points)
      .toBe(0);
    expect(planRedeem({ requestedPoints: 10.9, balance: 100, itemsTotalAfterDiscount: ORDER }).points)
      .toBe(10);
  });
});

describe('Ballning kuyishi', () => {
  it('oxirgi harakatdan 12 oy', () => {
    expect(expiresAt(new Date('2026-09-12T00:00:00Z')).toISOString().slice(0, 10))
      .toBe('2027-09-12');
  });

  it('muddat sozlanadi', () => {
    expect(expiresAt(new Date('2026-01-31T00:00:00Z'), 1).getMonth()).toBe(2); // fevralda 31 yo'q
  });
});

describe('Bekor qilinganda qaytarish', () => {
  /**
   * Ikki tomonlama bo'lishi SHART: berilgan ball olinadi, ishlatilgan
   * ball qaytariladi. Faqat bittasini qilish mijozni yo yutuqda, yo
   * zararda qoldirardi — ikkalasi ham shikoyat.
   */
  it('berilgani olinadi, ishlatilgani qaytariladi', () => {
    expect(reversalFor({ earned: 18, redeemed: 50 })).toEqual({ take: 18, giveBack: 50 });
  });

  it('nollar xavfsiz', () => {
    expect(reversalFor({ earned: 0, redeemed: 0 })).toEqual({ take: 0, giveBack: 0 });
  });
});

describe('ballarning kuyishi', () => {
  const NOW = new Date('2026-09-12T10:00:00Z');

  it('balans nol bo‘lsa sana umuman ko‘rsatilmaydi', () => {
    // «0 ball 12 oydan keyin kuyadi» degan yozuv mijozni chalg'itadi.
    expect(
      expiryState({ lastActivityAt: new Date('2026-01-01'), balance: 0, now: NOW }),
    ).toEqual({ stage: 'none', expiresAt: null, daysLeft: null });
  });

  it('manfiy balansda ham sana yo‘q', () => {
    expect(
      expiryState({ lastActivityAt: new Date('2026-01-01'), balance: -5, now: NOW }).stage,
    ).toBe('none');
  });

  it('hech qachon faoliyat bo‘lmagan bo‘lsa — sana yo‘q', () => {
    expect(expiryState({ lastActivityAt: null, balance: 100, now: NOW }).stage).toBe('none');
  });

  it('muddat uzoq bo‘lsa — active', () => {
    const s = expiryState({ lastActivityAt: new Date('2026-08-01'), balance: 100, now: NOW });
    expect(s.stage).toBe('active');
    expect(s.expiresAt).toEqual(new Date('2027-08-01'));
  });

  it('14 kun qolganda — warning', () => {
    // 2025-09-20 + 12 oy = 2026-09-20, ya'ni 8 kun qoldi.
    const s = expiryState({ lastActivityAt: new Date('2025-09-20T10:00:00Z'), balance: 100, now: NOW });
    expect(s.stage).toBe('warning');
    expect(s.daysLeft).toBe(8);
  });

  it('chegaraning o‘zi — 14 kun ham warning', () => {
    const s = expiryState({
      lastActivityAt: new Date('2025-09-26T10:00:00Z'),
      balance: 100,
      now: NOW,
    });
    expect(s.daysLeft).toBe(14);
    expect(s.stage).toBe('warning');
  });

  it('15 kun — hali active', () => {
    const s = expiryState({
      lastActivityAt: new Date('2025-09-27T10:00:00Z'),
      balance: 100,
      now: NOW,
    });
    expect(s.daysLeft).toBe(15);
    expect(s.stage).toBe('active');
  });

  it('muddat o‘tgan bo‘lsa — due', () => {
    const s = expiryState({ lastActivityAt: new Date('2025-01-01'), balance: 100, now: NOW });
    expect(s.stage).toBe('due');
    expect(s.daysLeft).toBeLessThan(0);
  });

  it('aynan muddat tugagan lahza — due, ya’ni ball saqlanib qolmaydi', () => {
    const last = new Date('2025-09-12T10:00:00Z');
    const s = expiryState({ lastActivityAt: last, balance: 100, now: NOW });
    expect(s.expiresAt).toEqual(NOW);
    expect(s.stage).toBe('due');
  });

  it('ogohlantirish kaliti KUYISH sanasiga bog‘lanadi, yuborilgan kunga emas', () => {
    // Aks holda har kuni ishlaydigan cron har kuni SMS yuborardi.
    const at = new Date('2026-09-20T10:00:00Z');
    const a = expiryWarnKey('c1', at);
    const b = expiryWarnKey('c1', new Date('2026-09-20T23:59:00Z'));
    expect(a).toBe(b);
    expect(a).toBe('c1:2026-09-20');
  });

  it('muddat uzayganda kalit o‘zgaradi — keyingi davrda yana ogohlantiriladi', () => {
    expect(expiryWarnKey('c1', new Date('2026-09-20'))).not.toBe(
      expiryWarnKey('c1', new Date('2027-09-20')),
    );
  });
});
