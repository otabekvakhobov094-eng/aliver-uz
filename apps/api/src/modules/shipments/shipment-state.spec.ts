import {
  CARRIER_LABEL,
  CARRIERS,
  InvalidShipmentTransition,
  SHIPMENT_TO_ORDER,
  SHIPPABLE_ORDER_STATUSES,
  assertShipmentTransition,
  canTransitionShipment,
  carrierTrackUrl,
} from './shipment-state';

describe('jo‘natma holat mashinasi', () => {
  it('odatiy yo‘lni o‘tkazadi', () => {
    expect(canTransitionShipment('PENDING', 'ASSIGNED')).toBe(true);
    expect(canTransitionShipment('ASSIGNED', 'IN_TRANSIT')).toBe(true);
    expect(canTransitionShipment('IN_TRANSIT', 'DELIVERED')).toBe(true);
  });

  it('orqaga sakrashni rad etadi', () => {
    expect(canTransitionShipment('DELIVERED', 'IN_TRANSIT')).toBe(false);
    expect(canTransitionShipment('PENDING', 'DELIVERED')).toBe(false);
    expect(() => assertShipmentTransition('PENDING', 'DELIVERED')).toThrow(
      InvalidShipmentTransition,
    );
  });

  it('muvaffaqiyatsiz urinishdan keyin qayta chiqish mumkin', () => {
    // Mijoz uyda bo'lmasa kuryer ertasiga yana boradi.
    expect(canTransitionShipment('FAILED', 'ASSIGNED')).toBe(true);
  });

  it('qaytarilgan jo‘natma yakuniy', () => {
    expect(canTransitionShipment('RETURNED', 'ASSIGNED')).toBe(false);
  });

  it('faqat ikkita holat buyurtmani ilgari suradi', () => {
    expect(SHIPMENT_TO_ORDER.IN_TRANSIT).toBe('SHIPPED');
    expect(SHIPMENT_TO_ORDER.DELIVERED).toBe('DELIVERED');
    expect(SHIPMENT_TO_ORDER.ASSIGNED).toBeNull();
    expect(SHIPMENT_TO_ORDER.FAILED).toBeNull();
  });

  it('jo‘natma faqat tayyorlangan buyurtmaga ochiladi', () => {
    expect(SHIPPABLE_ORDER_STATUSES).toContain('READY');
    expect(SHIPPABLE_ORDER_STATUSES).not.toContain('NEW');
    expect(SHIPPABLE_ORDER_STATUSES).not.toContain('DELIVERED');
  });
});

describe('tashuvchilar', () => {
  it('har bir tashuvchining nomi bor', () => {
    for (const c of CARRIERS) expect(CARRIER_LABEL[c].length).toBeGreaterThan(2);
  });

  it('kuzatuv havolasini quradi', () => {
    expect(carrierTrackUrl('bts', 'AB123')).toContain('AB123');
    expect(carrierTrackUrl('uzpost', 'RR1')).toContain('RR1');
  });

  it('o‘z kuryerimizda havola bo‘lmaydi', () => {
    expect(carrierTrackUrl('own', 'X1')).toBeNull();
  });

  it('trek raqami yo‘q bo‘lsa havola ham yo‘q', () => {
    expect(carrierTrackUrl('bts', null)).toBeNull();
    expect(carrierTrackUrl(null, 'X')).toBeNull();
  });

  it('trek raqami havolada xavfsiz kodlanadi', () => {
    expect(carrierTrackUrl('bts', 'a b&c')).toContain('a%20b%26c');
  });
});
