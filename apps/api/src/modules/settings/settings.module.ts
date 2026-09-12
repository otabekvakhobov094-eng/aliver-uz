import { Module } from '@nestjs/common';
import { PublicSettingsController } from './public-settings.controller';
import { SettingsController } from './settings.controller';

@Module({ controllers: [SettingsController, PublicSettingsController] })
export class SettingsModule {}
