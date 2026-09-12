import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { Audit, RequirePermissions } from '../../common/decorators';
import { FiscalService } from './fiscal.service';

class CancelReceiptDto {
  @IsString()
  @Length(3, 300)
  reason!: string;
}

/**
 * Ommaviy amal uchun cheklar ro'yxati.
 *
 * 50 ta chegara ataylab: OFD chastota chegarasiga ega va so'rovlar
 * ketma-ket yuboriladi, ya'ni 500 ta chek bitta HTTP so'rovni
 * daqiqalarga cho'zardi va u timeout bilan uzilardi — natijada
 * operator qaysi chek yuborilganini umuman bilmay qolardi.
 */
class BulkReceiptDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50, { message: 'Bir vaqtda ko‘pi bilan 50 ta chek' })
  @IsUUID('4', { each: true })
  ids!: string[];
}

class BulkCancelReceiptDto extends BulkReceiptDto {
  @IsString()
  @Length(3, 300)
  reason!: string;
}

class ReceiptQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() page?: string;
}

@ApiTags('admin-fiscal')
@Controller('admin/fiscal')
export class FiscalController {
  constructor(private readonly fiscal: FiscalService) {}

  @Get('receipts')
  @RequirePermissions('fiscal.view')
  @ApiOperation({ summary: 'Fiskal cheklar ro‘yxati' })
  list(@Query() query: ReceiptQueryDto) {
    return this.fiscal.list({
      status: query.status,
      type: query.type,
      page: query.page ? Number(query.page) : 1,
    });
  }

  @Get('receipts/:id')
  @RequirePermissions('fiscal.view')
  @ApiOperation({ summary: 'Chek kartochkasi va OFD ga yuborilgan payload' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.fiscal.get(id);
  }

  @Post('receipts/:id/retry')
  @RequirePermissions('fiscal.update')
  @Audit('fiscal', 'retry')
  @ApiOperation({ summary: 'Chekni darhol qayta yuborish' })
  retry(@Param('id', ParseUUIDPipe) id: string) {
    return this.fiscal.sendOne(id);
  }

  @Post('receipts/:id/cancel')
  @RequirePermissions('fiscal.update')
  @Audit('fiscal', 'cancel')
  @ApiOperation({ summary: 'Chekni bekor qilish (yuborilmagan bo‘lsa)' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelReceiptDto) {
    return this.fiscal.cancel(id, dto.reason);
  }

  /**
   * Bir nechta chekni qayta yuborish.
   *
   * OFD yiqilgan kun bu eng ko'p kerak bo'ladigan amal: o'nlab chek
   * FAILED bo'lib qoladi va operator hozircha ularni BITTALAB bosadi.
   *
   * Qisman muvaffaqiyatsizlik YASHIRILMAYDI. Cheklarning bir qismi
   * o'tib, boshqasi o'tmasligi mumkin va operator qaysi biri va NEGA
   * o'tmaganini bilishi kerak — aks holda u «hammasi yuborildi» deb
   * o'ylab, yuborilmagan chek bilan qoladi. Bu esa qonun talabi.
   */
  @Post('receipts/bulk/retry')
  @RequirePermissions('fiscal.update')
  @Audit('fiscal', 'bulk_retry')
  @ApiOperation({ summary: 'Bir nechta chekni qayta yuborish' })
  async bulkRetry(@Body() dto: BulkReceiptDto) {
    const results: Array<{ id: string; ok: boolean; message?: string }> = [];
    // Ketma-ket, parallel emas: OFD chastota chegarasiga ega va bir
    // vaqtda 50 ta so'rov yuborish hammasini rad ettiradi.
    for (const id of dto.ids) {
      try {
        await this.fiscal.sendOne(id);
        results.push({ id, ok: true });
      } catch (error) {
        results.push({ id, ok: false, message: (error as Error).message });
      }
    }
    return {
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok),
    };
  }

  @Post('receipts/bulk/cancel')
  @RequirePermissions('fiscal.update')
  @Audit('fiscal', 'bulk_cancel')
  @ApiOperation({ summary: 'Bir nechta chekni bekor qilish' })
  async bulkCancel(@Body() dto: BulkCancelReceiptDto) {
    const results: Array<{ id: string; ok: boolean; message?: string }> = [];
    for (const id of dto.ids) {
      try {
        await this.fiscal.cancel(id, dto.reason);
        results.push({ id, ok: true });
      } catch (error) {
        results.push({ id, ok: false, message: (error as Error).message });
      }
    }
    return {
      cancelled: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok),
    };
  }

  @Post('orders/:orderId/rebuild')
  @RequirePermissions('fiscal.update')
  @Audit('fiscal', 'rebuild')
  @ApiOperation({
    summary: 'Buyurtma uchun sotuv chekini qayta qurish',
    description:
      'Chek qurilishida xato bo‘lgan (masalan IKPU kodi yo‘q) buyurtmalar uchun. ' +
      'Sabab tuzatilgach bosiladi.',
  })
  rebuild(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.fiscal.rebuildSale(orderId);
  }

  @Post('queue/run')
  @RequirePermissions('fiscal.update')
  @Audit('fiscal', 'run_queue')
  @ApiOperation({ summary: 'Navbatni darhol ishga tushirish' })
  run() {
    return this.fiscal.processQueue();
  }
}
