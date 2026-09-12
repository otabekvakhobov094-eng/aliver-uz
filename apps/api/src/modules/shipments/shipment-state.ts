import {
  CARRIER_CODES,
  CARRIER_LABEL as CARRIER_NAME,
  type CarrierCode,
} from './carriers/carrier';

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

/**
 * Tashuvchilar. Ro'yxat `carriers/carrier.ts` dan keladi — u yagona
 * manba. Ilgari shu yerda alohida ro'yxat turardi va unda EMU yo'q edi.
 */
export const CARRIERS = CARRIER_CODES;
export type Carrier = CarrierCode;

export const CARRIER_LABEL: Record<Carrier, string> = Object.fromEntries(
  CARRIER_CODES.map((code) => [code, CARRIER_NAME[code].uz]),
) as Record<Carrier, string>;

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
