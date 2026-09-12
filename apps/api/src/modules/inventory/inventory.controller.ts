import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  NotEquals,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Audit, AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';
import { InventoryService } from './inventory.service';
import { parseStockFile } from './stock-import';

class AdjustStockDto {
  @Type(() => Number)
  @IsInt()
  @NotEquals(0, { message: 'O‘zgarish nol bo‘lishi mumkin emas' })
  delta!: number;

  @IsIn(['PURCHASE_IN', 'ADJUSTMENT', 'LOSS'])
  reason!: 'PURCHASE_IN' | 'ADJUSTMENT' | 'LOSS';

  @IsString()
  @Length(3, 300, { message: 'Sabab izohi kamida 3 belgidan iborat bo‘lishi kerak' })
  comment!: string;
}

class BulkThresholdDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  variantIds!: string[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000)
  threshold!: number;
}

@ApiTags('admin-inventory')
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('low-stock')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Qoldig‘i kam mahsulotlar (TZ 17)' })
  lowStock(@Query('limit') limit?: string) {
    return this.inventory.lowStock(limit ? Number(limit) : 50);
  }

  /**
   * Ostonani bir nechta variant uchun birdan qo'yish.
   *
   * «Qoldig'i kam» ro'yxati ostona bilan hisoblanadi va sukut bo'yicha
   * u hamma uchun 10. Amalda esa mahsulotlar juda turlicha aylanadi:
   * kuniga sotiladigan moy uchun 10 kech, yiliga bir necha marta
   * ketadigan asbob uchun esa erta. Ostonani bittalab to'g'rilash
   * 500 ta SKU da ish emas — shuning uchun ommaviy amal.
   *
   * Qoldiqni O'ZINI bitta songa surish ataylab YO'Q: turli SKU ni
   * bir xil songa qo'yish ma'noga ega emas. Fayldan kiritish esa
   * boshqa narsa — u yerda har bir SKU ning O'Z soni bor va har bir
   * o'zgarish harakat sifatida jurnalga tushadi (`bulk/stock`).
   */
  @Post('bulk/threshold')
  @RequirePermissions('inventory.update')
  @Audit('inventory', 'bulk_threshold')
  @ApiOperation({ summary: 'Bir nechta variant uchun kam qoldiq ostonasi' })
  bulkThreshold(@Body() dto: BulkThresholdDto) {
    return this.inventory.setThresholds(dto.variantIds, dto.threshold);
  }

  /**
   * Fayldan ommaviy qoldiq kiritish.
   *
   * NEGA BU KERAK. Katalogda 556 ta mahsulot bor va ularning bir
   * qismida o'nlab variant. Qoldiqni bittalab kiritish amalda
   * bajarilmaydigan ish: xodim boshlaydi va tashlab yuboradi, katalog
   * esa «Tugagan» bo'lib qolaveradi. Ya'ni qo'lda kiritish yo'li
   * mavjud bo'lsa ham, u ishlamaydi.
   *
   * Fayl SAQLANMAYDI: xotirada o'qiladi va hisobot qaytariladi.
   *
   * `dryRun=true` — hech narsa yozilmaydi, faqat nima o'zgarishi
   * ko'rsatiladi. Adminda birinchi bosqich aynan shu.
   */
  @Post('bulk/stock')
  @RequirePermissions('inventory.update')
  @Audit('inventory', 'bulk_stock')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiOperation({
    summary: 'Fayldan ommaviy qoldiq kiritish (inventarizatsiya)',
    description:
      'CSV: SKU va qoldiq ustunlari. Semantika — «shu son bo‘lsin», qo‘shish emas. ' +
      'Har bir o‘zgarish ombor harakati sifatida yoziladi.',
  })
  async bulkStock(
    @UploadedFile() file: { buffer?: Buffer } | undefined,
    @Query('dryRun') dryRun?: string,
    @Query('comment') comment?: string,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    if (!file?.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Fayl yuklanmadi');
    }
    const parsed = parseStockFile(file.buffer.toString('utf8'));
    if (parsed.rows.length === 0) {
      return { ...parsed, updated: 0, unchanged: 0, unknownSkus: [], changes: [], dryRun: true };
    }

    const result = await this.inventory.bulkSetStock(parsed.rows, {
      adminId: user?.sub,
      comment,
      dryRun: dryRun !== 'false',
    });
    return { ...result, parse: { total: parsed.total, problems: parsed.problems, columns: parsed.columns } };
  }

  @Get('variants/:variantId')
  @RequirePermissions('inventory.view')
  async variant(@Param('variantId', ParseUUIDPipe) variantId: string) {
    const map = await this.inventory.availability([variantId]);
    return map.get(variantId) ?? null;
  }

  @Get('variants/:variantId/movements')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'Harakatlar jurnali — qoldiq qayerdan kelgani' })
  movements(@Param('variantId', ParseUUIDPipe) variantId: string) {
    return this.inventory.movements(variantId);
  }

  @Post('variants/:variantId/adjust')
  @RequirePermissions('inventory.update')
  @Audit('inventory', 'adjust')
  @ApiOperation({
    summary: 'Qoldiqni qo‘lda o‘zgartirish',
    description: 'Sabab majburiy. Har o‘zgarish harakatlar jurnaliga yoziladi.',
  })
  adjust(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    return this.inventory.adjust({ ...dto, variantId, adminId: user?.sub });
  }
}
