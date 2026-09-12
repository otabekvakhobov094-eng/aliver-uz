import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RedisService } from '../../redis/redis.service';
import { LoyaltyExpiryService } from './loyalty-expiry.service';

/**
 * Ballarning kuyishi — kunlik vazifa.
 *
 * NEGA KUNIGA, OYIGA EMAS. Muddat har bir mijozda o'z sanasida tugaydi:
 * oyiga bir marta ishlaydigan vazifa kimnidir 29 kun kech kuydirar,
 * ogohlantirishni esa butunlay o'tkazib yuborardi — «14 kun qoldi»
 * oynasi oyiga bir marta tekshirilganda ko'pincha yopiq bo'ladi.
 *
 * SOAT 03:00. Toshkent vaqti bilan tunda: SMS o'sha zahoti ketmaydi,
 * chunki bildirishnomalar navbati jim soatlarni o'zi hisobga oladi va
 * xabarni 08:00 ga suradi. Ya'ni vazifa tunda ishlaydi, mijoz esa
 * ertalab xabar oladi.
 *
 * TARTIB MUHIM: avval ogohlantirish, keyin kuydirish. Teskarisi
 * bo'lganda bugun kuyadigan mijozga «14 kun qoldi» degan xabar
 * ketardi — balansi allaqachon nol bo'lgan holda.
 */
@Injectable()
export class LoyaltyScheduler {
  private readonly logger = new Logger(LoyaltyScheduler.name);

  constructor(
    private readonly expiry: LoyaltyExpiryService,
    private readonly redis: RedisService,
  ) {}

  @Cron('0 3 * * *', { name: 'loyalty-expiry', timeZone: 'Asia/Tashkent' })
  async handle(): Promise<void> {
    // Qulf uzoq: ro'yxat 500 tagacha mijozni o'z ichiga oladi va har
    // biri alohida tranzaksiya. Bir necha nusxa ishlaganda ikkinchisi
    // shu ro'yxatni takrorlamasligi kerak.
    const locked = await this.redis.setNx('lock:loyalty:expiry', '1', 900);
    if (!locked) return;

    try {
      const warned = await this.expiry.warnExpiring();
      const burned = await this.expiry.expireOverdue();
      if (warned.warned > 0 || burned.customers > 0) {
        this.logger.log(
          `Ballar: ${warned.warned} ogohlantirish, ${burned.points} ball kuydirildi (${burned.customers} mijoz)`,
        );
      }
    } catch (e) {
      this.logger.error(`Ball kuydirishda xato: ${(e as Error).message}`);
    }
  }
}
