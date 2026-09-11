import { Global, Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { NotificationService } from './notification.service';
import { NotificationScheduler } from './notification.scheduler';
import { NotificationsController } from './notifications.controller';

/**
 * Global: buyurtma, to'lov va ombor modullari bunga bog'liq, lekin
 * teskarisi emas — shuning uchun aylanma bog'liqlik hosil bo'lmaydi.
 */
@Global()
@Module({
  imports: [TelegramModule],
  controllers: [NotificationsController],
  providers: [NotificationService, NotificationScheduler],
  exports: [NotificationService],
})
export class NotificationsModule {}
