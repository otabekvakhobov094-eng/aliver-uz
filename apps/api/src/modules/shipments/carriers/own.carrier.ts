import { Injectable } from '@nestjs/common';
import type { CarrierAdapter, CarrierShipment, CarrierStatus } from './carrier';

/**
 * O'z kuryerimiz.
 *
 * Bu adapterga tashqi API kerak emas va shuning uchun u BUGUN to'liq
 * ishlaydi. Jo'natma raqamini o'zimiz beramiz, holatni esa operator
 * adminkada qo'lda o'zgartiradi — ya'ni haqiqat manbai bizning
 * bazamiz.
 *
 * Uning yana bir vazifasi bor: u interfeysning to'liq bajarilgan
 * namunasi. EMU hujjati kelganda yozuvchi odam «bu qanday
 * ko'rinishi kerak» degan savolga shu yerdan javob oladi.
 */
@Injectable()
export class OwnCarrier implements CarrierAdapter {
  readonly code = 'own' as const;
  readonly nameUz = 'O‘z kuryerimiz';
  readonly nameRu = 'Свой курьер';

  /** O'z kuryerimiz istalgan qismni olib ketishi mumkin. */
  readonly supportsPartial = true;

  status(): { ready: boolean; reason: string | null } {
    return { ready: true, reason: null };
  }

  /**
   * Raqam formati: ALV-<buyurtma raqami>-<sana>. Ataylab o'qiladigan —
   * kuryer uni telefonda aytadi va operator qidiruvga kiritadi.
   */
  async createShipment(params: { orderNumber: string }): Promise<CarrierShipment> {
    const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return {
      trackingNo: `ALV-${params.orderNumber.replace(/^ALV-/, '')}-${stamp}`,
      // O'z kuryerimizda tashqi kuzatuv sahifasi yo'q — mijoz buyurtma
      // sahifasidan ko'radi.
      trackingUrl: null,
      labelUrl: null,
    };
  }

  /**
   * Holat bazadan olinadi, tashqaridan emas. Bu metod interfeysni
   * to'ldirish uchun: chaqiruvchi kod pochtalar orasida farq
   * qilmasligi kerak.
   */
  async track(): Promise<CarrierStatus> {
    return { status: 'PENDING', raw: null, deliveredAt: null };
  }
}
