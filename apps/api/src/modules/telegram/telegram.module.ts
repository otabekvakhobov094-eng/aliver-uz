import { Global, Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramLinkController } from './telegram-link.controller';

@Global()
@Module({ controllers: [TelegramLinkController], providers: [TelegramService], exports: [TelegramService] })
export class TelegramModule {}
