import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Audit, RequirePermissions } from '../../common/decorators';
import { NotificationService } from './notification.service';
import { TEMPLATES, render, smsParts, type Lang, type TemplateKey } from './templates';

class NotificationQueryDto {
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() template?: string;
  @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsString() page?: string;
}

@ApiTags('admin-notifications')
@Controller('admin/notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Yuborilgan va navbatdagi bildirishnomalar' })
  list(@Query() query: NotificationQueryDto) {
    return this.notifications.list({
      channel: query.channel,
      status: query.status,
      template: query.template,
      orderId: query.orderId,
      page: query.page ? Number(query.page) : 1,
    });
  }

  /**
   * Shablonlar ro'yxati — namuna matn va SMS qismlari soni bilan.
   * Marketolog matn uzunligini shu yerda ko'radi: uzun matn ikki SMS
   * bo'ladi va narx ikki barobar bo'lib ketadi.
   */
  @Get('templates')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Shablonlar va ularning SMS uzunligi' })
  templates() {
    const sample = {
      number: 'ALV-260910-4821',
      amount: '1 890 000',
      name: 'Nilufar',
      trackUrl: 'https://aliver.uz/uz/kuzatuv',
      courier: 'Sardor',
      courierPhone: '+998 90 123 45 67',
      reason: 'Mijoz so‘rovi',
      provider: 'Payme',
      product: 'Namlantiruvchi krem',
      qty: '3',
    };

    return (Object.keys(TEMPLATES) as TemplateKey[]).map((key) => {
      const rows = (['uz', 'ru'] as Lang[]).map((lang) => {
        const text = render(key, lang, sample);
        const parts = smsParts(text);
        return { lang, text, parts: parts.parts, encoding: parts.encoding, length: parts.length };
      });
      return { key, staff: TEMPLATES[key].staff === true, samples: rows };
    });
  }

  @Post(':id/retry')
  @RequirePermissions('settings.update')
  @Audit('settings', 'notification_retry')
  @ApiOperation({ summary: 'Bildirishnomani darhol qayta yuborish' })
  retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.sendOne(id);
  }

  @Post('queue/run')
  @RequirePermissions('settings.update')
  @Audit('settings', 'notification_queue')
  @ApiOperation({
    summary: 'Navbatni darhol ishga tushirish',
    description: 'Cron bilan bir vaqtda ishlamasligi uchun qulf olinadi.',
  })
  async run() {
    const locked = await this.redis.setNx('lock:notifications:queue', '1', 120);
    if (!locked) {
      return { sent: 0, failed: 0, skipped: true, message: 'Navbat allaqachon ishlamoqda' };
    }
    return this.notifications.processQueue();
  }
}
