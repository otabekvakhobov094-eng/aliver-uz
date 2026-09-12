import {
  MAX_REDEEM_SHARE,
  POINTS_PER_SUM,
  TIYIN_PER_POINT,
  expiresAt,
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
