import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { ShipmentService } from './shipment.service';
import { ShipmentsController } from './shipments.controller';

@Module({
  imports: [OrdersModule],
  controllers: [ShipmentsController],
  providers: [ShipmentService],
  exports: [ShipmentService],
})
export class ShipmentsModule {}
