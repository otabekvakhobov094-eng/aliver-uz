import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit, RequirePermissions } from '../../common/decorators';
import { UzumService } from './uzum.service';

@ApiTags('admin-uzum')
@Controller('admin/uzum')
export class UzumController {
  constructor(private readonly uzum: UzumService) {}

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
}
