import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../redis/redis.service';
import { NotificationService } from './notification.service';

/**
 * Bildirishnomalar navbati.
 *
 * Har daqiqada ishlaydi: jim soatlar tugagan va qayta urinish vaqti
 * kelgan xabarlarni yuboradi. Bir necha nusxa ishlaganda vazifa Redis
 * qulfi bilan bittasida bajariladi.
 */
@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private readonly notifications: NotificationService,
    private readonly redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'notification-queue' })
  async handle(): Promise<void> {
    // Qulf muddati navbatning eng uzun ishlash vaqtidan KATTA bo'lishi
    // kerak: 100 ta SMS provayder javobini kutib bir daqiqadan oshib
    // ketishi mumkin. Qo'shimcha himoya `sendOne` ichida — har bir
    // xabar alohida band qilinadi.
    const locked = await this.redis.setNx('lock:notifications:queue', '1', 300);
    if (!locked) return;

    try {
      const res = await this.notifications.processQueue();
      if (res.sent > 0 || res.failed > 0) {
        this.logger.log(`Bildirishnomalar: ${res.sent} yuborildi, ${res.failed} xato`);
      }
    } catch (e) {
      this.logger.error(`Bildirishnomalar navbatida xato: ${(e as Error).message}`);
    }
  }
}
