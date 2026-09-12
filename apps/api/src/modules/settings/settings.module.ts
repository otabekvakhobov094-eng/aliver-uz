import { Module } from '@nestjs/common';
import { PublicSettingsController } from './public-settings.controller';
import { ShopFactsController } from './shop-facts.controller';
import { SettingsController } from './settings.controller';

@Module({ controllers: [SettingsController, PublicSettingsController, ShopFactsController] })
export class SettingsModule {}
