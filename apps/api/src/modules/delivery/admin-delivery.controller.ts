import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { Audit, RequirePermissions } from '../../common/decorators';
import { DeliveryAdminService } from './delivery-admin.service';
import {
  SaveMethodRegionsDto,
  UpsertDeliveryMethodDto,
  UpsertDistrictDto,
  UpsertRegionDto,
} from './dto/delivery-admin.dto';

class ActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

@ApiTags('admin-delivery')
@Controller('admin/delivery')
export class AdminDeliveryController {
  constructor(private readonly delivery: DeliveryAdminService) {}

  /* ------------------------------- Hududlar ------------------------------- */

  @Get('regions')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Viloyatlar va tumanlar' })
  regions() {
    return this.delivery.regions();
  }

  @Post('regions')
  @RequirePermissions('settings.update')
  @Audit('settings', 'region_upsert')
  @ApiOperation({ summary: 'Viloyat qo‘shish yoki tahrirlash' })
  upsertRegion(@Body() dto: UpsertRegionDto) {
    return this.delivery.upsertRegion(dto);
  }

  @Put('regions/:id/active')
  @RequirePermissions('settings.update')
  @Audit('settings', 'region_active')
  @ApiOperation({
    summary: 'Viloyatni yoqish yoki o‘chirish',
    description: 'O‘chirilganda uning tumanlari ham yopiladi. Yozuv o‘chirilmaydi.',
  })
  setRegionActive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActiveDto) {
    return this.delivery.setRegionActive(id, dto.isActive);
  }

  @Post('districts')
  @RequirePermissions('settings.update')
  @Audit('settings', 'district_upsert')
  @ApiOperation({ summary: 'Tuman qo‘shish yoki tahrirlash' })
  upsertDistrict(@Body() dto: UpsertDistrictDto) {
    return this.delivery.upsertDistrict(dto);
  }

  @Put('districts/:id/active')
  @RequirePermissions('settings.update')
  @Audit('settings', 'district_active')
  setDistrictActive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActiveDto) {
    return this.delivery.setDistrictActive(id, dto.isActive);
  }

  /* -------------------------------- Usullar -------------------------------- */

  @Get('methods')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Yetkazib berish usullari' })
  methods() {
    return this.delivery.methods();
  }

  @Post('methods')
  @RequirePermissions('settings.update')
  @Audit('settings', 'delivery_method_upsert')
  @ApiOperation({ summary: 'Usul qo‘shish yoki tahrirlash' })
  upsertMethod(@Body() dto: UpsertDeliveryMethodDto) {
    return this.delivery.upsertMethod(dto);
  }

  @Put('methods/:id/active')
  @RequirePermissions('settings.update')
  @Audit('settings', 'delivery_method_active')
  @ApiOperation({
    summary: 'Usulni yoqish yoki o‘chirish',
    description: 'Oxirgi faol usulni o‘chirib bo‘lmaydi — checkout ishlamay qolardi.',
  })
  setMethodActive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActiveDto) {
    return this.delivery.setMethodActive(id, dto.isActive);
  }

  /* ---------------------------- Narx matritsasi ---------------------------- */

  @Get('methods/:id/regions')
  @RequirePermissions('settings.view')
  @ApiOperation({
    summary: 'Usulning hududlar bo‘yicha narxi',
    description: 'Yozuv yo‘q hudud uchun standart narx ko‘rsatiladi.',
  })
  methodRegions(@Param('id', ParseUUIDPipe) id: string) {
    return this.delivery.methodRegions(id);
  }

  @Put('methods/:id/regions')
  @RequirePermissions('settings.update')
  @Audit('settings', 'delivery_matrix')
  @ApiOperation({ summary: 'Narx matritsasini saqlash' })
  saveMethodRegions(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SaveMethodRegionsDto) {
    return this.delivery.saveMethodRegions(id, dto.rows);
  }
}
