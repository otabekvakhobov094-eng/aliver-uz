import { Controller, Get, Header } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_SAMPLE_THRESHOLD } from '../cart/sample-rules';
import { MAX_REDEEM_SHARE, POINTS_PER_SUM } from '../loyalty/loyalty-rules';

/**
 * Saytdagi va'dalar uchun HAQIQIY raqamlar.
 *
 * NEGA KERAK. Bosh sahifa, mahsulot sahifasi va savol-javob
 * «400 000 so'mdan yuqori bepul», «300 000 so'mdan namuna bepul»,
 * «buyurtmaning yarmigacha ball bilan» deb yozib qo'ygan edi —
 * uchalasi ham KODDA. Bu raqamlar esa boshqa joyda yashaydi:
 * yetkazib berish chegarasi hududda, namuna ostonasi savat
 * qoidalarida, ball ulushi esa sodiqlik qoidalarida.
 *
 * Ya'ni xodim adminda chegarani o'zgartirsa, sayt eski raqamni
 * va'da qilishda davom etardi, savat esa yangisini qo'llardi.
 * Mijoz uchun bu «sayt aldadi» degani, va u haq bo'lardi.
 *
 * Bu yerda hech qanday maxfiy narsa yo'q: hammasi baribir
 * checkout'da ko'rinadigan raqamlar.
 */
@ApiTags('content')
@Controller('shop-facts')
export class ShopFactsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  // Bir daqiqa kesh: raqam kamdan-kam o'zgaradi, lekin o'zgargach
  // xodim natijani tez ko'rishi kerak.
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @ApiOperation({ summary: 'Saytdagi va’dalar uchun haqiqiy raqamlar' })
  async get() {
    /*
     * Bepul yetkazib berish chegarasi hududlarga ko'ra har xil
     * bo'lishi mumkin. Saytda umumiy va'da beriladi, shuning uchun
     * ENG PAST chegara olinadi: «shu summadan yuqori bepul» degan
     * gap hech bo'lmaganda bitta hududda rost bo'lishi kerak, aks
     * holda u yolg'on va'da bo'lardi.
     */
    const [methods, regionRows] = await Promise.all([
      this.prisma.deliveryMethod.findMany({
        where: { isActive: true, type: 'COURIER', freeThreshold: { not: null } },
        select: { freeThreshold: true },
      }),
      this.prisma.deliveryMethodRegion.findMany({
        where: { isAvailable: true, freeThreshold: { not: null } },
        select: { freeThreshold: true },
      }),
    ]);

    const thresholds = [...methods, ...regionRows]
      .map((r: { freeThreshold: bigint | null }) => r.freeThreshold)
      .filter((v): v is bigint => v !== null && v > 0n);

    const freeShippingFrom =
      thresholds.length > 0 ? thresholds.reduce((a, b) => (a < b ? a : b)) : null;

    return {
      /** Tiyinda. `null` — bepul yetkazib berish umuman yo'q. */
      freeShippingFrom: freeShippingFrom === null ? null : freeShippingFrom.toString(),
      /** Namuna ochiladigan osona, tiyinda. */
      sampleFrom: DEFAULT_SAMPLE_THRESHOLD.toString(),
      /** Buyurtmaning necha foizini ball bilan qoplash mumkin. */
      loyaltyMaxRedeemPercent: MAX_REDEEM_SHARE,
      /** Necha so'mga bitta ball. */
      loyaltyPointsPerSum: POINTS_PER_SUM.toString(),
    };
  }
}
