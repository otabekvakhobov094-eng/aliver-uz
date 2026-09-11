import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Length, NotEquals } from 'class-validator';
import { Type } from 'class-transformer';
import { Audit, AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';
import { InventoryService } from './inventory.service';

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
