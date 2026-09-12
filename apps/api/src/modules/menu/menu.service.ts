import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertMenuItemDto } from './dto/menu.dto';
import {
  type MenuRow,
  type MenuTargetType,
  type PublicMenuItem,
  buildTree,
  isExternal,
  keepResolvable,
  menuHref,
  needsLookup,
  validateTargetShape,
} from './menu-target';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------- ommaviy ---------------- */

  /**
   * Saytga beriladigan daraxt. Faqat faol bandlar.
   *
   * Nishoni yo'qolgan band (masalan kategoriya o'chirilgan) menyudan
   * TUSHIB QOLADI, xato bermaydi. Sabab: saytning sarlavhasi butun
   * bo'lishi kerak — bitta buzilgan havola uchun butun menyuni
   * yiqitish mumkin emas. Admin tomonda esa aynan shu band qizil
   * bo'lib ko'rinadi (`adminTree` dagi `broken` bayrog'i).
   */
  async publicTree(location: string): Promise<PublicMenuItem[]> {
    const rows = await this.prisma.menuItem.findMany({
      where: { location, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return buildTree(await this.filterResolvable(rows));
  }

  /* ---------------- admin ---------------- */

  /** Admin ro'yxati — buzilgan nishonlar belgilangan holda. */
  async adminTree(location: string) {
    const rows = await this.prisma.menuItem.findMany({
      where: { location },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const ok = new Set((await this.filterResolvable(rows)).map((r) => r.id));
    return rows.map((r) => ({
      ...r,
      href: menuHref(r as { targetType: MenuTargetType; targetValue: string | null }),
      broken: !ok.has(r.id),
    }));
  }

  async create(dto: UpsertMenuItemDto) {
    await this.assertTarget(dto);
    await this.assertParent(dto, null);
    const sortOrder = dto.sortOrder ?? (await this.nextSort(dto.location, dto.parentId ?? null));
    return this.prisma.menuItem.create({ data: { ...this.data(dto), sortOrder } });
  }

  async update(id: string, dto: UpsertMenuItemDto) {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Menyu bandi topilmadi');
    await this.assertTarget(dto);
    await this.assertParent(dto, id);
    return this.prisma.menuItem.update({ where: { id }, data: this.data(dto) });
  }

  async remove(id: string) {
    const existing = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Menyu bandi topilmadi');
    // Bolalari kaskad bilan ketadi — bu bazada kafolatlangan.
    await this.prisma.menuItem.delete({ where: { id } });
    return { ok: true };
  }

  /** Bitta ota ichidagi tartibni qayta yozish. */
  async reorder(ids: string[]) {
    await this.prisma.$transaction(
      ids.map((id, i) => this.prisma.menuItem.update({ where: { id }, data: { sortOrder: i } })),
    );
    return { ok: true };
  }

  /* ---------------- ichki ---------------- */

  private data(dto: UpsertMenuItemDto) {
    return {
      location: dto.location,
      parentId: dto.parentId ?? null,
      labelUz: dto.labelUz,
      labelRu: dto.labelRu,
      noteUz: dto.noteUz ?? null,
      noteRu: dto.noteRu ?? null,
      targetType: dto.targetType,
      targetValue: dto.targetValue?.trim() || null,
      ...(dto.sortOrder === undefined ? {} : { sortOrder: dto.sortOrder }),
      ...(dto.isActive === undefined ? {} : { isActive: dto.isActive }),
      ...(dto.isHighlighted === undefined ? {} : { isHighlighted: dto.isHighlighted }),
    };
  }

  private async nextSort(location: string, parentId: string | null) {
    const last = await this.prisma.menuItem.findFirst({
      where: { location, parentId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? -1) + 1;
  }

  /**
   * Ota band haqiqatan mavjudmi, SHU joylashuvdami va o'zining bolasi
   * emasmi. Uchinchisi muhim: `parentId` ni o'ziga ko'rsatish daraxtni
   * halqaga aylantiradi va sahifani cheksiz rekursiyaga olib boradi.
   */
  private async assertParent(dto: UpsertMenuItemDto, selfId: string | null) {
    if (!dto.parentId) return;
    if (dto.parentId === selfId) throw new BadRequestException('Band o‘zining ostiga qo‘yilmaydi');
    const parent = await this.prisma.menuItem.findUnique({ where: { id: dto.parentId } });
    if (!parent) throw new BadRequestException('Ota band topilmadi');
    if (parent.location !== dto.location) {
      throw new BadRequestException('Ota band boshqa joylashuvda');
    }
    if (parent.parentId) {
      throw new BadRequestException('Menyu ikki qavatdan chuqur bo‘lmaydi');
    }
    if (selfId) {
      const childCount = await this.prisma.menuItem.count({ where: { parentId: selfId } });
      if (childCount > 0) {
        throw new BadRequestException('Bolalari bor bandni boshqa band ostiga ko‘chirib bo‘lmaydi');
      }
    }
  }

  /** Nishon shakli to'g'rimi va u haqiqatan mavjudmi. */
  private async assertTarget(dto: UpsertMenuItemDto) {
    const target = { targetType: dto.targetType as MenuTargetType, targetValue: dto.targetValue };
    const shape = validateTargetShape(target);
    if (shape) throw new BadRequestException(shape);
    if (!needsLookup(target.targetType)) return;
    const value = (dto.targetValue ?? '').trim();
    if (target.targetType === 'BLOG' && !value) return;
    const found = await this.exists(target.targetType, value);
    if (!found) {
      throw new BadRequestException(
        `«${value}» topilmadi. Menyu bandi bo‘sh sahifaga olib borishi mumkin emas.`,
      );
    }
  }

  private async exists(type: MenuTargetType, value: string): Promise<boolean> {
    switch (type) {
      case 'CATEGORY':
        return (await this.prisma.category.count({ where: { slug: value, isActive: true, deletedAt: null } })) > 0;
      case 'COLLECTION':
        return (await this.prisma.collection.count({ where: { slug: value, isActive: true, deletedAt: null } })) > 0;
      case 'PAGE':
        return (await this.prisma.page.count({ where: { slug: value, isPublished: true, deletedAt: null } })) > 0;
      case 'BLOG':
        return (await this.prisma.blogPost.count({ where: { slug: value, isPublished: true, deletedAt: null } })) > 0;
      default:
        return true;
    }
  }

  /** Nishoni hali ham mavjud bo'lgan bandlarni qaytaradi. */
  private async filterResolvable(rows: MenuRow[]): Promise<MenuRow[]> {
    const lookups = rows.filter((r) => needsLookup(r.targetType as MenuTargetType) && r.targetValue);
    if (lookups.length === 0) return rows;

    const slugs = (type: string) =>
      lookups.filter((r) => r.targetType === type).map((r) => r.targetValue!);

    // Har bir tur uchun BITTA so'rov: band soni ko'p bo'lsa ham
    // menyu uchun to'rtta so'rovdan oshmaydi.
    const [cats, cols, pages, posts] = await Promise.all([
      this.prisma.category.findMany({
        where: { slug: { in: slugs('CATEGORY') }, isActive: true, deletedAt: null },
        select: { slug: true },
      }),
      this.prisma.collection.findMany({
        where: { slug: { in: slugs('COLLECTION') }, isActive: true, deletedAt: null },
        select: { slug: true },
      }),
      this.prisma.page.findMany({
        where: { slug: { in: slugs('PAGE') }, isPublished: true, deletedAt: null },
        select: { slug: true },
      }),
      this.prisma.blogPost.findMany({
        where: { slug: { in: slugs('BLOG') }, isPublished: true, deletedAt: null },
        select: { slug: true },
      }),
    ]);

    const alive: Record<string, Set<string>> = {
      CATEGORY: new Set(cats.map((c) => c.slug)),
      COLLECTION: new Set(cols.map((c) => c.slug)),
      PAGE: new Set(pages.map((p) => p.slug)),
      BLOG: new Set(posts.map((p) => p.slug)),
    };

    return keepResolvable(rows, alive);
  }
}
