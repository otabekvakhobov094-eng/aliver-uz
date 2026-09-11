import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpsertBannerDto,
  UpsertBlogPostDto,
  UpsertFaqDto,
  UpsertPageDto,
  UpsertRedirectDto,
} from './dto/content.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  pages(admin = false) {
    return this.prisma.page.findMany({
      where: admin ? { deletedAt: null } : { deletedAt: null, isPublished: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async page(slug: string) {
    const page = await this.prisma.page.findFirst({
      where: { slug, deletedAt: null, isPublished: true },
    });
    if (!page) throw new NotFoundException('Sahifa topilmadi');
    return page;
  }

  createPage(dto: UpsertPageDto) {
    return this.prisma.page.create({ data: dto });
  }

  updatePage(id: string, dto: UpsertPageDto) {
    return this.prisma.page.update({ where: { id }, data: dto });
  }

  removePage(id: string) {
    return this.prisma.page.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  posts(admin = false) {
    return this.prisma.blogPost.findMany({
      where: admin
        ? { deletedAt: null }
        : { deletedAt: null, isPublished: true, publishedAt: { lte: new Date() } },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async post(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, deletedAt: null, isPublished: true, publishedAt: { lte: new Date() } },
    });
    if (!post) throw new NotFoundException('Maqola topilmadi');
    return post;
  }

  createPost(dto: UpsertBlogPostDto) {
    return this.prisma.blogPost.create({ data: this.blogData(dto) });
  }

  updatePost(id: string, dto: UpsertBlogPostDto) {
    return this.prisma.blogPost.update({ where: { id }, data: this.blogData(dto) });
  }

  removePost(id: string) {
    return this.prisma.blogPost.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  banners(placement?: string, admin = false) {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: admin
        ? placement ? { placement } : undefined
        : {
            placement,
            isActive: true,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
            ],
          },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  createBanner(dto: UpsertBannerDto) {
    return this.prisma.banner.create({ data: this.bannerData(dto) });
  }

  updateBanner(id: string, dto: UpsertBannerDto) {
    return this.prisma.banner.update({ where: { id }, data: this.bannerData(dto) });
  }

  removeBanner(id: string) {
    return this.prisma.banner.delete({ where: { id } });
  }

  faqs(admin = false) {
    return this.prisma.faq.findMany({
      where: admin ? undefined : { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  createFaq(dto: UpsertFaqDto) { return this.prisma.faq.create({ data: dto }); }
  updateFaq(id: string, dto: UpsertFaqDto) { return this.prisma.faq.update({ where: { id }, data: dto }); }
  removeFaq(id: string) { return this.prisma.faq.delete({ where: { id } }); }

  redirects(admin = false) {
    return this.prisma.redirect.findMany({
      where: admin ? undefined : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  resolveRedirect(fromPath: string) {
    return this.prisma.redirect.findFirst({ where: { fromPath, isActive: true }, select: { toPath: true, code: true } });
  }

  createRedirect(dto: UpsertRedirectDto) { return this.prisma.redirect.create({ data: dto }); }
  updateRedirect(id: string, dto: UpsertRedirectDto) { return this.prisma.redirect.update({ where: { id }, data: dto }); }
  removeRedirect(id: string) { return this.prisma.redirect.delete({ where: { id } }); }

  private blogData(dto: UpsertBlogPostDto) {
    return { ...dto, publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : dto.isPublished ? new Date() : null };
  }

  private bannerData(dto: UpsertBannerDto) {
    return {
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
    };
  }
}
