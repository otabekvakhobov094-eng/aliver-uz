import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { PUBLIC_SETTING_KEYS } from './settings.definitions';

/**
 * Saytga chiqadigan do'kon ma'lumotlari.
 *
 * NEGA BU KERAK BO'LDI. Admin panelda telefon raqami o'zgartirilardi,
 * saqlanardi, «1 ta sozlama saqlandi» deb yozilardi — va saytda hech
 * narsa o'zgarmasdi. Sabab: sayt bu qiymatlarni umuman o'qimasdi,
 * ular sahifa kodida qo'lda yozilgan edi. Ya'ni sozlamalar bo'limi
 * bor edi, lekin u hech narsani boshqarmasdi.
 *
 * Bu eng yomon turdagi nosozlik: hamma narsa ishlayotgandek ko'rinadi,
 * xato hech qayerda chiqmaydi, xodim esa raqamni qayta-qayta
 * o'zgartirib ko'radi.
 *
 * OQ RO'YXAT. Bu yerdan faqat `publicOnSite` deb belgilangan kalitlar
 * chiqadi. STIR, valyuta kursi yoki ichki chegaralar saytga kerak emas
 * va ular tasodifan chiqib ketmasligi kerak.
 */
@ApiTags('settings')
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('public')
  @Public()
  /*
   * Keshlash: bir daqiqa.
   *
   * Nol bo'lsa har sahifa ochilishida bazaga so'rov ketardi. Uzoq
   * bo'lsa — xodim raqamni o'zgartirib, natijani ko'rolmay, uni yana
   * o'zgartirishga tushardi. Bir daqiqa ikkalasini ham hal qiladi:
   * saqlagandan keyin sahifani yangilash yetarli.
   */
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @ApiOperation({
    summary: 'Saytda ko‘rinadigan do‘kon ma’lumotlari',
    description: 'Telefon, Telegram, e-pochta, ish vaqti va manzil — adminda o‘zgartiriladi.',
  })
  async get(): Promise<Record<string, string | null>> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: PUBLIC_SETTING_KEYS } },
      select: { key: true, value: true },
    });

    const out: Record<string, string | null> = {};
    for (const key of PUBLIC_SETTING_KEYS) out[key] = null;

    for (const row of rows) {
      const v = row.value;
      // Qiymat `Json` ustunida saqlanadi va satr ham, son ham,
      // `null` ham bo'lishi mumkin. Sayt esa faqat matn kutadi.
      out[row.key] =
        v === null || v === undefined
          ? null
          : typeof v === 'string'
            ? v.trim() || null
            : String(v);
    }
    return out;
  }
}
