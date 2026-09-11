import { Injectable } from '@nestjs/common';
import { ClickGateway } from './providers/click.gateway';
import { PaymeGateway } from './providers/payme.gateway';
import { CodGateway } from './providers/cod.gateway';
import type { PaymentGateway, ProviderCode } from './payment-gateway';

/**
 * Provayderlar reyestri.
 *
 * Yangi provayder (Uzum, Apelsin) qo'shilganda faqat shu ro'yxatga
 * bitta qator qo'shiladi — buyurtma va checkout kodiga tegilmaydi.
 */
@Injectable()
export class PaymentRegistry {
  private readonly map: Map<ProviderCode, PaymentGateway>;

  constructor(click: ClickGateway, payme: PaymeGateway, cod: CodGateway) {
    this.map = new Map<ProviderCode, PaymentGateway>([
      [click.code, click],
      [payme.code, payme],
      [cod.code, cod],
    ]);
  }

  get(code: ProviderCode): PaymentGateway {
    const gateway = this.map.get(code);
    if (!gateway) throw new Error(`To‘lov provayderi ulanmagan: ${code}`);
    return gateway;
  }

  codes(): ProviderCode[] {
    return [...this.map.keys()];
  }
}
