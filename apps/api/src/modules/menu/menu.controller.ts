import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { MenuService } from './menu.service';

@Public()
@ApiTags('content')
@Controller('content/menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get()
  tree(@Query('location') location?: string) {
    return this.menu.publicTree(location === 'FOOTER' ? 'FOOTER' : 'HEADER');
  }
}
