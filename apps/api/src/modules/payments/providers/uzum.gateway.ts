import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from '../payment.service';
import type { PaymentGateway, PaymentLink } from '../payment-gateway';
import {
  type UzumConfig,
  missingUzumConfig,
  uzumBlockReason,
  uzumMockUrl,
  uzumPayUrl,
} from './uzum.util';

/**
 * Uzum — uchinchi to'lov provayderi (TZ-3).
 *
 * NIMA TAYYOR VA NIMA EMAS — buni ochiq aytish kerak, chunki yarim
 * integratsiyani to'liq deb o'ylash eng qimmatga tushadigan xato.
 *
 * Tayyor:
 *   — `UZUM` butun tizim bo'ylab haqiqiy provayder: baza enumi,
 *     buyurtma DTO si, checkout, admin yorliqlari, moslashtirish;
 *   — maket rejimida oqim boshidan oxirigacha ishlaydi, ya'ni buyurtma
 *     Uzum bilan berilishi, to'lanishi va chek navbatiga tushishi
 *     bugun sinaladi;
 *   — havola sozlamadan quriladi, kod ichida hech qanday manzil
 *     qattiq yozilmagan.
 *
 * Tayyor emas:
 *   — callback (webhook) maydon nomlari va imzo sxemasi. Ular Uzum
 *     merchant hujjatidan olinadi va hujjat shartnoma bilan beriladi.
 *     Men ularni TAXMIN QILMADIM: taxminiy maydon nomlari bilan yozilgan
 *     webhook ishlayotgandek ko'rinadi va faqat birinchi haqiqiy
 *     to'lovda yiqiladi — ya'ni pul bilan.
 *
 * Shu sababdan `live` rejim ATAYLAB to'siqlangan: kalitlar va hujjat
 * kelmaguncha u ishga tushmaydi va sababini aniq aytadi. Bu tasodifan
 * yarim integratsiya bilan sotuvga chiqishning oldini oladi.
 */
@Injectable()
export class UzumGateway implements PaymentGateway {
  readonly code = 'UZUM' as const;
  private readonly logger = new Logger(UzumGateway.name);

  constructor(
    private readonly payments: PaymentService,
    private readonly config: ConfigService,
  ) {}

  private get mode(): 'mock' | 'sandbox' | 'live' {
    return this.config.get<'mock' | 'sandbox' | 'live'>('PAYMENTS_MODE') ?? 'mock';
  }

  /** Shartnoma va hujjat kelgach `UZUM_ENABLED=true` qo'yiladi. */
  private get enabled(): boolean {
    return String(this.config.get('UZUM_ENABLED') ?? '').toLowerCase() === 'true';
  }

  private get merchantId(): string {
    return this.config.get<string>('UZUM_MERCHANT_ID') ?? '';
  }

  private get serviceId(): string {
    return this.config.get<string>('UZUM_SERVICE_ID') ?? '';
  }

  private get checkoutUrl(): string {
    return this.config.get<string>('UZUM_CHECKOUT_URL') ?? '';
  }

  /** Sozlamalarni bitta obyektga yig'ish — sof mantiq shuni oladi. */
  private cfg(): UzumConfig {
    return {
      mode: this.mode,
      enabled: this.enabled,
      merchantId: this.merchantId,
      serviceId: this.serviceId,
      checkoutUrl: this.checkoutUrl,
      webUrl: this.config.get<string>('WEB_URL') ?? 'http://localhost:3000',
    };
  }

  createLink(params: {
    orderId: string;
    orderNumber: string;
    amount: bigint;
    returnUrl: string;
  }): PaymentLink {
    const cfg = this.cfg();

    if (cfg.mode === 'mock') {
      return { kind: 'redirect', url: uzumMockUrl(cfg.webUrl, params.orderId), mock: true };
    }

    const blocked = uzumBlockReason(cfg);
    if (blocked) {
      // 503, 500 emas: bu kod xatosi emas, sozlama yetishmasligi.
      // Xabar aynan NIMA yetishmayotganini aytadi — «to'lov ishlamadi»
      // operatorga hech narsa bermaydi.
      this.logger.error(`Uzum to‘lovi ishga tushmadi — ${blocked}`);
      throw new ServiceUnavailableException({
        code: 'UZUM_NOT_CONFIGURED',
        message: `Uzum to‘lovi hozircha ulanmagan (${blocked}). Boshqa to‘lov usulini tanlang.`,
      });
    }

    return {
      kind: 'redirect',
      url: uzumPayUrl({
        checkoutUrl: cfg.checkoutUrl,
        merchantId: cfg.merchantId,
        serviceId: cfg.serviceId,
        amountTiyin: params.amount,
        orderNumber: params.orderNumber,
        returnUrl: params.returnUrl,
      }),
      mock: false,
    };
  }

  /**
   * Holatni so'rash. Maket rejimida bazadagi yozuv haqiqat manbai —
   * kutish sahifasi shu orqali javob oladi.
   */
  async poll(params: { paymentId: string; providerTxnId: string | null }): Promise<{
    state: 'PENDING' | 'PAID' | 'CANCELLED' | 'FAILED';
    providerTxnId?: string | null;
  }> {
    const payment = await this.payments.byId(params.paymentId);
    const status = payment?.status ?? 'PENDING';
    const state =
      status === 'PAID'
        ? 'PAID'
        : status === 'CANCELLED'
          ? 'CANCELLED'
          : status === 'FAILED'
            ? 'FAILED'
            : 'PENDING';
    return { state, providerTxnId: payment?.providerTxnId ?? params.providerTxnId };
  }

  /**
   * Qaytarish. Uzum buni merchant API orqali qo'llaydi, lekin aniq
   * chaqiruv hujjatdan olinadi — shuning uchun hozircha rad javobi
   * va sababi. Operator kabinet orqali bajaradi.
   */
  async refund(): Promise<{ supported: boolean; message: string }> {
    return {
      supported: false,
      message:
        'Uzum qaytarishi hozircha avtomatlashtirilmagan — merchant kabineti orqali bajariladi',
    };
  }

  /** Sozlama holati — admin sozlamalar ekrani uchun. */
  status(): { ready: boolean; mode: string; missing: string[]; enabled: boolean } {
    const cfg = this.cfg();
    return {
      ready: uzumBlockReason(cfg) === null,
      mode: cfg.mode,
      enabled: cfg.enabled,
      missing: missingUzumConfig(cfg),
    };
  }
}
