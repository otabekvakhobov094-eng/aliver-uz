import { Module } from '@nestjs/common';
import { PublicSettingsController } from './public-settings.controller';
import { ShopFactsController } from './shop-facts.controller';
import { SettingsController } from './settings.controller';
import { OpsStatusController } from './ops-status.controller';

@Module({
  controllers: [
    SettingsController,
    PublicSettingsController,
    ShopFactsController,
    OpsStatusController,
  ],
})
export class SettingsModule {}
