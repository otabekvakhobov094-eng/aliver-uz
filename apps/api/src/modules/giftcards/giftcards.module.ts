import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminGiftCardController, GiftCardController } from './giftcard.controller';
import { GiftCardExpiryService } from './giftcard-expiry.service';
import { GiftCardScheduler } from './giftcard.scheduler';
import { GiftCardService } from './giftcard.service';

@Module({
  imports: [NotificationsModule],
  controllers: [GiftCardController, AdminGiftCardController],
  providers: [GiftCardService, GiftCardExpiryService, GiftCardScheduler],
  exports: [GiftCardService, GiftCardExpiryService],
})
export class GiftCardsModule {}
