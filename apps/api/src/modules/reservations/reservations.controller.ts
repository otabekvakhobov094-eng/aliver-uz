import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit, RequirePermissions } from '../../common/decorators';
import { ReservationScheduler } from './reservation.scheduler';

@ApiTags('admin-inventory')
@Controller('admin/inventory/reservations')
export class ReservationsController {
  constructor(private readonly scheduler: ReservationScheduler) {}

  @Post('expire')
  @RequirePermissions('inventory.update')
  @Audit('inventory', 'expire_reservations')
  @ApiOperation({
    summary: 'Muddati o‘tgan rezervlarni darhol bo‘shatish',
    description: 'Odatda har daqiqada avtomatik ishlaydi; bu tugma qo‘lda ishga tushiradi.',
  })
  expire() {
    return this.scheduler.expireOverdue();
  }
}
