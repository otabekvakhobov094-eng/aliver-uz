import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { ContentService } from './content.service';

@Public()
@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('pages/:slug') page(@Param('slug') slug: string) { return this.content.page(slug); }
  @Get('blog') posts() { return this.content.posts(); }
  @Get('blog/:slug') post(@Param('slug') slug: string) { return this.content.post(slug); }
  @Get('banners') banners(@Query('placement') placement?: string) { return this.content.banners(placement); }
  @Get('faq') faqs() { return this.content.faqs(); }
  @Get('redirect') resolveRedirect(@Query('path') path: string) { return this.content.resolveRedirect(path); }
  @Get('redirects') redirects() { return this.content.redirects(); }
}
