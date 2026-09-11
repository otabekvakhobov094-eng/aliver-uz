import { Module } from '@nestjs/common';
import { AdminDiscountsController } from './admin-discounts.controller';
import { DiscountService } from './discount.service';

@Module({
  controllers: [AdminDiscountsController],
  providers: [DiscountService],
  exports: [DiscountService],
})
export class DiscountsModule {}
