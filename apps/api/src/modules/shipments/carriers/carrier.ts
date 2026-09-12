import type { Tiyin } from '../../../common/money';

/**
 * Kuryer adapteri — TZ-3.
 *
 * Bugungi holat: `Shipment.carrier` oddiy MATN maydoni va hech qanday
 * kuryer API si ulanmagan. Operator jo'natmani qo'lda kiritadi.
 * Bu ishlaydi, lekin har bir yangi pochta qo'shilganda jo'natma kodi
 * qayta yozilishini anglatadi.
 *
 * Shu sababdan to'lovdagi bilan BIR XIL yechim: bitta interfeys,
 * reyestr, va har bir pochta uchun alohida adapter. To'lovda bu o'zini
 * oqladi — Uzum qo'shilganda buyurtma kodiga umuman tegilmadi.
 *
 * MUHIM va ochiq aytiladi: EMU, BTS va Pochta API hujjatlari shartnoma
 * bosqichida beriladi. Ularning haqiqiy chaqiruvlari shu yerda
 * TAXMIN QILINMAGAN — taxminiy maydon nomlari bilan yozilgan adapter
 * ishlayotgandek ko'rinadi va faqat birinchi haqiqiy jo'natmada
 * yiqiladi. Hozir ishlaydigan yagona adapter — `own` (o'z kuryerimiz),
 * u haqiqatan ham API talab qilmaydi.
 */

/**
 * Pochtalar ro'yxati — YAGONA manba.
 *
 * Ilgari bu ro'yxat `shipment-state.ts` da alohida turardi va u yerda
 * EMU umuman yo'q edi, garchi u birinchi tanlov bo'lsa ham. Ikki
 * ro'yxat bir-biridan jimgina ajralib ketishi — bazada `emu` yozuvi
 * paydo bo'lib, interfeys uni «noma'lum» deb ko'rsatishi — aynan
 * shunday joydan boshlanadi. Shuning uchun endi bitta joyda.
 *
 * `fargo` va `yandex` saqlanib qoldi: bazada allaqachon shunday
 * yozuvlar bo'lishi mumkin va ularni yo'qotib bo'lmaydi.
 */
export const CARRIER_CODES = ['own', 'emu', 'bts', 'fargo', 'yandex', 'uzpost'] as const;
export type CarrierCode = (typeof CARRIER_CODES)[number];

export interface CarrierQuote {
  /** Yetkazish narxi, tiyinda. */
  price: Tiyin;
  /** Taxminiy kun soni. */
  daysMin: number;
  daysMax: number;
}

export interface CarrierShipment {
  /** Pochtadagi jo'natma raqami. */
  trackingNo: string;
  /** Mijozga beriladigan kuzatuv havolasi, agar pochta bersa. */
  trackingUrl: string | null;
  /** Chop etiladigan yorliq (PDF) manzili, agar bo'lsa. */
  labelUrl: string | null;
}

export interface CarrierStatus {
  status: 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'RETURNED';
  /** Pochtaning o'z matni — operatorga ko'rsatiladi. */
  raw: string | null;
  deliveredAt: Date | null;
}

export interface CarrierAdapter {
  readonly code: CarrierCode;
  readonly nameUz: string;
  readonly nameRu: string;

  /**
   * Ulanish holati. `ready: false` bo'lsa adapter tanlovda ko'rinadi,
   * lekin jo'natma yaratmaydi va SABABINI aytadi — «ishlamadi» degan
   * jim xatolikdan ko'ra shu foydali.
   */
  status(): { ready: boolean; reason: string | null };

  /**
   * Qisman yetkazishni qo'llaydimi. EMU qo'llaydi va bu kosmetika
   * savatiga muhim: bitta pozitsiya qolib ketsa butun buyurtma
   * ushlanib qolmaydi.
   */
  readonly supportsPartial: boolean;

  quote?(params: { regionCode: string; weightGrams: number; declaredValue: Tiyin }): Promise<CarrierQuote>;

  createShipment(params: {
    orderNumber: string;
    recipientName: string;
    recipientPhone: string;
    regionCode: string;
    addressLine: string;
    weightGrams: number;
    declaredValue: Tiyin;
    /** Naqd to'lov bo'lsa pochta pulni yig'adi. */
    codAmount: Tiyin | null;
  }): Promise<CarrierShipment>;

  track(trackingNo: string): Promise<CarrierStatus>;

  cancel?(trackingNo: string): Promise<{ cancelled: boolean; message?: string }>;
}

/** Ulanmagan pochta uchun yagona xato turi — chaqiruvchi buni ajratadi. */
export class CarrierNotConfiguredError extends Error {
  constructor(
    readonly carrier: CarrierCode,
    reason: string,
  ) {
    super(`«${carrier}» pochtasi hali ulanmagan: ${reason}`);
    this.name = 'CarrierNotConfiguredError';
  }
}

export const CARRIER_LABEL: Record<CarrierCode, { uz: string; ru: string }> = {
  own: { uz: 'O‘z kuryerimiz', ru: 'Свой курьер' },
  emu: { uz: 'EMU', ru: 'EMU' },
  bts: { uz: 'BTS Express', ru: 'BTS Express' },
  fargo: { uz: 'Fargo', ru: 'Fargo' },
  yandex: { uz: 'Yandex Delivery', ru: 'Yandex Delivery' },
  uzpost: { uz: 'O‘zbekiston pochtasi', ru: 'Почта Узбекистана' },
};
