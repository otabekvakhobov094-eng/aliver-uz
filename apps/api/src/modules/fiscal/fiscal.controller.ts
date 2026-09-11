import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { Audit, RequirePermissions } from '../../common/decorators';
import { FiscalService } from './fiscal.service';

class CancelReceiptDto {
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
