import { Controller, Get, Headers, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { AuthPrincipal, CurrentUser, Public } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

interface TelegramUpdate { message?: { chat?: { id?: number }; text?: string } }

@Controller('telegram')
export class TelegramLinkController {
  constructor(private readonly config: ConfigService, private readonly redis: RedisService, private readonly prisma: PrismaService) {}

  @Get('link')
  async link(@CurrentUser() user?: AuthPrincipal) {
    if (user?.kind !== 'customer') throw new UnauthorizedException('Kabinetga kiring');
    const username = this.config.get<string>('TELEGRAM_BOT_USERNAME');
    if (!username) return { configured: false, url: null };
    const token = randomBytes(24).toString('base64url');
    await this.redis.client.set(`telegram-link:${token}`, user.sub, 'EX', 600);
    return { configured: true, url: `https://t.me/${username}?start=${token}`, expiresInSeconds: 600 };
  }

  @Public()
  @Post('webhook')
  async webhook(@Headers('x-telegram-bot-api-secret-token') secret: string | undefined, @Body() update: TelegramUpdate) {
    const expected = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET');
    if (!expected || secret !== expected) throw new UnauthorizedException('Telegram webhook imzosi noto‘g‘ri');
    const chatId = update.message?.chat?.id;
    const token = update.message?.text?.match(/^\/start\s+([A-Za-z0-9_-]+)$/)?.[1];
    if (!chatId || !token) return { ok: true };
    const key = `telegram-link:${token}`;
    const customerId = await this.redis.client.getdel(key);
    if (!customerId) return { ok: true, expired: true };
    await this.prisma.customer.update({ where: { id: customerId }, data: { telegramChatId: String(chatId) } });
    return { ok: true, linked: true };
  }
}
