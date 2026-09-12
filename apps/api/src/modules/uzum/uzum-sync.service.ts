import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { UzumClient } from './uzum.client';
import { mapProduct } from './uzum-mapping';
import {
  type LocalOffer,
  type SyncPlan,
  buildSyncPlan,
  syncPlanToCsv,
} from './uzum-sync';

/**
 * ALIVER.UZ → Uzum yo'nalishi.
 *
 * NIMA QILINDI VA NIMA QILINMADI — buni ochiq aytish kerak.
 *
 * QILINDI: farqni hisoblash va uni CSV qilib berish. Bu BUGUN
 * ishlaydi, kalitsiz ham: admin faylni yuklab oladi va Uzum
 * kabinetidagi ommaviy tahrirlashga beradi. Ilgari bu ish ikkita
 * ekranni yonma-yon ochib, ko'z bilan solishtirish edi.
 *
 * QILINMADI: yozish so'rovlarining aniq yo'llari va tanasi TAXMIN
 * QILINMADI. Uzum Seller spetsifikatsiyasi tashqaridan yopiq va u
 * kalit bilan birga beriladi. Taxminiy yo'l bilan yozilgan kod
 * ishlayotgandek ko'rinadi, keyin esa birinchi haqiqiy
 * sinxronizatsiyada — ya'ni narx yoki qoldiq allaqachon
 * o'zgartirilgan paytda — yiqiladi. Shuning uchun `push()` sozlama
 * to'ldirilmaguncha ishlamaydi va buni ochiq aytadi.
 */
@Injectable()
export class UzumSyncService {
  private readonly logger = new Logger(UzumSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: UzumClient,
    private readonly config: ConfigService,
  ) {}

  /** Ustama foizi. Ko'rsatilmasa narx umuman sinxronlanmaydi. */
  private get markupPercent(): number | null {
    const raw = this.config.get<string>('UZUM_PRICE_MARKUP_PERCENT');
    if (raw === undefined || raw === null || String(raw).trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  private get reserveStock(): number {
    const n = Number(this.config.get<string>('UZUM_STOCK_RESERVE') ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  /**
   * Bizning tomondagi takliflar.
   *
   * Qoldiq — `totalStock - reservedStock`, ya'ni SOTUVGA TAYYOR
   * miqdor. To'liq qoldiqni yuborish marketpleysda allaqachon band
   * qilingan tovarni sotishga olib kelardi.
   */
  private async localOffers(): Promise<LocalOffer[]> {
    const rows = await this.prisma.productVariant.findMany({
      where: { deletedAt: null, product: { is: { deletedAt: null } } },
      select: {
        sku: true,
        price: true,
        isActive: true,
        product: { select: { nameUz: true, status: true } },
        inventory: { select: { totalStock: true, reservedStock: true } },
      },
    });

    return rows.map((v) => {
      const available = v.inventory.reduce(
        (sum: number, i: { totalStock: number; reservedStock: number }) =>
          sum + Math.max(0, i.totalStock - i.reservedStock),
        0,
      );
      return {
        sku: v.sku,
        nameUz: v.product?.nameUz ?? v.sku,
        priceTiyin: v.price as bigint,
        available,
        // Mahsulot darajasidagi holat ham hisobga olinadi: variant
        // faol bo'lib, mahsulot arxivda bo'lishi mumkin.
        isActive: v.isActive && v.product?.status === 'ACTIVE',
      };
    });
  }

  /** Ikki do'kon o'rtasidagi farq. */
  async plan(): Promise<SyncPlan> {
    const [local, raw] = await Promise.all([this.localOffers(), this.client.products(0, 500)]);
    const remote = raw
      .map(mapProduct)
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((m) => ({
        externalId: m.externalId,
        sku: m.sku,
        nameUz: m.nameUz,
        priceTiyin: m.priceTiyin,
        stock: m.stock,
      }));

    return buildSyncPlan({
      local,
      remote,
      markupPercent: this.markupPercent,
      reserveStock: this.reserveStock,
    });
  }

  /** Uzum kabinetiga qo'lda yuklash uchun CSV. */
  async exportCsv(): Promise<string> {
    return syncPlanToCsv(await this.plan());
  }

  /**
   * Uzum tomonga yozish.
   *
   * Yo'l sozlanmagan bo'lsa — 503 va aniq xabar. Bu ataylab: yozish
   * so'rovining shaklini taxmin qilib qo'yish mumkin edi, lekin
   * u yolg'on «ishlayapti» degan taassurot berardi.
   */
  async push(): Promise<never> {
    const path = this.config.get<string>('UZUM_SELLER_STOCK_UPDATE_PATH');
    throw new ServiceUnavailableException({
      code: 'UZUM_WRITE_NOT_CONFIGURED',
      message: path
        ? 'Yozish yo‘li ko‘rsatilgan, lekin so‘rov tanasining shakli hujjatdan tasdiqlanishi kerak. ' +
          'Hozircha CSV eksportidan foydalaning.'
        : 'Uzum Seller yozish API si hali ulanmagan: kalit va hujjat kerak. ' +
          'Shu paytgacha «CSV yuklab olish» tugmasi ishlaydi — fayl Uzum kabinetidagi ' +
          'ommaviy tahrirlashga yuklanadi.',
    });
  }
}
