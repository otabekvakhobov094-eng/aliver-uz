import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Audit, RequirePermissions } from '../../common/decorators';
import { ReorderMenuDto, UpsertMenuItemDto } from './dto/menu.dto';
import { MENU_ROUTES, MENU_TARGET_TYPES } from './menu-target';
import { MenuService } from './menu.service';

@ApiTags('admin-content')
@Controller('admin/menu')
export class AdminMenuController {
  constructor(private readonly menu: MenuService) {}

  /** Shaklni to'ldirish uchun: qanday nishonlar va qanday yo'llar bor. */
  @Get('options')
  @RequirePermissions('content.view')
  options() {
    return { targetTypes: MENU_TARGET_TYPES, routes: MENU_ROUTES };
  }

  @Get()
  @RequirePermissions('content.view')
  list(@Query('location') location?: string) {
    return this.menu.adminTree(location === 'FOOTER' ? 'FOOTER' : 'HEADER');
  }

  @Post()
  @RequirePermissions('content.create')
  @Audit('menu', 'create')
  create(@Body() dto: UpsertMenuItemDto) {
    return this.menu.create(dto);
  }

  @Put('reorder')
  @RequirePermissions('content.update')
  @Audit('menu', 'reorder')
  reorder(@Body() dto: ReorderMenuDto) {
    return this.menu.reorder(dto.ids);
  }

  @Put(':id')
  @RequirePermissions('content.update')
  @Audit('menu', 'update')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertMenuItemDto) {
    return this.menu.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('content.delete')
  @Audit('menu', 'delete')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.menu.remove(id);
  }
}
