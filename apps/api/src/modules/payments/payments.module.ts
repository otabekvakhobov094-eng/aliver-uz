import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { FiscalModule } from '../fiscal/fiscal.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { CatalogModule } from '../catalog/catalog.module';
import { PaymentService } from './payment.service';
import { PaymentRegistry } from './payment-registry';
import { ReconcileService } from './reconcile.service';
import { ClickGateway } from './providers/click.gateway';
import { PaymeGateway } from './providers/payme.gateway';
import { UzumGateway } from './providers/uzum.gateway';
import { CodGateway } from './providers/cod.gateway';
import { ClickController } from './click.controller';
import { PaymeController } from './payme.controller';
import { PaymentsController } from './payments.controller';
import { AdminPaymentsController } from './admin-payments.controller';

@Module({
  imports: [OrdersModule, FiscalModule, LoyaltyModule, CatalogModule],
  controllers: [ClickController, PaymeController, PaymentsController, AdminPaymentsController],
  providers: [
    PaymentService,
    PaymentRegistry,
    ReconcileService,
    ClickGateway,
    PaymeGateway,
    UzumGateway,
    CodGateway,
  ],
  exports: [PaymentService, PaymentRegistry],
})
export class PaymentsModule {}
