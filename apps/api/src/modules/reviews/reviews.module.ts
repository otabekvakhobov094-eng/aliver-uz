import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { PublicReviewsController } from './public-reviews.controller';

@Module({ controllers: [ReviewsController, PublicReviewsController] })
export class ReviewsModule {}
