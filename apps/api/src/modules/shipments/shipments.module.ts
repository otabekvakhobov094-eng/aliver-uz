import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { ShipmentService } from './shipment.service';
import { CarrierRegistry } from './carriers/carrier-registry';
import { OwnCarrier } from './carriers/own.carrier';
import { ShipmentsController } from './shipments.controller';

@Module({
  imports: [OrdersModule],
  controllers: [ShipmentsController],
  providers: [ShipmentService, CarrierRegistry, OwnCarrier],
  exports: [ShipmentService, CarrierRegistry],
})
export class ShipmentsModule {}
