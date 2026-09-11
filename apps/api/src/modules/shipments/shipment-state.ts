/**
 * Jo'natma holatlari va ular buyurtma holatiga qanday ta'sir qilishi.
 *
 * Ataylab Prisma dan mustaqil — testda baza kerak emas.
 */
export type ShipmentStatus =
  'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'RETURNED';

export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: ['ASSIGNED', 'FAILED'],
  ASSIGNED: ['IN_TRANSIT', 'FAILED', 'PENDING'],
  IN_TRANSIT: ['DELIVERED', 'FAILED', 'RETURNED'],
  // Muvaffaqiyatsiz urinishdan keyin kuryer qayta chiqishi mumkin.
  FAILED: ['ASSIGNED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  RETURNED: [],
};

/**
 * Jo'natma holati o'zgarganda buyurtma qaysi holatga o'tishi kerak.
 * `null` — buyurtma holati o'zgarmaydi.
 *
 * Bu jadval ataylab qisqa: jo'natma buyurtmani BOSHQARMAYDI, faqat
 * ikkita nuqtada uni ilgari suradi — yo'lga chiqqanda va yetkazilganda.
 * Qolgan hollarda operator o'zi qaror qiladi.
 */
export const SHIPMENT_TO_ORDER: Record<ShipmentStatus, string | null> = {
  PENDING: null,
  ASSIGNED: null,
  IN_TRANSIT: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  FAILED: null,
  RETURNED: null,
};

export class InvalidShipmentTransition extends Error {
  constructor(
    readonly from: ShipmentStatus,
    readonly to: ShipmentStatus,
  ) {
    super(`Ruxsat etilmagan jo‘natma holati o‘tishi: ${from} -> ${to}`);
    this.name = 'InvalidShipmentTransition';
  }
}

export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return (SHIPMENT_TRANSITIONS[from] ?? []).includes(to);
}

export function assertShipmentTransition(from: ShipmentStatus, to: ShipmentStatus): void {
  if (!canTransitionShipment(from, to)) throw new InvalidShipmentTransition(from, to);
}

/**
 * Buyurtma shu holatlarda bo'lsa kuryer biriktirish mantiqiy.
 *
 * `SHIPPED` ham ro'yxatda: operator avval statusni bosib, keyin kuryerni
 * kiritishi mumkin — o'shanda ma'lumotni qo'shib qo'yish imkoni
 * bo'lishi kerak, aks holda buyurtma kuryersiz qolib ketardi.
 */
export const SHIPPABLE_ORDER_STATUSES = ['CONFIRMED', 'PROCESSING', 'PACKING', 'READY', 'SHIPPED'];

/** Tashuvchilar. "own" — o'z kuryerimiz. */
export const CARRIERS = ['own', 'bts', 'fargo', 'yandex', 'uzpost'] as const;
export type Carrier = (typeof CARRIERS)[number];

export const CARRIER_LABEL: Record<Carrier, string> = {
  own: 'O‘z kuryerimiz',
  bts: 'BTS Express',
  fargo: 'Fargo',
  yandex: 'Yandex Delivery',
  uzpost: 'Uzbekiston Pochtasi',
};

/**
 * Tashuvchining kuzatuv havolasi. Bo'lmasa `null` —
 * interfeys shunda oddiy matn ko'rsatadi.
 */
export function carrierTrackUrl(carrier: string | null, trackingNo: string | null): string | null {
  if (!carrier || !trackingNo) return null;
  switch (carrier) {
    case 'bts':
      return `https://bts.uz/tracking?code=${encodeURIComponent(trackingNo)}`;
    case 'uzpost':
      return `https://pochta.uz/tracking?number=${encodeURIComponent(trackingNo)}`;
    case 'fargo':
      return `https://fargo.uz/tracking/${encodeURIComponent(trackingNo)}`;
    default:
      // O'z kuryerimiz va Yandex uchun ommaviy kuzatuv havolasi yo'q.
      return null;
  }
}
