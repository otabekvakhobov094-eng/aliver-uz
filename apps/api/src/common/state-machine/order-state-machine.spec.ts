import {
  ORDER_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  RESERVING_STATUSES,
  assertOrderTransition,
  assertPaymentTransition,
  canTransitionOrder,
  canTransitionPayment,
  InvalidTransitionError,
} from './order-state-machine';

describe('buyurtma holat mashinasi', () => {
  it('to‘g‘ri yo‘lni o‘tkazadi', () => {
    const path = [
      'NEW',
      'CONFIRMED',
      'PROCESSING',
      'PACKING',
      'READY',
      'SHIPPED',
      'DELIVERED',
    ] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransitionOrder(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it('yetkazilgan buyurtmani yangiga qaytarmaydi', () => {
    expect(() => assertOrderTransition('DELIVERED', 'NEW')).toThrow(/Ruxsat etilmagan/);
  });

  it('bekor qilingan buyurtma yakuniy holat', () => {
    expect(ORDER_TRANSITIONS.CANCELLED).toHaveLength(0);
  });

  it('yetkazilgandan keyin bekor qilib bo‘lmaydi', () => {
    expect(canTransitionOrder('DELIVERED', 'CANCELLED')).toBe(false);
  });

  it('rezerv faqat yetkazishgacha bo‘lgan statuslarda ushlanadi', () => {
    expect(RESERVING_STATUSES).not.toContain('SHIPPED');
    expect(RESERVING_STATUSES).not.toContain('DELIVERED');
  });
});

describe('to‘lov holat mashinasi', () => {
  it('to‘langan to‘lovni qayta to‘langan qilmaydi', () => {
    expect(() => assertPaymentTransition('PAID', 'PAID')).toThrow();
  });

  it('to‘langandan keyin faqat qaytarish mumkin', () => {
    expect(PAYMENT_TRANSITIONS.PAID).toEqual(['REFUNDED', 'PARTIALLY_REFUNDED']);
  });

  it('qisman qaytarishdan keyin yana qisman qaytarish mumkin', () => {
    expect(PAYMENT_TRANSITIONS.PARTIALLY_REFUNDED).toContain('PARTIALLY_REFUNDED');
  });
});

describe("to'lov holat mashinasi", () => {
  it('to‘langan to‘lovni bekor qilib bo‘lmaydi', () => {
    expect(canTransitionPayment('PAID', 'CANCELLED')).toBe(false);
    expect(canTransitionPayment('PAID', 'PENDING')).toBe(false);
  });

  it('rad etilgan to‘lovni qayta ochish mumkin', () => {
    // Karta rad etilsa mijoz qayta to'lay olishi kerak.
    expect(canTransitionPayment('CANCELLED', 'PENDING')).toBe(true);
    expect(canTransitionPayment('FAILED', 'PENDING')).toBe(true);
  });

  it('qaytarilgan to‘lov yakuniy', () => {
    expect(PAYMENT_TRANSITIONS.REFUNDED).toHaveLength(0);
  });

  it('qisman qaytarish takrorlanishi mumkin', () => {
    expect(canTransitionPayment('PARTIALLY_REFUNDED', 'PARTIALLY_REFUNDED')).toBe(true);
    expect(canTransitionPayment('PARTIALLY_REFUNDED', 'REFUNDED')).toBe(true);
  });

  it('kutish holatidan to‘g‘ridan-to‘g‘ri qaytarishga o‘tib bo‘lmaydi', () => {
    expect(canTransitionPayment('WAITING', 'REFUNDED')).toBe(false);
    expect(() => assertPaymentTransition('WAITING', 'REFUNDED')).toThrow(InvalidTransitionError);
  });
});
