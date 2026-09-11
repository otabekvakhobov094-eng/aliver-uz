import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { Audit, AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';
import { ShipmentService } from './shipment.service';
import { CARRIERS, CARRIER_LABEL, SHIPMENT_TRANSITIONS } from './shipment-state';

class AssignShipmentDto {
  @IsIn(CARRIERS as unknown as string[])
  carrier!: string;

  @IsOptional() @IsString() @Length(2, 80) courierName?: string;
  @IsOptional() @IsString() @Length(5, 30) courierPhone?: string;
  @IsOptional() @IsString() @Length(1, 60) trackingNo?: string;
  @IsOptional() @IsString() @Length(1, 300) note?: string;
}

class ChangeShipmentStatusDto {
  @IsIn(['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED'])
  status!: 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'RETURNED';

  @IsOptional() @IsString() @Length(1, 300) note?: string;
}

@ApiTags('admin-shipments')
@Controller('admin/shipments')
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentService) {}

  @Get('carriers')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Tashuvchilar ro‘yxati va holat o‘tishlari' })
  carriers() {
    return {
      carriers: (CARRIERS as unknown as string[]).map((code) => ({
        code,
        label: CARRIER_LABEL[code as keyof typeof CARRIER_LABEL],
      })),
      transitions: SHIPMENT_TRANSITIONS,
    };
  }

  @Get('order/:orderId')
  @RequirePermissions('orders.view')
  @ApiOperation({ summary: 'Buyurtmaning jo‘natmalari' })
  forOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.shipments.forOrder(orderId);
  }

  @Get('order/:orderId/waybill')
  @RequirePermissions('orders.view')
  @ApiOperation({
    summary: 'Kuryer varaqasi ma’lumoti',
    description: 'Naqd to‘lovda `collectCash` — kuryer mijozdan olishi kerak bo‘lgan summa.',
  })
  waybill(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.shipments.waybill(orderId);
  }

  @Post('order/:orderId/assign')
  @RequirePermissions('orders.update')
  @Audit('orders', 'shipment_assign')
  @ApiOperation({ summary: 'Kuryer yoki tashuvchini biriktirish' })
  assign(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AssignShipmentDto,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    return this.shipments.assign({
      orderId,
      carrier: dto.carrier,
      courierName: dto.courierName,
      courierPhone: dto.courierPhone,
      trackingNo: dto.trackingNo,
      note: dto.note,
      adminId: user?.kind === 'admin' ? user.sub : undefined,
    });
  }

  @Post(':id/status')
  @RequirePermissions('orders.update')
  @Audit('orders', 'shipment_status')
  @ApiOperation({
    summary: 'Jo‘natma holatini o‘zgartirish',
    description: '«Yo‘lda» va «Yetkazildi» buyurtma holatini ham ilgari suradi.',
  })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeShipmentStatusDto,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    return this.shipments.changeStatus({
      shipmentId: id,
      to: dto.status,
      note: dto.note,
      adminId: user?.kind === 'admin' ? user.sub : undefined,
    });
  }
}
