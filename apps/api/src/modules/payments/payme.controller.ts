import { Body, Controller, Headers, HttpCode, Logger, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PaymeGateway } from './providers/payme.gateway';
import { PaymentService } from './payment.service';
import {
  PAYME_ERROR,
  PaymeError,
  rpcError,
  rpcResult,
  type PaymeRpcRequest,
} from './providers/payme.util';

/**
 * Payme Merchant API kirish nuqtasi.
 *
 * Payme HTTP holat kodiga qaramaydi — javob ichidagi `error` ni o'qiydi.
 * Shuning uchun bu yerda 500 HECH QACHON qaytmaydi: kutilmagan xato ham
 * `-32400` bo'lib, 200 bilan ketadi. Aks holda Payme integratsiyani
 * "ishlamayapti" deb belgilaydi.
 */
@ApiTags('payments')
@Controller('payments/payme')
export class PaymeController {
  private readonly logger = new Logger(PaymeController.name);

  constructor(
    private readonly payme: PaymeGateway,
    private readonly payments: PaymentService,
  ) {}

  @Public()
  @Post()
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handle(@Body() body: PaymeRpcRequest, @Headers('authorization') auth?: string) {
    const id = body?.id ?? 0;
    const method = body?.method ?? 'unknown';

    // 1) Avtorizatsiya
    if (!this.payme.authorize(auth)) {
      this.logger.warn(`Payme: avtorizatsiya xatosi (${method})`);
      return rpcError(id, PAYME_ERROR.INSUFFICIENT_PRIVILEGE);
    }

    // 2) Idempotentlik.
    //    `CheckPerformTransaction` va `GetStatement` — o'qish metodlari,
    //    ular har safar qayta hisoblanishi kerak, shuning uchun
    //    idempotentlik faqat holat o'zgartiradigan metodlarga qo'yiladi.
    const mutating = ['CreateTransaction', 'PerformTransaction', 'CancelTransaction'];
    const txnId = (body?.params as { id?: unknown } | undefined)?.id;
    const canClaim = mutating.includes(method) && typeof txnId === 'string';

    let claimId: string | null = null;
    if (canClaim) {
      const claim = await this.payments.claimWebhook({
        provider: 'payme',
        externalId: txnId as string,
        method,
        payload: body,
        signatureOk: true,
      });
      // Takroriy so'rov: avvalgi MUVAFFAQIYATLI javobni qaytaramiz.
      // Xato javob saqlanmaydi (pastga qarang), shuning uchun bu yerga
      // faqat haqiqiy takror tushadi.
      if (claim.status === 'done' && claim.previousResponse) return claim.previousResponse;

      // Birinchi so'rov hali ishlab turibdi. Ikkinchisiga ishlov bermaymiz:
      // Payme javob kelmasa qayta yuboradi va o'shanda tayyor natijani
      // oladi. Bu yerda -31008 emas, "tizim band" beriladi — aks holda
      // Payme buni yakuniy rad javobi deb qabul qilardi.
      if (claim.status === 'in_flight') {
        this.logger.warn(`Payme: ${method} takrorlandi, birinchisi hali tugamagan`);
        return rpcError(id, PAYME_ERROR.INTERNAL, 'processing');
      }
      claimId = claim.id;
    }

    let response: unknown;
    let error: string | undefined;

    try {
      response = rpcResult(id, await this.payme.handle(body));
    } catch (e) {
      if (e instanceof PaymeError) {
        response = rpcError(id, e.code, e.data, e.payload);
        error = `${e.code} ${e.data ?? ''}`.trim();
      } else {
        // Kutilmagan xato ham 200 bilan ketadi, lekin logda to'liq qoladi.
        this.logger.error(`Payme ${method}: ${(e as Error).message}`, (e as Error).stack);
        response = rpcError(id, PAYME_ERROR.INTERNAL);
        error = (e as Error).message;
      }
    }

    if (claimId) {
      if (error) {
        // Xato bo'lsa hodisa navbatdan olinadi: sabab tuzalganda Payme
        // qayta urinsa, biz saqlangan xatoni emas, haqiqiy natijani
        // qaytaramiz.
        await this.payments.releaseWebhook(claimId);
      } else {
        await this.payments.finishWebhook({ id: claimId, response, httpStatus: 200 });
      }
    }
    return response;
  }
}
