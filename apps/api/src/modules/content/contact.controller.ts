import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Audit, Public, RequirePermissions } from '../../common/decorators';
import { normalizePhone } from '../../common/phone';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Murojaat formasi — TZ 57, TZ-3 3.4.
 *
 * `ContactMessage` jadvali avvaldan bor edi, lekin unga API yo'q edi:
 * ya'ni saytdagi forma hech qayerga yozmasdi. Endi murojaat admin
 * paneldagi qutiga tushadi.
 */

interface ContactBody {
  name: string;
  phone: string;
  email?: string;
  subject?: string;
  body: string;
}

@Controller()
export class ContactController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ochiq endpoint, shuning uchun chastota cheklangan: bitta IP dan
   * soatiga 5 ta. Busiz forma spam yuboruvchilar uchun bepul kanal.
   */
  @Post('content/contact')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  async submit(@Body() body: ContactBody) {
    const name = String(body?.name ?? '').trim();
    const message = String(body?.body ?? '').trim();
    if (name.length < 2) throw new BadRequestException('Ismingizni kiriting');
    if (message.length < 10) {
      throw new BadRequestException('Xabar kamida 10 ta belgidan iborat bo‘lsin');
    }
    if (message.length > 4000) throw new BadRequestException('Xabar juda uzun');

    // Telefon asosiy aloqa kanali — formatini shu yerda normallashtiramiz,
    // aks holda bir xil raqam turli ko'rinishda saqlanadi. `normalizePhone`
    // noto'g'ri raqamda o'zi tushunarli xato beradi.
    const phone = normalizePhone(String(body?.phone ?? ''));

    const email = body.email?.trim() || null;
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new BadRequestException('E-pochta noto‘g‘ri');
    }

    await this.prisma.contactMessage.create({
      data: {
        name,
        phone,
        email,
        subject: body.subject?.trim() || null,
        body: message,
      },
    });

    // Yozuv ID si qaytarilmaydi: ochiq endpoint ichki identifikatorlarni
    // oshkor qilmasligi kerak.
    return { ok: true };
  }

  @Get('admin/contact-messages')
  @RequirePermissions('content.view')
  list(@Query('handled') handled?: string) {
    return this.prisma.contactMessage.findMany({
      where: handled === undefined || handled === '' ? {} : { isHandled: handled === 'true' },
      orderBy: [{ isHandled: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  @Put('admin/contact-messages/:id')
  @RequirePermissions('content.update')
  @Audit('content', 'contact-message')
  update(@Param('id') id: string, @Body() body: { isHandled?: boolean; note?: string | null }) {
    return this.prisma.contactMessage.update({
      where: { id },
      data: {
        ...(body.isHandled !== undefined ? { isHandled: body.isHandled } : {}),
        ...(body.note !== undefined ? { note: body.note?.trim() || null } : {}),
      },
    });
  }
}
