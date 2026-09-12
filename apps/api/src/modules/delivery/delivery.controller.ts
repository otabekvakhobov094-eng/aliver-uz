import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString, IsUUID } from 'class-validator';
import { Public } from '../../common/decorators';
import { DeliveryService } from './delivery.service';

class QuoteQueryDto {
  @IsUUID()
  regionId!: string;

  /** Chegirmadan keyingi mahsulotlar summasi, TIYINDA (satr sifatida). */
  @IsOptional()
  @IsString()
  subtotal?: string;

  /** Savatdagi chegirma "bepul yetkazish" bergan bo'lsa — checkout shuni uzatadi. */
  @IsOptional()
  @IsBooleanString()
  freeShipping?: string;
}

@ApiTags('delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Public()
  @Get('regions')
  @ApiOperation({ summary: 'Viloyatlar va tumanlar' })
  regions() {
    return this.delivery.regions();
  }

  @Public()
  @Get('tariffs')
  @ApiOperation({
    summary: 'Hududlar bo‘yicha tarif jadvali',
    description: 'Saytdagi «Yetkazish» sahifasi uchun — narxlar adminda o‘zgaradi.',
  })
  tariffs() {
    return this.delivery.tariffs();
  }

  @Public()
  @Get('quotes')
  @ApiOperation({
    summary: 'Hudud uchun yetkazib berish narxlari',
    description: 'Ekspress faqat u ochilgan hududlarda mavjud bo‘ladi.',
  })
  async quotes(@Query() query: QuoteQueryDto) {
    const quotes = await this.delivery.quotes({
      regionId: query.regionId,
      subtotalAfterDiscount: BigInt(query.subtotal ?? '0'),
      freeShippingFromDiscount: query.freeShipping === 'true',
    });
    return quotes.map((q) => ({
      ...q,
      price: q.price.toString(),
      basePrice: q.basePrice.toString(),
      freeThreshold: q.freeThreshold?.toString() ?? null,
      amountToFree: q.amountToFree.toString(),
    }));
  }
}
