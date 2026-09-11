import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { ReservationScheduler } from './reservation.scheduler';
import { ReservationsController } from './reservations.controller';

/**
 * Rezerv muddati. Alohida modul, chunki u buyurtma va ombor o'rtasida
 * turadi — InventoryModule ichida qolsa aylanma bog'liqlik hosil bo'lardi.
 */
@Module({
  imports: [OrdersModule],
  controllers: [ReservationsController],
  providers: [ReservationScheduler],
  exports: [ReservationScheduler],
})
export class ReservationsModule {}
