import { Module } from '@nestjs/common';
import { UzumClient } from './uzum.client';
import { UzumController } from './uzum.controller';
import { UzumSyncService } from './uzum-sync.service';
import { UzumService } from './uzum.service';

@Module({
  controllers: [UzumController],
  providers: [UzumClient, UzumService, UzumSyncService],
  exports: [UzumService, UzumSyncService],
})
export class UzumModule {}
