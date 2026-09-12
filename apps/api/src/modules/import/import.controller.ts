import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Audit, AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';
import { ShopifyPreviewDto, ShopifyImportDto } from './dto/shopify-import.dto';
import { ProductImportService, type ImportMode } from './product-import.service';
import { ShopifyImportService } from './shopify-import.service';

const MODES: ImportMode[] = ['PREVIEW', 'CREATE_ONLY', 'UPDATE_ONLY', 'CREATE_AND_UPDATE'];

@ApiTags('admin-import')
@Controller('admin/import')
export class ImportController {
  constructor(
    private readonly service: ProductImportService,
    private readonly shopify: ShopifyImportService,
  ) {}

  /*
   * Shopify do'konidan katalog importi.
   *
   * Bu ish ilgari faqat `scripts/import-aliver-shopify.mjs` orqali,
   * buyruq qatoridan bajarilardi — ya'ni Node o'rnatish va ishlab
   * chiqarish bazasining parolini noutbukda ko'rsatish kerak bo'lardi.
   * Endi u serverda, admin panelidan ishlaydi.
   *
   * IKKI BOSQICH ataylab: avval ko'rib chiqish (hech narsa yozilmaydi),
   * keyin import. Besh yuzta mahsulotni ko'r-ko'rona yozib qo'yish va
   * keyin qo'lda tozalash — bu admin panel qiladigan ish emas.
   */

  @Post('shopify/preview')
  @RequirePermissions('products.create')
  @ApiOperation({
    summary: 'Shopify katalogini ko‘rib chiqish',
    description: 'Hech narsa yozilmaydi: nima import qilinishi ko‘rsatiladi.',
  })
  previewShopify(@Body() dto: ShopifyPreviewDto) {
    return this.shopify.preview(dto.sourceUrl, dto.usdToUzs);
  }

  @Post('shopify/run')
  @RequirePermissions('products.create')
  @Audit('products', 'shopify_import')
  @ApiOperation({
    summary: 'Shopify katalogini import qilish',
    description: 'Mahsulot, variant, rasm, kategoriya, kolleksiya va brendlar yoziladi.',
  })
  runShopify(@Body() dto: ShopifyImportDto, @CurrentUser() user?: AuthPrincipal) {
    return this.shopify.run({
      sourceUrl: dto.sourceUrl,
      usdToUzs: dto.usdToUzs,
      warehouseCode: dto.warehouseCode ?? 'MAIN',
      defaultIkpu: dto.defaultIkpu ?? '03304999001000000',
      adminId: user?.sub,
    });
  }

  @Get('products/template')
  @RequirePermissions('products.create')
  @ApiOperation({ summary: 'Import shablonini yuklab olish (.xlsx)' })
  async template(@Res() res: Response) {
    const buffer = await this.service.buildTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="aliver-mahsulot-import.xlsx"');
    res.send(buffer);
  }

  @Post('products')
  @RequirePermissions('products.create')
  @Audit('products', 'import')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Mahsulotlarni import qilish',
    description:
      'Rejimlar: PREVIEW (bazaga yozilmaydi), CREATE_ONLY, UPDATE_ONLY, CREATE_AND_UPDATE. ' +
      'Avval PREVIEW bilan tekshirish tavsiya etiladi.',
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async importProducts(
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
    @Body() body: { mode?: string },
    @CurrentUser() user?: AuthPrincipal,
  ) {
    if (!file) throw new BadRequestException('Fayl yuborilmadi');

    const mode = (body.mode ?? 'PREVIEW').toUpperCase() as ImportMode;
    if (!MODES.includes(mode)) {
      throw new BadRequestException(`Noma'lum rejim. Ruxsat etilgan: ${MODES.join(', ')}`);
    }

    return this.service.run({ file, mode, adminId: user?.sub });
  }

  @Get('products/history')
  @RequirePermissions('products.view')
  history() {
    return this.service.history();
  }
}
