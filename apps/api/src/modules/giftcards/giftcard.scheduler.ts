import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RedisService } from '../../redis/redis.service';
import { GiftCardExpiryService } from './giftcard-expiry.service';

/**
 * Sertifikat muddati haqida ogohlantirish — kunlik vazifa.
 *
 * Ballardan 20 daqiqa keyin (03:20): ikkalasi bir vaqtda ishlab, SMS
 * navbatini bir zarbada to'ldirmasligi uchun. Navbatning o'zi jim
 * soatlarni hisobga oladi, ya'ni xabarlar ertalab 08:00 dan boshlab
 * ketadi.
 */
@Injectable()
export class GiftCardScheduler {
  private readonly logger = new Logger(GiftCardScheduler.name);

  constructor(
    private readonly expiry: GiftCardExpiryService,
    private readonly redis: RedisService,
  ) {}

  @Cron('20 3 * * *', { name: 'giftcard-expiry-warn', timeZone: 'Asia/Tashkent' })
  async handle(): Promise<void> {
    const locked = await this.redis.setNx('lock:giftcards:expiry', '1', 600);
    if (!locked) return;

    try {
      await this.expiry.warnExpiring();
    } catch (e) {
      this.logger.error(`Sertifikat ogohlantirishida xato: ${(e as Error).message}`);
    }
  }
}
