import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Audit, RequirePermissions } from '../../common/decorators';
import { ContentService } from './content.service';
import { UpsertBannerDto, UpsertBlogPostDto, UpsertFaqDto, UpsertPageDto, UpsertRedirectDto } from './dto/content.dto';

@ApiTags('admin-content')
@Controller('admin/content')
export class AdminContentController {
  constructor(private readonly content: ContentService) {}

  @Get('pages') @RequirePermissions('content.view') pages() { return this.content.pages(true); }
  @Post('pages') @RequirePermissions('content.create') @Audit('content', 'create') createPage(@Body() dto: UpsertPageDto) { return this.content.createPage(dto); }
  @Put('pages/:id') @RequirePermissions('content.update') @Audit('content', 'update') updatePage(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertPageDto) { return this.content.updatePage(id, dto); }
  @Delete('pages/:id') @RequirePermissions('content.delete') @Audit('content', 'delete') removePage(@Param('id', ParseUUIDPipe) id: string) { return this.content.removePage(id); }

  @Get('blog') @RequirePermissions('blog.view') posts() { return this.content.posts(true); }
  @Post('blog') @RequirePermissions('blog.create') @Audit('blog', 'create') createPost(@Body() dto: UpsertBlogPostDto) { return this.content.createPost(dto); }
  @Put('blog/:id') @RequirePermissions('blog.update') @Audit('blog', 'update') updatePost(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertBlogPostDto) { return this.content.updatePost(id, dto); }
  @Delete('blog/:id') @RequirePermissions('blog.delete') @Audit('blog', 'delete') removePost(@Param('id', ParseUUIDPipe) id: string) { return this.content.removePost(id); }

  @Get('banners') @RequirePermissions('banners.view') banners(@Query('placement') placement?: string) { return this.content.banners(placement, true); }
  @Post('banners') @RequirePermissions('banners.create') @Audit('banners', 'create') createBanner(@Body() dto: UpsertBannerDto) { return this.content.createBanner(dto); }
  @Put('banners/:id') @RequirePermissions('banners.update') @Audit('banners', 'update') updateBanner(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertBannerDto) { return this.content.updateBanner(id, dto); }
  @Delete('banners/:id') @RequirePermissions('banners.delete') @Audit('banners', 'delete') removeBanner(@Param('id', ParseUUIDPipe) id: string) { return this.content.removeBanner(id); }

  @Get('faq') @RequirePermissions('content.view') faqs() { return this.content.faqs(true); }
  @Post('faq') @RequirePermissions('content.create') @Audit('content', 'faq_create') createFaq(@Body() dto: UpsertFaqDto) { return this.content.createFaq(dto); }
  @Put('faq/:id') @RequirePermissions('content.update') @Audit('content', 'faq_update') updateFaq(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertFaqDto) { return this.content.updateFaq(id, dto); }
  @Delete('faq/:id') @RequirePermissions('content.delete') @Audit('content', 'faq_delete') removeFaq(@Param('id', ParseUUIDPipe) id: string) { return this.content.removeFaq(id); }

  @Get('redirects') @RequirePermissions('content.view') redirects() { return this.content.redirects(true); }
  @Post('redirects') @RequirePermissions('content.create') @Audit('content', 'redirect_create') createRedirect(@Body() dto: UpsertRedirectDto) { return this.content.createRedirect(dto); }
  @Put('redirects/:id') @RequirePermissions('content.update') @Audit('content', 'redirect_update') updateRedirect(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertRedirectDto) { return this.content.updateRedirect(id, dto); }
  @Delete('redirects/:id') @RequirePermissions('content.delete') @Audit('content', 'redirect_delete') removeRedirect(@Param('id', ParseUUIDPipe) id: string) { return this.content.removeRedirect(id); }
}
