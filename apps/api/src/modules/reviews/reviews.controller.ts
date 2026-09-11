import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit, RequirePermissions } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Sharhlarni moderatsiya qilish — TZ 51.
 *
 * Sharh modeli avvaldan bor edi, lekin uni ko'rish va tasdiqlash yo'li
 * yo'q edi — ya'ni mijoz yozgan sharh hech qachon saytga chiqmasdi.
 */

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUSES: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

@Controller('admin/reviews')
export class ReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  private readonly shape = {
    id: true,
    rating: true,
    body: true,
    mediaUrls: true,
    status: true,
    isVerified: true,
    adminReply: true,
    moderatedAt: true,
    createdAt: true,
    product: { select: { id: true, slug: true, nameUz: true } },
    customer: { select: { id: true, fullName: true, phone: true } },
  };

  @Get()
  @RequirePermissions('reviews.view')
  async list(@Query('status') status?: string, @Query('rating') rating?: string) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (status && STATUSES.includes(status as ReviewStatus)) where.status = status;
    if (rating) {
      const value = Number(rating);
      if (Number.isInteger(value) && value >= 1 && value <= 5) where.rating = value;
    }

    const [items, counts] = await Promise.all([
      this.prisma.review.findMany({
        where: where as never,
        select: this.shape,
        // Kutayotganlar birinchi: moderatsiya navbati shu sahifaning
        // asosiy vazifasi, arxivni ko'rish emas.
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 200,
      }),
      this.prisma.review.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: true,
      }),
    ]);

    return {
      items,
      counts: Object.fromEntries(
        counts.map((c: { status: string; _count: number }) => [c.status, c._count]),
      ),
    };
  }

  @Post(':id/moderate')
  @RequirePermissions('reviews.approve')
  @Audit('reviews', 'moderate')
  async moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: ReviewStatus; adminReply?: string | null },
    @Req() req: Request & { auditBefore?: unknown; auditRecordId?: string },
  ) {
    if (!STATUSES.includes(body?.status)) throw new BadRequestException('Holat noto‘g‘ri');

    const before = await this.prisma.review.findFirst({
      where: { id, deletedAt: null },
      select: this.shape,
    });
    if (!before) throw new NotFoundException('Sharh topilmadi');
    req.auditBefore = before;
    req.auditRecordId = id;

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        status: body.status as never,
        adminReply: body.adminReply === undefined ? undefined : body.adminReply?.trim() || null,
        moderatedAt: new Date(),
      },
      select: this.shape,
    });

    // Mahsulotning o'rtacha reytingi faqat TASDIQLANGAN sharhlardan
    // hisoblanadi. Agregatni shu yerda qayta hisoblaymiz, chunki holat
    // o'zgargan yagona joy shu.
    await this.recomputeRating(updated.product.id);
    return updated;
  }

  /** Bir nechta sharhni birdan tasdiqlash — moderatsiya navbati uchun. */
  @Post('bulk')
  @RequirePermissions('reviews.approve')
  @Audit('reviews', 'bulk-moderate')
  async bulk(@Body() body: { ids: string[]; status: ReviewStatus }) {
    if (!Array.isArray(body?.ids) || body.ids.length === 0) {
      throw new BadRequestException('Sharh tanlanmagan');
    }
    if (!STATUSES.includes(body.status)) throw new BadRequestException('Holat noto‘g‘ri');

    const affected: Array<{ productId: string }> = await this.prisma.review.findMany({
      where: { id: { in: body.ids }, deletedAt: null },
      select: { productId: true },
    });

    await this.prisma.review.updateMany({
      where: { id: { in: body.ids }, deletedAt: null },
      data: { status: body.status as never, moderatedAt: new Date() },
    });

    const productIds: string[] = [...new Set(affected.map((r) => r.productId))];
    for (const productId of productIds) await this.recomputeRating(productId);

    return { updated: affected.length, products: productIds.length };
  }

  private async recomputeRating(productId: string): Promise<void> {
    const agg = await this.prisma.review.aggregate({
      where: { productId, status: 'APPROVED', deletedAt: null },
      _avg: { rating: true },
      _count: true,
    });
    await this.prisma.product
      .update({
        where: { id: productId },
        data: {
          ratingAvg: agg._avg.rating ?? 0,
          ratingCount: agg._count,
        } as never,
      })
      // Mahsulotda bu maydonlar bo'lmasa moderatsiya to'xtamasligi kerak.
      .catch(() => undefined);
  }
}
