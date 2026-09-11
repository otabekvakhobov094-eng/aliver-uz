import {
  CUSTOMER_CANCELLABLE,
  InvalidReturnTransition,
  OPEN_RETURN_STATUSES,
  RETURN_STATUS_LABEL,
  RETURN_TRANSITIONS,
  assertReturnTransition,
  canTransitionReturn,
  type ReturnStatus,
} from './return-state';

describe('qaytarish holat mashinasi', () => {
  it('odatiy yo‘lni o‘tkazadi', () => {
    const path: ReturnStatus[] = ['REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED', 'REFUNDED'];
    for (let i = 0; i < path.length - 1; i += 1) {
      expect(canTransitionReturn(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it('kuryer olib kelsa IN_TRANSIT ni o‘tkazib yuborish mumkin', () => {
    expect(canTransitionReturn('APPROVED', 'RECEIVED')).toBe(true);
  });

  it('pul qaytarilgach hech qayerga o‘tib bo‘lmaydi', () => {
    expect(RETURN_TRANSITIONS.REFUNDED).toHaveLength(0);
  });

  it('tovar qabul qilingach bekor qilib bo‘lmaydi', () => {
    // Tovar bizda — endi faqat pul qaytariladi.
    expect(canTransitionReturn('RECEIVED', 'CANCELLED')).toBe(false);
    expect(() => assertReturnTransition('RECEIVED', 'CANCELLED')).toThrow(InvalidReturnTransition);
  });

  it('rad etilgan so‘rov qayta ochilmaydi', () => {
    expect(RETURN_TRANSITIONS.REJECTED).toHaveLength(0);
  });

  it('tovarsiz pul qaytarib bo‘lmaydi', () => {
    expect(canTransitionReturn('APPROVED', 'REFUNDED')).toBe(false);
    expect(canTransitionReturn('REQUESTED', 'REFUNDED')).toBe(false);
  });

  it('mijoz faqat boshlang‘ich holatlarda bekor qila oladi', () => {
    expect(CUSTOMER_CANCELLABLE).toEqual(['REQUESTED', 'APPROVED']);
    expect(CUSTOMER_CANCELLABLE).not.toContain('RECEIVED');
  });

  it('ochiq holatlar ro‘yxati yakunlanganlarni o‘z ichiga olmaydi', () => {
    expect(OPEN_RETURN_STATUSES).not.toContain('REFUNDED');
    expect(OPEN_RETURN_STATUSES).not.toContain('CANCELLED');
    expect(OPEN_RETURN_STATUSES).toContain('RECEIVED');
  });

  it('har bir holat uchun ikki tilda nom bor', () => {
    for (const key of Object.keys(RETURN_TRANSITIONS) as ReturnStatus[]) {
      expect(RETURN_STATUS_LABEL[key].uz.length).toBeGreaterThan(2);
      expect(RETURN_STATUS_LABEL[key].ru.length).toBeGreaterThan(2);
    }
  });
});
