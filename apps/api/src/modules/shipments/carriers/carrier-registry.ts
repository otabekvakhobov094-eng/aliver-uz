import { Injectable } from '@nestjs/common';
import { type CarrierAdapter, type CarrierCode } from './carrier';
import { OwnCarrier } from './own.carrier';
import { PendingCarrier } from './pending.carrier';

/**
 * Pochtalar reyestri — to'lov reyestri bilan bir xil naqshda.
 *
 * Yangi pochta ulanganda faqat shu ro'yxatdagi bitta qator
 * almashtiriladi: `PendingCarrier` o'rniga haqiqiy adapter. Jo'natma,
 * buyurtma va admin kodiga tegilmaydi.
 */
@Injectable()
export class CarrierRegistry {
  private readonly map: Map<CarrierCode, CarrierAdapter>;

  constructor(own: OwnCarrier) {
    this.map = new Map<CarrierCode, CarrierAdapter>([
      [own.code, own],
      [
        'emu',
        new PendingCarrier(
          'emu',
          'EMU',
          'EMU',
          // EMU qisman yetkazishni qo'llaydi — kosmetika savati uchun
          // muhim, chunki bitta pozitsiya qolib ketsa butun buyurtma
          // ushlanib qolmaydi. Shu sababdan u birinchi tanlov.
          true,
          'shartnoma va API hujjati kutilmoqda',
        ),
      ],
      [
        'bts',
        new PendingCarrier('bts', 'BTS Express', 'BTS Express', false, 'shartnoma kutilmoqda'),
      ],
      [
        'uzpost',
        new PendingCarrier(
          'uzpost',
          'O‘zbekiston pochtasi',
          'Почта Узбекистана',
          false,
          'shartnoma kutilmoqda',
        ),
      ],
    ]);
  }

  get(code: CarrierCode): CarrierAdapter {
    const adapter = this.map.get(code);
    if (!adapter) throw new Error(`Noma'lum pochta: ${code}`);
    return adapter;
  }

  all(): CarrierAdapter[] {
    return [...this.map.values()];
  }

  /** Bugun jo'natma yarata oladiganlar. */
  ready(): CarrierAdapter[] {
    return this.all().filter((c) => c.status().ready);
  }

  /**
   * Adminka uchun holat jadvali: qaysi pochta tayyor, qaysi biri nimani
   * kutyapti. Bu ro'yxat rejalashtirishga to'g'ridan-to'g'ri kerak.
   */
  overview() {
    return this.all().map((c) => ({
      code: c.code,
      nameUz: c.nameUz,
      nameRu: c.nameRu,
      supportsPartial: c.supportsPartial,
      ...c.status(),
    }));
  }
}
