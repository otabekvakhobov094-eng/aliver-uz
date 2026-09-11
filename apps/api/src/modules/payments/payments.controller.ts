import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { PaymentRegistry } from './payment-registry';
import { MockConfirmDto, StartPaymentDto } from './dto/payment.dto';
import { PROVIDER_LABEL, type ProviderCode } from './payment-gateway';

/**
 * Mijoz uchun to'lov endpointlari.
 *
 * Bu yerda pul holati O'ZGARTIRILMAYDI (maket rejimidan tashqari):
 * holat faqat provayder webhook'i orqali o'zgaradi. Sabab oddiy —
 * brauzerdan kelgan "men to'ladim" so'roviga ishonib bo'lmaydi.
 */
@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService,
    private readonly registry: PaymentRegistry,
    private readonly config: ConfigService,
  ) {}

  private get mode(): 'mock' | 'sandbox' | 'live' {
    return this.config.get<'mock' | 'sandbox' | 'live'>('PAYMENTS_MODE') ?? 'mock';
  }

  @Public()
  @Get('methods')
  @ApiOperation({ summary: 'Mavjud to‘lov usullari' })
  methods() {
    return {
      mode: this.mode,
      items: this.registry.codes().map((code) => ({
        code,
        nameUz: PROVIDER_LABEL[code].uz,
        nameRu: PROVIDER_LABEL[code].ru,
        online: code !== 'CASH_ON_DELIVERY',
      })),
    };
  }

  @Public()
  @Post('start')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({
    summary: 'To‘lovga o‘tish havolasini olish',
    description: 'Buyurtma to‘langan bo‘lsa havola berilmaydi.',
  })
  async start(@Body() dto: StartPaymentDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, deletedAt: null },
      select: { id: true, number: true, grandTotal: true, status: true, paymentStatus: true },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException({
        code: 'ALREADY_PAID',
        message: 'Buyurtma allaqachon to‘langan',
      });
    }
    if (order.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'ORDER_CANCELLED',
        message: 'Buyurtma bekor qilingan',
      });
    }

    const payment = await this.payments.byOrder(order.id);
    if (!payment) throw new NotFoundException('To‘lov yozuvi topilmadi');

    // Karta rad etilgan yoki mijoz to'lovni bekor qilgan bo'lsa, yozuv
    // `CANCELLED` bo'lib qoladi va u yakuniy holat. "Qayta to'lash"
    // bosilganda uni qayta ochamiz — aks holda buyurtma abadiy
    // to'lanmay qolardi.
    await this.payments.reopen(payment.id);

    const code = (dto.provider ?? payment.provider) as ProviderCode;
    if (code === 'CASH_ON_DELIVERY') {
      return { kind: 'none', url: null, mock: false, provider: code };
    }

    const web = this.config.get<string>('WEB_URL') ?? 'http://localhost:3000';
    const link = await this.registry.get(code).createLink({
      orderId: order.id,
      orderNumber: order.number,
      amount: order.grandTotal as bigint,
      returnUrl: `${web}/uz/buyurtma/${order.id}`,
    });

    return { ...link, provider: code };
  }

  @Public()
  @Get('status/:orderId')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({
    summary: 'To‘lov holati',
    description: 'Kutish sahifasi shu endpointni so‘rab turadi.',
  })
  async status(@Param('orderId', ParseUUIDPipe) orderId: string) {
    const payment = await this.payments.byOrder(orderId);
    if (!payment) throw new NotFoundException('To‘lov topilmadi');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, number: true },
    });

    return {
      orderNumber: order?.number ?? null,
      orderStatus: order?.status ?? null,
      provider: payment.provider,
      status: payment.status,
      amount: (payment.amount as bigint).toString(),
      paidAt: payment.paidAt,
      failureReason: payment.failureReason,
    };
  }

  /**
   * MAKET: to'lovni bir bosishda tasdiqlash yoki bekor qilish.
   *
   * Faqat `PAYMENTS_MODE=mock` da ishlaydi. Jangovar muhitda bu
   * endpoint 404 qaytaradi — sozlamada `mock` production da umuman
   * ruxsat etilmaydi, lekin ikkinchi to'siq ham bo'lgani yaxshi.
   */
  @Public()
  @Post('mock/confirm')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  @ApiOperation({ summary: 'Maket: to‘lovni tasdiqlash (faqat development)' })
  async mockConfirm(@Body() dto: MockConfirmDto) {
    if (this.mode !== 'mock') {
      throw new NotFoundException('Bu endpoint faqat maket rejimida ishlaydi');
    }

    const payment = await this.payments.byOrder(dto.orderId);
    if (!payment) throw new NotFoundException('To‘lov topilmadi');

    const txnId = `MOCK-${payment.id.slice(0, 8)}`;
    if (dto.outcome === 'PAID') {
      await this.payments.markPaid({ paymentId: payment.id, providerTxnId: txnId });
    } else {
      await this.payments.markCancelled({
        paymentId: payment.id,
        reason: 'Maket: mijoz to‘lovni bekor qildi',
      });
    }

    return this.status(dto.orderId);
  }
}
