import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  async check(@Res({ passthrough: true }) response: Response) {
    const [db, cache] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.client.ping(),
    ]);
    const ok = db.status === 'fulfilled' && cache.status === 'fulfilled';
    if (!ok) response.status(503);
    return {
      status: ok ? 'ok' : 'degraded',
      database: db.status === 'fulfilled' ? 'up' : 'down',
      redis: cache.status === 'fulfilled' ? 'up' : 'down',
      env: process.env.APP_ENV ?? 'development',
      time: new Date().toISOString(),
    };
  }

  @Public()
  @Get('live')
  live() {
    return { status: 'ok', time: new Date().toISOString() };
  }
}
