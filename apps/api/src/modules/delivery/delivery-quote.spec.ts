import {
  estimateWindow,
  pickQuote,
  quoteAll,
  quoteOption,
  type DeliveryOptionInput,
} from './delivery-quote';

const SUM = 100n;
const sum = (n: number) => BigInt(n) * SUM;

const courier: DeliveryOptionInput = {
  code: 'COURIER',
  type: 'COURIER',
  nameUz: 'Kuryer bilan',
  nameRu: 'Курьером',
  basePrice: sum(30000),
  basefreeThreshold: sum(400000),
  baseDaysMin: 1,
  baseDaysMax: 4,
};

const express: DeliveryOptionInput = {
  code: 'EXPRESS',
  type: 'EXPRESS',
  nameUz: 'Ekspress — bugun',
  nameRu: 'Экспресс — сегодня',
  basePrice: sum(45000),
  baseDaysMin: 0,
  baseDaysMax: 0,
};

const pickup: DeliveryOptionInput = {
  code: 'PICKUP',
  type: 'PICKUP',
  nameUz: 'O‘zim olib ketaman',
  nameRu: 'Самовывоз',
  basePrice: 0n,
  baseDaysMin: 0,
  baseDaysMax: 1,
};

describe('kuryer narxi', () => {
  it('standart narxni qaytaradi', () => {
    const q = quoteOption(courier, { subtotalAfterDiscount: sum(150000) });
    expect(q.price).toBe(sum(30000));
    expect(q.isFree).toBe(false);
  });

  it('hudud narxi standartdan ustun', () => {
    const q = quoteOption(
      { ...courier, region: { price: sum(20000), daysMin: 1, daysMax: 1, isAvailable: true } },
      { subtotalAfterDiscount: sum(150000) },
    );
    expect(q.price).toBe(sum(20000));
    expect(q.daysMax).toBe(1);
  });

  it('bepul yetkazish chegarasidan oshsa bepul bo‘ladi', () => {
    const q = quoteOption(courier, { subtotalAfterDiscount: sum(400000) });
    expect(q.isFree).toBe(true);
    expect(q.price).toBe(0n);
    expect(q.amountToFree).toBe(0n);
  });

  it('bepul yetkazishgacha qancha qolganini aytadi', () => {
    const q = quoteOption(courier, { subtotalAfterDiscount: sum(350000) });
    expect(q.amountToFree).toBe(sum(50000));
  });

  it('chegara CHEGIRMADAN KEYINGI summadan hisoblanadi', () => {
    // 420 000 dan 10% chegirma -> 378 000, ya'ni hali bepul emas
    const q = quoteOption(courier, { subtotalAfterDiscount: sum(378000) });
    expect(q.isFree).toBe(false);
  });

  it('chegirma bepul yetkazish bergan bo‘lsa narx nol', () => {
    const q = quoteOption(courier, {
      subtotalAfterDiscount: sum(100000),
      freeShippingFromDiscount: true,
    });
    expect(q.price).toBe(0n);
  });
});

describe('ekspress', () => {
  it('bepul yetkazish chegarasi ekspressga tegmaydi', () => {
    const q = quoteOption(express, { subtotalAfterDiscount: sum(900000) });
    expect(q.isFree).toBe(false);
    expect(q.price).toBe(sum(45000));
  });

  it('hudud uchun ochilmagan bo‘lsa mavjud emas', () => {
    const q = quoteOption(
      { ...express, region: { price: sum(45000), isAvailable: false } },
      { subtotalAfterDiscount: sum(100000) },
    );
    expect(q.available).toBe(false);
    expect(q.unavailableReasonUz).toMatch(/mavjud emas/);
  });

  it('mavjud bo‘lmagan usulni tanlab bo‘lmaydi', () => {
    const quotes = quoteAll(
      [courier, { ...express, region: { price: sum(45000), isAvailable: false } }],
      { subtotalAfterDiscount: sum(100000) },
    );
    expect(() => pickQuote(quotes, 'EXPRESS')).toThrow(/mavjud emas/);
  });
});

describe('olib ketish', () => {
  it('har doim bepul', () => {
    const q = quoteOption(pickup, { subtotalAfterDiscount: sum(10000) });
    expect(q.price).toBe(0n);
    expect(q.available).toBe(true);
  });
});

describe('ro‘yxat', () => {
  it('narx bo‘yicha tartiblanadi', () => {
    const list = quoteAll([express, courier, pickup], { subtotalAfterDiscount: sum(100000) });
    expect(list.map((q) => q.code)).toEqual(['PICKUP', 'COURIER', 'EXPRESS']);
  });

  it('noma’lum usul xato beradi', () => {
    const list = quoteAll([courier], { subtotalAfterDiscount: sum(100000) });
    expect(() => pickQuote(list, 'DRON')).toThrow(/topilmadi/);
  });
});

describe('yetkazish oynasi', () => {
  it('kunlarni sanadan hisoblaydi', () => {
    const q = quoteOption(courier, { subtotalAfterDiscount: sum(100000) });
    const w = estimateWindow(q, new Date('2026-09-10T00:00:00Z'));
    expect(w.from.toISOString().slice(0, 10)).toBe('2026-09-11');
    expect(w.to.toISOString().slice(0, 10)).toBe('2026-09-14');
  });
});

describe('olib ketish mavjudligi', () => {
  it('hudud uchun o‘chirilgan bo‘lsa mavjud emas', () => {
    // Admin matritsada "Mavjud" belgisini olib tashlagan bo'lsa,
    // checkout da ham ko'rinmasligi kerak.
    const q = quoteOption(
      { ...pickup, region: { price: 0n, isAvailable: false } },
      { subtotalAfterDiscount: 10_000_000n },
    );
    expect(q.available).toBe(false);
  });

  it('hudud yozuvi bo‘lmasa mavjud bo‘lib qoladi', () => {
    const q = quoteOption(pickup, { subtotalAfterDiscount: 10_000_000n });
    expect(q.available).toBe(true);
    expect(q.price).toBe(0n);
  });
});
