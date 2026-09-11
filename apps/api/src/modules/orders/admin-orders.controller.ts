import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Audit, AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';
import { OrderService } from './order.service';
import { AdminOrderQueryDto, BulkOrderStatusDto, ChangeOrderStatusDto } from './dto/order.dto';
import { ORDER_TRANSITIONS } from '../../common/state-machine/order-state-machine';
import { NotificationService } from '../notifications/notification.service';
import { AuditService } from '../audit/audit.service';

/** Audit log "oldingi holat" ni saqlash uchun so'rov kengaytmasi. */
type AuditRequest = Request & { auditBefore?: unknown; auditRecordId?: string };

@ApiTags('admin-orders')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(
    private readonly orders: OrderService,
    private readonly notify: NotificationService,
    private readonly auditLog: AuditService,
  ) {}

  @Get()
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Buyurtmalar ro‘yxati (filtr va qidiruv bilan)' })
  list(@Query() query: AdminOrderQueryDto) {
    return this.orders.adminList(query);
  }

  /**
   * Holat mashinasi frontendga ham kerak: admin panel faqat ruxsat etilgan
   * o'tishlarni tugma qilib ko'rsatadi, "urinib ko'r — 409 olsang bo'lmaydi"
   * degan tajriba bo'lmasligi uchun.
   */
  @Get('transitions')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Har bir statusdan ruxsat etilgan o‘tishlar' })
  transitions() {
    return ORDER_TRANSITIONS;
  }

  @Post('bulk/status')
  @RequirePermissions('orders.update')
  @Audit('orders', 'bulk_status')
  @ApiOperation({
    summary: 'Bir nechta buyurtma holatini o‘zgartirish',
    description:
      'Har biri alohida tekshiriladi: o‘tolmagani xatosi bilan qaytariladi, ' +
      'qolganlari baribir bajariladi.',
  })
  bulkStatus(@Body() dto: BulkOrderStatusDto, @CurrentUser() user?: AuthPrincipal) {
    return this.orders.bulkChangeStatus({
      orderIds: dto.orderIds,
      to: dto.status,
      comment: dto.comment,
      adminId: user?.kind === 'admin' ? user.sub : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Buyurtma kartochkasi: pozitsiyalar, to‘lov, rezerv, tarix' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.adminGet(id);
  }

  @Post(':id/status')
  @RequirePermissions('orders.update')
  @Audit('orders', 'update')
  @ApiOperation({
    summary: 'Statusni o‘zgartirish',
    description:
      'Ruxsat etilmagan o‘tish 409 bilan rad etiladi. SHIPPED — rezervni ' +
      'haqiqiy hisobdan chiqaradi, CANCELLED — rezervni va chegirma limitini qaytaradi.',
  })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeOrderStatusDto,
    @Req() req: AuditRequest,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    req.auditRecordId = id;
    req.auditBefore = await this.orders.adminGet(id).then((o) => ({
      status: o.status,
      paymentStatus: o.paymentStatus,
    }));

    return this.orders.changeStatus({
      orderId: id,
      to: dto.status,
      adminId: user?.kind === 'admin' ? user.sub : undefined,
      comment: dto.comment,
      source: 'ADMIN',
    });
  }

  @Get(':id/notifications')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Shu buyurtma bo‘yicha yuborilgan xabarlar' })
  notifications(@Param('id', ParseUUIDPipe) id: string) {
    return this.notify.forOrder(id);
  }

  @Get(':id/audit')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Shu buyurtma bo‘yicha audit tarixi' })
  audit(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLog.forRecord(id);
  }
}
