import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UzumClient } from './uzum.client';
import {
  type MappedReview,
  mapProduct,
  mapReview,
  matchProduct,
  type MatchTarget,
} from './uzum-mapping';

/**
 * Uzum Seller do'konidan import — TZ-3 qo'shimchasi.
 *
 * Ikkita qaror ataylab shunday:
 *
 *   1. Sharh MANBASI bilan saqlanadi va saytda «Uzum'dan» deb
 *      ko'rsatiladi. Uni belgisiz ko'rsatish mijozga «bu odam shu
 *      saytda sotib olgan» deb aytardi va «tasdiqlangan xarid»
 *      yorlig'i yolg'on bo'lib qolardi. Manba ko'rsatilgani esa
 *      aksincha — ishonchni oshiradi, chunki sharhni Uzum'da
 *      tekshirish mumkin.
 *
 *   2. NARX sukut bo'yicha KO'CHIRILMAYDI. Uzum narxi ichida
 *      marketpleys komissiyasi bor va uni o'z saytingizga
 *      ko'chirish — o'zingizni qimmatga sotish. Kerak bo'lsa
 *      `withPrices` bayrog'i bilan ataylab so'raladi.
 */
@Injectable()
export class UzumService {
  private readonly logger = new Logger(UzumService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: UzumClient,
  ) {}

  status() {
    return this.client.status();
  }

  /** Moslashtirish uchun bizdagi variantlar ro'yxati. */
  private async targets(): Promise<MatchTarget[]> {
    const rows = await this.prisma.productVariant.findMany({
      where: { deletedAt: null },
      select: { sku: true, barcode: true, productId: true },
    });
    return rows.map((r) => ({ productId: r.productId, sku: r.sku, barcode: r.barcode }));
  }

  /**
   * Mahsulotlarni ko'rib chiqish (dry run).
   *
   * Import HECH NARSA YOZMAYDI, faqat nima bo'lishini ko'rsatadi.
   * 500 ta mahsulotni ko'r-ko'rona yozib qo'yish va keyin uni orqaga
   * qaytarish — bu adminka bilan qilinmaydigan ish.
   */
  async previewProducts() {
    const raw = await this.client.products(0, 200);
    const mapped = raw.map(mapProduct).filter((m): m is NonNullable<typeof m> => m !== null);
    const targets = await this.targets();

    const matched: Array<{ externalId: string; nameUz: string; productId: string }> = [];
    const missing: Array<{ externalId: string; nameUz: string; sku: string | null }> = [];

    for (const m of mapped) {
      const hit = matchProduct({ sku: m.sku, barcode: m.barcode }, targets);
      if (hit) matched.push({ externalId: m.externalId, nameUz: m.nameUz, productId: hit.productId });
      else missing.push({ externalId: m.externalId, nameUz: m.nameUz, sku: m.sku });
    }

    return {
      total: raw.length,
      readable: mapped.length,
      // O'qib bo'lmagan yozuvlar — nomi yoki identifikatori yo'q.
      unreadable: raw.length - mapped.length,
      alreadyInCatalog: matched.length,
      newToCatalog: missing.length,
      sample: missing.slice(0, 20),
    };
  }

  /**
   * Sharhlarni import qilish.
   *
   * Takrorlanishdan himoya BAZADA: `(source, externalId)` bo'yicha
   * unikal indeks. Sinxronizatsiya qayta-qayta ishga tushiriladi va
   * bu kafolat kodga ishonib qo'yilmagan.
   */
  async importReviews(options: { dryRun?: boolean } = {}) {
    // BARCHA sahifalar: ilgari faqat birinchi 500 tasi olinardi va
    // undan keyingi sharhlar hech qachon import qilinmasdi.
    const raw = await this.client.allReviews();
    const mapped = raw.map(mapReview).filter((m): m is MappedReview => m !== null);
    const targets = await this.targets();

    let created = 0;
    let duplicate = 0;
    const unmatched: MappedReview[] = [];

    for (const r of mapped) {
      const hit = matchProduct({ sku: r.sku, barcode: null }, targets);
      if (!hit) {
        unmatched.push(r);
        continue;
      }
      if (options.dryRun) {
        created += 1;
        continue;
      }

      try {
        await this.prisma.review.create({
          data: {
            productId: hit.productId,
            // Uzum sharhida bizda mijoz YO'Q.
            customerId: null,
            rating: r.rating,
            body: r.body,
            mediaUrls: r.mediaUrls,
            source: 'UZUM',
            externalId: r.externalId,
            externalAuthor: r.author,
            // «Tasdiqlangan xarid» BELGILANMAYDI: xarid bizda emas,
            // Uzum'da qilingan va buni tasdiqlay olmaymiz.
            isVerified: false,
            // Import qilingan sharh ham moderatsiyadan o'tadi: Uzum'da
            // o'tgani bizning qoidalarimizga mos degani emas.
            status: 'PENDING',
            createdAt: r.createdAt ?? undefined,
          },
        });
        created += 1;
      } catch {
        // Unikal indeks — bu sharh allaqachon import qilingan.
        duplicate += 1;
      }
    }

    return {
      total: raw.length,
      readable: mapped.length,
      unreadable: raw.length - mapped.length,
      created,
      duplicate,
      unmatched: unmatched.length,
      unmatchedSample: unmatched.slice(0, 20).map((u) => ({
        externalId: u.externalId,
        sku: u.sku,
        rating: u.rating,
      })),
      dryRun: Boolean(options.dryRun),
    };
  }
}
