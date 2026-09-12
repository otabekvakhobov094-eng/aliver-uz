import { Module } from '@nestjs/common';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { OrderService } from './order.service';
import { CartModule } from '../cart/cart.module';
import { InventoryModule } from '../inventory/inventory.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { AuthModule } from '../auth/auth.module';
import { FiscalModule } from '../fiscal/fiscal.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    CartModule,
    InventoryModule,
    DiscountsModule,
    DeliveryModule,
    AuthModule,
    FiscalModule,
    AuditModule, LoyaltyModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrdersModule {}
