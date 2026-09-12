import { Module } from '@nestjs/common';
import { UzumClient } from './uzum.client';
import { UzumController } from './uzum.controller';
import { UzumService } from './uzum.service';

@Module({
  controllers: [UzumController],
  providers: [UzumClient, UzumService],
  exports: [UzumService],
})
export class UzumModule {}
