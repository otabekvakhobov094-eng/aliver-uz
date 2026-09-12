import { Module } from '@nestjs/common';
import { AdminGiftCardController, GiftCardController } from './giftcard.controller';
import { GiftCardService } from './giftcard.service';

@Module({
  controllers: [GiftCardController, AdminGiftCardController],
  providers: [GiftCardService],
  exports: [GiftCardService],
})
export class GiftCardsModule {}
