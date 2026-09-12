import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Audit, AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { PaymentRegistry } from './payment-registry';
import { ReconcileService } from './reconcile.service';
import {
  AdminPaymentQueryDto,
  MarkCashPaidDto,
  ReconcileQueryDto,
  RefundDto,
} from './dto/payment.dto';
import type { ProviderCode } from './payment-gateway';

type AuditRequest = Request & { auditBefore?: unknown; auditRecordId?: string };

@ApiTags('admin-payments')
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService,
    private readonly registry: PaymentRegistry,
    private readonly reconcile: ReconcileService,
  ) {}

  @Get()
  @RequirePermissions('payments.view')
  @ApiOperation({ summary: 'To‘lovlar ro‘yxati' })
  async list(@Query() query: AdminPaymentQueryDto) {
    const page = query.page ?? 1;
    const perPage = 30;

    const where: Record<string, unknown> = {};
    if (query.provider) where.provider = query.provider;
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59`) } : {}),
      };
    }
    if (query.q) {
      const q = query.q.trim();
      where.OR = [
        { providerTxnId: { contains: q } },
        { order: { is: { number: { contains: q.toUpperCase() } } } },
        { order: { is: { contactPhone: { contains: q.replace(/\D/g, '') } } } },
      ];
    }

    // Summalar ikkita alohida so'rovda: to'langan pul `PAID` va
    // `PARTIALLY_REFUNDED` da yotadi, qaytarilgan pul esa
    // `PARTIALLY_REFUNDED` va `REFUNDED` da. Bitta `status: 'PAID'`
    // filtri ikkalasini ham noto'g'ri ko'rsatardi.
    const paidStatuses = ['PAID', 'PARTIALLY_REFUNDED'];
    const refundedStatuses = ['PARTIALLY_REFUNDED', 'REFUNDED'];

    const [total, rows, paidSum, refundedSum] = await this.prisma.$transaction([
      this.prisma.payment.count({ where: where as never }),
      this.prisma.payment.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { order: { select: { number: true, contactPhone: true, status: true } } },
      }),
      this.prisma.payment.aggregate({
        where: Object.assign({}, where, { status: { in: paidStatuses } }) as never,
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: Object.assign({}, where, { status: { in: refundedStatuses } }) as never,
        _sum: { refundedAmount: true },
      }),
    ]);

    return {
      items: rows.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        orderNumber: p.order?.number ?? null,
        contactPhone: p.order?.contactPhone ?? null,
        provider: p.provider,
        status: p.status,
        amount: (p.amount as bigint).toString(),
        refundedAmount: (p.refundedAmount as bigint).toString(),
        providerTxnId: p.providerTxnId,
        paidAt: p.paidAt,
        failureReason: p.failureReason,
        createdAt: p.createdAt,
      })),
      total,
      page,
      perPage,
      totals: {
        paid: (paidSum._sum.amount ?? 0n).toString(),
        refunded: (refundedSum._sum.refundedAmount ?? 0n).toString(),
      },
    };
  }

  @Get('reconcile')
  @RequirePermissions('payments.view')
  @ApiOperation({
    summary: 'To‘lovlarni moslashtirish ro‘yxati',
    description:
      'Provayder vypiskasi bilan bizdagi yozuvlarni solishtiradi va farqlarni ko‘rsatadi.',
  })
  reconcileReport(@Query() query: ReconcileQueryDto) {
    return this.reconcile.run({
      from: new Date(query.dateFrom),
      to: new Date(`${query.dateTo}T23:59:59`),
      provider: query.provider,
    });
  }

  /**
   * Provayder kabinetidan yuklangan vypiska bilan moslashtirish.
   *
   * Bu YAGONA haqiqiy solishtirish. Qolgan hollarda vypiska bizning
   * webhook loglarimizdan quriladi, ya'ni biz o'z yozuvimizni o'z
   * yozuvimiz bilan taqqoslaymiz — va eng xavfli holat ko'rinmaydi:
   * webhook umuman kelmagan bo'lsa, ikkala tomonda ham yozuv yo'q va
   * hisobot «hammasi joyida» deydi.
   *
   * Fayl HECH QAYERGA saqlanmaydi: u xotirada o'qiladi va hisobot
   * qaytariladi. Vypiskada to'lov ma'lumotlari bor va uni serverda
   * qoldirishning ehtiyoji yo'q.
   */
  @Post('reconcile/import')
  @RequirePermissions('payments.view')
  @Audit('payments', 'reconcile_import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({
    summary: 'Vypiska faylini yuklab moslashtirish',
    description:
      'CSV fayl provayder kabinetidan yuklab olinadi. Fayl saqlanmaydi — faqat hisobot qaytariladi.',
  })
  reconcileImport(
    @UploadedFile() file: { buffer?: Buffer; size?: number } | undefined,
    @Query() query: ReconcileQueryDto,
  ) {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Fayl yuklanmadi');
    }
    return this.reconcile.run({
      from: new Date(query.dateFrom),
      to: new Date(`${query.dateTo}T23:59:59`),
      provider: query.provider,
      statementCsv: file.buffer.toString('utf8'),
    });
  }

  @Get(':id')
  @RequirePermissions('payments.view')
  @ApiOperation({ summary: 'To‘lov kartochkasi: tranzaksiyalar, cheklar, log' })
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const payment = await this.payments.byId(id);
    const logs = await this.prisma.paymentLog.findMany({
      where: { paymentId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { ...payment, logs };
  }

  /**
   * Naqd to'lovni qabul qilish.
   *
   * Aynan shu paytda fiskal chek beriladi — qonun bo'yicha chek pul
   * olingan paytda beriladi, buyurtma berilganda emas.
   */
  @Post(':id/cash')
  @RequirePermissions('payments.update')
  @Audit('payments', 'cash_received')
  @ApiOperation({ summary: 'Naqd to‘lov qabul qilindi' })
  async cash(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkCashPaidDto,
    @Req() req: AuditRequest,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    req.auditRecordId = id;
    const before = await this.payments.byId(id);
    req.auditBefore = { status: before.status };

    await this.payments.markPaid({
      paymentId: id,
      providerTxnId: `CASH-${before.order?.number ?? id.slice(0, 8)}`,
      adminId: user?.kind === 'admin' ? user.sub : undefined,
    });

    if (dto.comment) {
      await this.payments.log({
        paymentId: id,
        provider: 'CASH_ON_DELIVERY',
        direction: 'IN',
        endpoint: 'admin/cash',
        request: { comment: dto.comment, adminId: user?.sub ?? null },
      });
    }
    return this.payments.byId(id);
  }

  @Post(':id/refund')
  @RequirePermissions('payments.update')
  @Audit('payments', 'refund')
  @ApiOperation({
    summary: 'To‘lovni qaytarish (to‘liq yoki qisman)',
    description:
      'Provayder API orqali qaytarishni qo‘llab-quvvatlamasa, yozuv baribir yaratiladi va ' +
      '"qo‘lda bajarilsin" deb belgilanadi. Qaytarish cheki avtomatik navbatga qo‘yiladi.',
  })
  async refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundDto,
    @Req() req: AuditRequest,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    req.auditRecordId = id;
    const before = await this.payments.byId(id);
    req.auditBefore = {
      status: before.status,
      refundedAmount: (before.refundedAmount as bigint).toString(),
    };

    const gateway = this.registry.get(before.provider as ProviderCode);
    return this.payments.refund({
      paymentId: id,
      amount: BigInt(dto.amount),
      reason: dto.reason,
      adminId: user?.kind === 'admin' ? user.sub : undefined,
      gatewayRefund: gateway.refund ? (p) => gateway.refund!(p) : undefined,
    });
  }

  @Get(':id/webhooks')
  @RequirePermissions('payments.view')
  @ApiOperation({ summary: 'Shu to‘lovga tegishli webhook hodisalari' })
  async webhooks(@Param('id', ParseUUIDPipe) id: string) {
    const payment = await this.payments.byId(id);
    if (!payment.providerTxnId) return [];
    return this.prisma.webhookEvent.findMany({
      where: { externalId: payment.providerTxnId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
