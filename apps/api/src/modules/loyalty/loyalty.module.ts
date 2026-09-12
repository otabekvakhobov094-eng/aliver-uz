import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminLoyaltyController, LoyaltyController } from './loyalty.controller';
import { LoyaltyExpiryService } from './loyalty-expiry.service';
import { LoyaltyScheduler } from './loyalty.scheduler';
import { LoyaltyService } from './loyalty.service';

@Module({
  imports: [NotificationsModule],
  controllers: [LoyaltyController, AdminLoyaltyController],
  providers: [LoyaltyService, LoyaltyExpiryService, LoyaltyScheduler],
  exports: [LoyaltyService, LoyaltyExpiryService],
})
export class LoyaltyModule {}
