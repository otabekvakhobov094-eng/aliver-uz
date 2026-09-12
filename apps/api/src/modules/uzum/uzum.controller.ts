import { Controller, Get, Header, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit, RequirePermissions } from '../../common/decorators';
import { UzumSyncService } from './uzum-sync.service';
import { UzumService } from './uzum.service';

@ApiTags('admin-uzum')
@Controller('admin/uzum')
export class UzumController {
  constructor(
    private readonly uzum: UzumService,
    private readonly sync: UzumSyncService,
  ) {}

  @Get('status')
  @RequirePermissions('products.view')
  @ApiOperation({ summary: 'Uzum Seller ulanishi holati' })
  status() {
    return this.uzum.status();
  }

  @Get('products/preview')
  @RequirePermissions('products.view')
  @ApiOperation({
    summary: 'Uzum mahsulotlarini ko‘rib chiqish',
    description: 'Hech narsa yozilmaydi — faqat nima bo‘lishi ko‘rsatiladi.',
  })
  previewProducts() {
    return this.uzum.previewProducts();
  }

  @Post('reviews/import')
  @RequirePermissions('reviews.update')
  @Audit('uzum', 'import_reviews')
  @ApiOperation({
    summary: 'Uzum sharhlarini import qilish',
    description:
      'Sharhlar «Uzum’dan» belgisi bilan saqlanadi va moderatsiyadan o‘tadi. ' +
      '`dryRun=true` bo‘lsa hech narsa yozilmaydi.',
  })
  importReviews(@Query('dryRun') dryRun?: string) {
    return this.uzum.importReviews({ dryRun: dryRun === 'true' });
  }

  /**
   * Ikki do'kon o'rtasidagi farq: narx va qoldiq.
   *
   * Hech narsa o'zgartirilmaydi — bu faqat ko'rinish.
   */
  @Get('sync/plan')
  @RequirePermissions('products.view')
  @ApiOperation({
    summary: 'ALIVER.UZ va Uzum o‘rtasidagi farq',
    description:
      'Narx faqat UZUM_PRICE_MARKUP_PERCENT ko‘rsatilganda taqqoslanadi: ' +
      'Uzum narxi ichida komissiya bor va uni saytdagi narx bilan tenglashtirish zarar keltiradi.',
  })
  syncPlan() {
    return this.sync.plan();
  }

  /** Uzum kabinetiga qo'lda yuklash uchun CSV. */
  @Get('sync/export.csv')
  @RequirePermissions('products.view')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="uzum-sync.csv"')
  @ApiOperation({ summary: 'Farqlar ro‘yxati — CSV' })
  syncCsv() {
    return this.sync.exportCsv();
  }

  /** Uzum tomonga yozish — kalit va hujjat kelgach. */
  @Post('sync/push')
  @RequirePermissions('products.update')
  @Audit('uzum', 'sync_push')
  @ApiOperation({
    summary: 'Uzum tomonga yozish',
    description: 'Hozircha ulanmagan: kalit va rasmiy hujjat kerak.',
  })
  syncPush() {
    return this.sync.push();
  }
}
