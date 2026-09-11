import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { AdminDeliveryController } from './admin-delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryAdminService } from './delivery-admin.service';

@Module({
  controllers: [DeliveryController, AdminDeliveryController],
  providers: [DeliveryService, DeliveryAdminService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
