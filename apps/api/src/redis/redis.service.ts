import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.client = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
    this.client.on('error', (e) => this.logger.error(`Redis xatosi: ${e.message}`));
  }

  /**
   * Oynali hisoblagich. Rate limit uchun asosiy primitiv.
   * Qaytaradi: joriy qiymat va limitdan oshgani.
   */
  async hit(key: string, windowSeconds: number): Promise<number> {
    const n = await this.client.incr(key);
    if (n === 1) await this.client.expire(key, windowSeconds);
    return n;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const res = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return res === 'OK';
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  onModuleDestroy(): void {
    void this.client.quit();
  }
}
