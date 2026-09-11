import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit, RequirePermissions } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Chegirmalarni boshqarish — TZ 47, TZ-2 4.7.
 *
 * Chegirma engine allaqachon yozilgan va checkoutda ishlaydi; yetishmagani
 * uni **yaratish va to'xtatish** imkoniyati edi. Aksiya to'xtatib
 * bo'lmasa, uni to'xtatishning yagona yo'li deploy qilishdir.
 */

type DiscountType = 'PERCENT' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
type DiscountScope = 'CART' | 'PRODUCT' | 'CATEGORY' | 'COLLECTION';

interface DiscountBody {
  code?: string | null;
  nameUz: string;
  nameRu: string;
  type: DiscountType;
  scope?: DiscountScope;
  value: number;
  minOrderAmount?: string | number | null;
  maxDiscountAmount?: string | number | null;
  minQuantity?: number | null;
  usageLimit?: number | null;
  usagePerCustomer?: number | null;
  stackable?: boolean;
  priority?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
  targetProductIds?: string[];
  targetCategoryIds?: string[];
  targetCollectionIds?: string[];
}

/** Pul maydonlari tiyinda va BigInt — hech qachon suzuvchi nuqtada emas. */
function money(v: unknown): bigint | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'bigint' ? v : BigInt(Math.round(Number(v)));
  if (n < 0n) throw new BadRequestException('Summa manfiy bo‘lmaydi');
  return n;
}

@Controller('admin/discounts')
export class AdminDiscountsController {
  constructor(private readonly prisma: PrismaService) {}

  private normalize(body: DiscountBody) {
    const nameUz = String(body?.nameUz ?? '').trim();
    const nameRu = String(body?.nameRu ?? '').trim();
    if (!nameUz || !nameRu) throw new BadRequestException('Nom ikkala tilda majburiy');

    const type = body.type;
    if (!['PERCENT', 'FIXED_AMOUNT', 'FREE_SHIPPING'].includes(type)) {
      throw new BadRequestException('Chegirma turi noto‘g‘ri');
    }

    const value = Number(body.value ?? 0);
    if (!Number.isFinite(value) || value < 0) throw new BadRequestException('Qiymat noto‘g‘ri');
    if (type === 'PERCENT' && value > 100) {
      throw new BadRequestException('Foiz 100 dan oshmaydi');
    }
    // FREE_SHIPPING uchun qiymat ma'nosiz — chalkashmasligi uchun nolga tushiriladi.
    const finalValue = type === 'FREE_SHIPPING' ? 0 : Math.round(value);

    const startsAt = body.startsAt ? new Date(body.startsAt) : null;
    const endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (startsAt && endsAt && endsAt <= startsAt) {
      // Bu tekshiruvsiz "hech qachon ishlamaydigan" aksiya yaratiladi va
      // sababi ko'rinmaydi: kod xato bermaydi, chegirma shunchaki tushmaydi.
      throw new BadRequestException('Tugash sanasi boshlanish sanasidan keyin bo‘lsin');
    }

    const code = body.code?.trim().toUpperCase() || null;
    if (code && !/^[A-Z0-9_-]{3,32}$/.test(code)) {
      throw new BadRequestException('Promokod 3–32 ta belgi: harf, raqam, - va _');
    }

    const scope = body.scope ?? 'CART';
    const targets = {
      targetProductIds: body.targetProductIds ?? [],
      targetCategoryIds: body.targetCategoryIds ?? [],
      targetCollectionIds: body.targetCollectionIds ?? [],
    };
    // Maqsadli chegirma nishonsiz bo'lsa hech qachon qo'llanmaydi.
    if (scope === 'PRODUCT' && targets.targetProductIds.length === 0) {
      throw new BadRequestException('Mahsulot chegirmasi uchun mahsulot tanlang');
    }
    if (scope === 'CATEGORY' && targets.targetCategoryIds.length === 0) {
      throw new BadRequestException('Kategoriya chegirmasi uchun kategoriya tanlang');
    }
    if (scope === 'COLLECTION' && targets.targetCollectionIds.length === 0) {
      throw new BadRequestException('Kolleksiya chegirmasi uchun kolleksiya tanlang');
    }

    return {
      code,
      nameUz,
      nameRu,
      type: type as never,
      scope: scope as never,
      value: finalValue,
      minOrderAmount: money(body.minOrderAmount),
      maxDiscountAmount: money(body.maxDiscountAmount),
      minQuantity: body.minQuantity ?? null,
      usageLimit: body.usageLimit ?? null,
      usagePerCustomer: body.usagePerCustomer ?? null,
      stackable: body.stackable ?? false,
      priority: body.priority ?? 100,
      startsAt,
      endsAt,
      isActive: body.isActive ?? true,
      ...targets,
    };
  }

  @Get()
  @RequirePermissions('discounts.view')
  async list(@Query('state') state?: string) {
    const now = new Date();
    const where =
      state === 'active'
        ? {
            isActive: true,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
            ],
          }
        : state === 'scheduled'
          ? { isActive: true, startsAt: { gt: now } }
          : state === 'expired'
            ? { endsAt: { lt: now } }
            : {};

    return this.prisma.discount.findMany({
      where: where as never,
      orderBy: [{ isActive: 'desc' }, { priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  @Post()
  @RequirePermissions('discounts.create')
  @Audit('discounts', 'create')
  async create(@Body() body: DiscountBody) {
    const data = this.normalize(body);
    if (data.code) {
      const exists = await this.prisma.discount.findUnique({ where: { code: data.code } });
      if (exists) throw new BadRequestException('Bu promokod band');
    }
    return this.prisma.discount.create({ data: data as never });
  }

  @Put(':id')
  @RequirePermissions('discounts.update')
  @Audit('discounts', 'update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DiscountBody,
    @Req() req: Request & { auditBefore?: unknown; auditRecordId?: string },
  ) {
    const before = await this.prisma.discount.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Chegirma topilmadi');
    req.auditBefore = before;
    req.auditRecordId = id;

    const data = this.normalize(body);
    if (data.code && data.code !== before.code) {
      const exists = await this.prisma.discount.findUnique({ where: { code: data.code } });
      if (exists) throw new BadRequestException('Bu promokod band');
    }
    return this.prisma.discount.update({ where: { id }, data: data as never });
  }

  /**
   * To'xtatish o'chirishdan afzal: `DiscountUsage` yozuvlari bu chegirmaga
   * havola qiladi va hisobotlar shundan o'qiydi.
   */
  @Post(':id/toggle')
  @RequirePermissions('discounts.update')
  @Audit('discounts', 'toggle')
  async toggle(@Param('id', ParseUUIDPipe) id: string) {
    const row = await this.prisma.discount.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Chegirma topilmadi');
    return this.prisma.discount.update({ where: { id }, data: { isActive: !row.isActive } });
  }

  @Delete(':id')
  @RequirePermissions('discounts.delete')
  @Audit('discounts', 'delete')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const used = await this.prisma.discountUsage.count({ where: { discountId: id } });
    if (used > 0) {
      throw new BadRequestException(
        `Bu chegirma ${used} marta ishlatilgan — o‘chirish o‘rniga to‘xtating`,
      );
    }
    await this.prisma.discount.delete({ where: { id } });
    return { ok: true };
  }
}
