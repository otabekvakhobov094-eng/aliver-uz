import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentService } from '../payment.service';
import {
  CLICK_ACTION,
  CLICK_ERROR,
  CLICK_ERROR_NOTE,
  type ClickRequest,
  clickAmountToTiyin,
  clickPayUrl,
  verifyClickSign,
} from './click.util';
import type { PaymentGateway, PaymentLink } from '../payment-gateway';

export interface ClickResponse {
  click_trans_id: number | string;
  merchant_trans_id: string;
  merchant_prepare_id?: number | string;
  merchant_confirm_id?: number | string;
  error: number;
  error_note: string;
}

/**
 * Click Shop API.
 *
 * Ikki bosqichli: avval `Prepare` (biz buyurtmani tekshiramiz va
 * "tayyorman" deymiz), keyin `Complete` (pul yechildi).
 *
 * Muhim: Click javobda HTTP 200 kutadi, xato esa `error` maydonida
 * qaytariladi. 500 qaytarsak Click qayta urinaveradi va webhook
 * navbatida tiqilib qoladi.
 */
@Injectable()
export class ClickGateway implements PaymentGateway {
  readonly code = 'CLICK' as const;
  private readonly logger = new Logger(ClickGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService,
    private readonly config: ConfigService,
  ) {}

  private get mode(): 'mock' | 'sandbox' | 'live' {
    return this.config.get<'mock' | 'sandbox' | 'live'>('PAYMENTS_MODE') ?? 'mock';
  }

  private get secretKey(): string {
    return this.config.get<string>('CLICK_SECRET_KEY') ?? '';
  }

  /* --------------------------------- Havola -------------------------------- */

  createLink(params: {
    orderId: string;
    orderNumber: string;
    amount: bigint;
    returnUrl: string;
  }): PaymentLink {
    if (this.mode === 'mock') {
      // Maket: mijoz bizning soxta to'lov sahifamizga boradi.
      const web = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
      return {
        kind: 'redirect',
        url: `${web}/uz/tolov/maket?order=${encodeURIComponent(params.orderId)}&provider=CLICK`,
        mock: true,
      };
    }

    return {
      kind: 'redirect',
      url: clickPayUrl({
        baseUrl:
          this.config.get<string>('CLICK_CHECKOUT_URL') ?? 'https://my.click.uz/services/pay',
        serviceId: this.config.get<string>('CLICK_SERVICE_ID') ?? '',
        merchantId: this.config.get<string>('CLICK_MERCHANT_ID') ?? '',
        amountTiyin: params.amount,
        merchantTransId: params.orderNumber,
        returnUrl: params.returnUrl,
      }),
      mock: false,
    };
  }

  /**
   * Click qaytarishni Shop API orqali qo'llab-quvvatlamaydi —
   * u merchant kabineti yoki alohida shartnoma orqali bajariladi.
   */
  async refund(): Promise<{ supported: boolean; message: string }> {
    return {
      supported: false,
      message:
        'Click qaytarishni Shop API orqali qo‘llab-quvvatlamaydi — kabinet orqali bajariladi',
    };
  }

  /* -------------------------------- Webhook -------------------------------- */

  async handle(action: 'prepare' | 'complete', req: ClickRequest): Promise<ClickResponse> {
    const base = {
      click_trans_id: req.click_trans_id,
      merchant_trans_id: req.merchant_trans_id,
    };
    const fail = (error: number, note?: string): ClickResponse => ({
      ...base,
      error,
      error_note: note ?? CLICK_ERROR_NOTE[error] ?? 'Xato',
    });

    // 1) Imzo. Maket rejimida tekshirilmaydi — kalit yo'q.
    const signatureOk = this.mode === 'mock' ? true : verifyClickSign(req, this.secretKey);
    if (!signatureOk) {
      this.logger.warn(`Click: imzo mos kelmadi (trans ${req.click_trans_id})`);
      return fail(CLICK_ERROR.SIGN_CHECK_FAILED);
    }

    // 2) Idempotentlik. Bir xil (tranzaksiya + amal) ikkinchi marta
    //    kelsa, avvalgi javob qaytariladi.
    const claim = await this.payments.claimWebhook({
      provider: 'click',
      externalId: String(req.click_trans_id),
      method: action,
      payload: req,
      signatureOk,
    });
    // Takror kelgan MUVAFFAQIYATLI javob o'zgarmasdan qaytariladi.
    if (claim.status === 'done') {
      return (claim.previousResponse as ClickResponse) ?? fail(CLICK_ERROR.ERROR_IN_REQUEST);
    }
    // Birinchi so'rov hali ishlab turibdi — ikkinchisiga ishlov bermaymiz.
    // Click qayta urinsa, o'shanda tayyor javobni oladi.
    if (claim.status === 'in_flight') {
      this.logger.warn(
        `Click: ${action} takrorlandi, birinchisi hali tugamagan (${req.click_trans_id})`,
      );
      return fail(
        CLICK_ERROR.ERROR_IN_REQUEST,
        'So‘rov qayta ishlanmoqda, biroz keyin urinib ko‘ring',
      );
    }

    const response = await this.process(action, req, fail);

    if (response.error !== 0) {
      // Xato javob "yakuniy" deb saqlanmaydi: sabab tuzalgandan keyin
      // Click qayta urinsa, haqiqiy natijani olishi kerak.
      if (claim.id) await this.payments.releaseWebhook(claim.id);
    } else if (claim.id) {
      await this.payments.finishWebhook({ id: claim.id, response, httpStatus: 200 });
    }
    return response;
  }

  private async process(
    action: 'prepare' | 'complete',
    req: ClickRequest,
    fail: (error: number, note?: string) => ClickResponse,
  ): Promise<ClickResponse> {
    const base = {
      click_trans_id: req.click_trans_id,
      merchant_trans_id: req.merchant_trans_id,
    };

    // 3) Buyurtma va to'lov
    const payment = await this.payments.byOrderNumber(req.merchant_trans_id);
    if (!payment) return fail(CLICK_ERROR.USER_NOT_FOUND);
    if (payment.provider !== 'CLICK') {
      return fail(CLICK_ERROR.ERROR_IN_REQUEST, 'Buyurtma boshqa to‘lov usuli bilan berilgan');
    }

    // 4) Summa. So'mdan tiyinga o'girish faqat bir joyda.
    const amount = clickAmountToTiyin(req.amount);
    if (amount === null) return fail(CLICK_ERROR.INCORRECT_AMOUNT, 'Summa formati noto‘g‘ri');
    if (amount !== (payment.amount as bigint)) {
      this.logger.warn(
        `Click: summa mos kelmadi. Kutilgan ${payment.amount}, kelgan ${amount} (${req.merchant_trans_id})`,
      );
      return fail(CLICK_ERROR.INCORRECT_AMOUNT);
    }

    // 5) Click "error" maydonida bekor qilinganini bildirishi mumkin.
    const clickError = Number(req.error ?? 0);
    if (clickError < 0) {
      await this.payments.markCancelled({
        paymentId: payment.id,
        reason: `Click: ${req.error_note ?? clickError}`,
      });
      return fail(CLICK_ERROR.TRANSACTION_CANCELLED);
    }

    if (action === 'prepare') {
      if (payment.status === 'PAID') return fail(CLICK_ERROR.ALREADY_PAID);
      if (payment.status === 'CANCELLED' || payment.status === 'FAILED') {
        return fail(CLICK_ERROR.TRANSACTION_CANCELLED);
      }

      await this.payments.markWaiting(payment.id, String(req.click_trans_id));
      await this.payments.upsertTransaction({
        paymentId: payment.id,
        state: 'CREATED',
        amount,
      });

      // `merchant_prepare_id` Click hujjatida BUTUN SON. UUID yubormaymiz:
      // Click uni imzoga qo'shib qaytaradi va o'z tomonida sonli maydonga
      // yozadi.
      const prepareId = await this.payments.ensurePrepareId(payment.id);

      return {
        ...base,
        merchant_prepare_id: prepareId,
        error: CLICK_ERROR.SUCCESS,
        error_note: CLICK_ERROR_NOTE[0]!,
      };
    }

    // complete
    if (
      req.merchant_prepare_id &&
      String(req.merchant_prepare_id) !== String(payment.prepareId ?? '')
    ) {
      return fail(CLICK_ERROR.TRANSACTION_NOT_FOUND);
    }
    if (payment.status === 'CANCELLED' || payment.status === 'FAILED') {
      return fail(CLICK_ERROR.TRANSACTION_CANCELLED);
    }

    // Boshqa tranzaksiya bilan ikkinchi marta to'lash urinishi — bu
    // ikkinchi haqiqiy yechim bo'lardi. Click ga "allaqachon to'langan"
    // deb aytamiz, aks holda u pulni yechib qo'yadi va bizda izi qolmaydi.
    if (payment.status === 'PAID' && payment.providerTxnId !== String(req.click_trans_id)) {
      this.logger.error(
        `Click: to‘langan buyurtmaga boshqa tranzaksiya keldi ` +
          `(${payment.providerTxnId} != ${req.click_trans_id})`,
      );
      return fail(CLICK_ERROR.ALREADY_PAID);
    }

    await this.payments.markPaid({
      paymentId: payment.id,
      providerTxnId: String(req.click_trans_id),
    });
    await this.payments.upsertTransaction({
      paymentId: payment.id,
      state: 'PERFORMED',
      amount,
    });

    return {
      ...base,
      merchant_confirm_id: payment.prepareId ?? 0,
      error: CLICK_ERROR.SUCCESS,
      error_note: CLICK_ERROR_NOTE[0]!,
    };
  }

  static action(value: string): 'prepare' | 'complete' | null {
    if (value === String(CLICK_ACTION.PREPARE)) return 'prepare';
    if (value === String(CLICK_ACTION.COMPLETE)) return 'complete';
    return null;
  }
}
