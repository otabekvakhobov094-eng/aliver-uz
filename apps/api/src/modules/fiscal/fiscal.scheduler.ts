import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../../redis/redis.service';
import { FiscalService } from './fiscal.service';

/**
 * Fiskal cheklar navbati.
 *
 * OFD vaqtincha ishlamasa cheklar to'planib qoladi va shu cron ularni
 * eksponensial oraliqda qayta yuboradi. Bir necha nusxa ishlaganda
 * vazifa Redis qulfi bilan bittasida bajariladi.
 */
@Injectable()
export class FiscalScheduler {
  private readonly logger = new Logger(FiscalScheduler.name);

  constructor(
    private readonly fiscal: FiscalService,
    private readonly redis: RedisService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'fiscal-queue' })
  async handle(): Promise<void> {
    const locked = await this.redis.setNx('lock:fiscal:queue', '1', 55);
    if (!locked) return;

    try {
      const res = await this.fiscal.processQueue();
      if (res.sent > 0 || res.failed > 0) {
        this.logger.log(`Fiskal navbat: ${res.sent} yuborildi, ${res.failed} xato`);
      }
    } catch (e) {
      this.logger.error(`Fiskal navbatda xato: ${(e as Error).message}`);
    }
  }
}
