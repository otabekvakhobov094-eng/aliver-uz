import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { PaymentsModule } from '../payments/payments.module';
import { ReturnService } from './return.service';
import { ReturnsController } from './returns.controller';
import { AdminReturnsController } from './admin-returns.controller';

@Module({
  imports: [InventoryModule, PaymentsModule],
  controllers: [ReturnsController, AdminReturnsController],
  providers: [ReturnService],
  exports: [ReturnService],
})
export class ReturnsModule {}
