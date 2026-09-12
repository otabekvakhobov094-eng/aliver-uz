import {
  type CarrierAdapter,
  type CarrierCode,
  CarrierNotConfiguredError,
  type CarrierShipment,
  type CarrierStatus,
} from './carrier';

/**
 * Shartnoma kutayotgan pochta.
 *
 * EMU, BTS va O'zbekiston pochtasi uchun API hujjati shartnoma bilan
 * beriladi. Ular kelmaguncha adapter MAVJUD, lekin jo'natma yaratmaydi
 * va sababini aniq aytadi.
 *
 * Nega soxta amalga oshirish yozilmagan: taxminiy maydon nomlari bilan
 * yozilgan adapter ishlayotgandek ko'rinadi, birinchi haqiqiy
 * jo'natmada esa yiqiladi — ya'ni mijozning buyurtmasi bilan. Ochiq
 * «ulanmagan» xatosi bundan ancha yaxshi: u REJALASHTIRISHGA yordam
 * beradi, chunki adminkada qaysi pochta tayyor emasligi ko'rinadi.
 */
export class PendingCarrier implements CarrierAdapter {
  constructor(
    readonly code: CarrierCode,
    readonly nameUz: string,
    readonly nameRu: string,
    readonly supportsPartial: boolean,
    private readonly reason: string,
  ) {}

  status(): { ready: boolean; reason: string | null } {
    return { ready: false, reason: this.reason };
  }

  async createShipment(): Promise<CarrierShipment> {
    throw new CarrierNotConfiguredError(this.code, this.reason);
  }

  async track(): Promise<CarrierStatus> {
    throw new CarrierNotConfiguredError(this.code, this.reason);
  }
}
