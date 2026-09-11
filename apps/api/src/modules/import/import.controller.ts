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
import { ProductImportService, type ImportMode } from './product-import.service';

const MODES: ImportMode[] = ['PREVIEW', 'CREATE_ONLY', 'UPDATE_ONLY', 'CREATE_AND_UPDATE'];

@ApiTags('admin-import')
@Controller('admin/import')
export class ImportController {
  constructor(private readonly service: ProductImportService) {}

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
