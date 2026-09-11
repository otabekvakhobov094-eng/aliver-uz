import { Injectable } from '@nestjs/common';
import type { PaymentGateway, PaymentLink } from '../payment-gateway';

/**
 * Yetkazilganda naqd to'lov.
 *
 * Provayder yo'q: pul kuryerga beriladi, to'lov esa admin panelda
 * "qabul qilindi" deb belgilanadi. Shu paytda fiskal chek ham beriladi —
 * qonun bo'yicha chek pul olingan paytda beriladi, buyurtma berilganda
 * emas (ekspertiza A-1).
 */
@Injectable()
export class CodGateway implements PaymentGateway {
  readonly code = 'CASH_ON_DELIVERY' as const;

  createLink(): PaymentLink {
    return { kind: 'none', url: null, mock: false };
  }

  async refund(): Promise<{ supported: boolean; message: string }> {
    return {
      supported: false,
      message: 'Naqd to‘lov qaytarishi kassada yoki bank o‘tkazmasi orqali qo‘lda bajariladi',
    };
  }
}
