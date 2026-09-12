import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertCategoryDto } from './dto/catalog.dto';
import {
  CategoryNode,
  assertDepthAllowed,
  assertNoCycle,
  buildPath,
  buildTree,
  collectDescendantIds,
} from './category-tree.util';
import { archivedSlug, uniqueSlug } from './slug.util';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ommaviy daraxt: faqat faol kategoriyalar, mahsulot soni bilan. */
  async tree(options: { activeOnly?: boolean } = {}): Promise<CategoryNode[]> {
    const rows = await this.prisma.category.findMany({
      where: {
        deletedAt: null,
        ...(options.activeOnly === false ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
      select: {
        id: true,
        parentId: true,
        slug: true,
        nameUz: true,
        nameRu: true,
        sortOrder: true,
        isActive: true,
        depth: true,
        path: true,
        imageUrl: true,
        iconUrl: true,
        _count: { select: { products: true } },
      },
    });

    /*
     * Rasmi yo'q kategoriyaga MAHSULOT SURATI qo'yiladi.
     *
     * Bosh sahifadagi kategoriya kartochkalari bo'sh pushti
     * to'rtburchak bo'lib turardi: rasm adminda yuklanmagan va uni
     * 8 ta kategoriyaga alohida tayyorlash kerak edi. Kosmetika
     * do'konida esa rasmsiz blok — eng yomon birinchi taassurot.
     *
     * Zaxira rasm HAR DOIM to'g'ri bo'ladi: u aynan shu
     * kategoriyadagi mahsulotdan olinadi. Admin o'z rasmini
     * yuklaganda u ustun turadi.
     */
    const withoutImage = rows.filter((r) => !r.imageUrl).map((r) => r.id);
    const fallback = new Map<string, string>();

    if (withoutImage.length > 0) {
      const links = await this.prisma.productCategory.findMany({
        where: {
          categoryId: { in: withoutImage },
          product: {
            is: {
              deletedAt: null,
              status: 'ACTIVE',
              images: { some: { kind: 'MAIN' } },
            },
          },
        },
        select: {
          categoryId: true,
          product: {
            select: {
              images: {
                where: { kind: 'MAIN' },
                orderBy: { sortOrder: 'asc' },
                take: 1,
                select: { url: true },
              },
            },
          },
        },
        take: 500,
      });

      for (const link of links) {
        if (fallback.has(link.categoryId)) continue;
        const url = link.product?.images?.[0]?.url;
        if (url) fallback.set(link.categoryId, url);
      }
    }

    return buildTree(
      rows.map((r) => ({
        id: r.id,
        parentId: r.parentId,
        slug: r.slug,
        nameUz: r.nameUz,
        nameRu: r.nameRu,
        sortOrder: r.sortOrder,
        isActive: r.isActive,
        depth: r.depth,
        path: r.path,
        productCount: r._count.products,
        imageUrl: r.imageUrl ?? fallback.get(r.id) ?? null,
        iconUrl: r.iconUrl,
      })) as never,
    );
  }

  async bySlug(slug: string) {
    const category = await this.prisma.category.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!category) throw new NotFoundException('Kategoriya topilmadi');
    return category;
  }

  /** Kategoriya va uning barcha avlodlari — filtrda ishlatiladi. */
  async descendantIds(slug: string): Promise<string[]> {
    const category = await this.bySlug(slug);
    const tree = await this.tree({ activeOnly: false });
    const ids = collectDescendantIds(tree, category.id);
    return ids.length > 0 ? ids : [category.id];
  }

  /** Breadcrumb: ildizdan joriygacha. */
  async breadcrumb(categoryId: string) {
    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category?.path) return [];
    const ids = category.path.split('/');
    const rows = await this.prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true, nameUz: true, nameRu: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }

  async create(dto: UpsertCategoryDto) {
    const parent = await this.loadParent(dto.parentId ?? null);
    const depth = assertDepthAllowed(parent ? parent.depth : null);

    const slug = await this.resolveSlug(dto.slug ?? dto.nameUz);

    const created = await this.prisma.category.create({
      data: {
        parentId: parent?.id ?? null,
        slug,
        nameUz: dto.nameUz,
        nameRu: dto.nameRu,
        nameEn: null,
        descUz: dto.descUz ?? null,
        descRu: dto.descRu ?? null,
        imageUrl: dto.imageUrl ?? null,
        iconUrl: dto.iconUrl ?? null,
        seoTitleUz: dto.seoTitleUz ?? null,
        seoTitleRu: dto.seoTitleRu ?? null,
        seoDescUz: dto.seoDescUz ?? null,
        seoDescRu: dto.seoDescRu ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        depth,
        path: null,
      },
    });

    // path faqat id ma'lum bo'lgach yoziladi
    return this.prisma.category.update({
      where: { id: created.id },
      data: { path: buildPath(parent?.path ?? null, created.id) },
    });
  }

  async update(id: string, dto: UpsertCategoryDto) {
    const current = await this.prisma.category.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw new NotFoundException('Kategoriya topilmadi');

    const parentChanged = dto.parentId !== undefined && dto.parentId !== current.parentId;
    let depth = current.depth;
    let path = current.path ?? id;

    if (parentChanged) {
      const parent = await this.loadParent(dto.parentId ?? null);
      assertNoCycle(id, parent?.path ?? null);
      depth = assertDepthAllowed(parent ? parent.depth : null);
      path = buildPath(parent?.path ?? null, id);

      // Avlodlar chuqurligi ham cheklovdan oshmasligi kerak
      const maxChildDepth = await this.maxDescendantDepth(current.path ?? id);
      const shift = depth - current.depth;
      assertDepthAllowed(maxChildDepth + shift - 1);
    }

    const slug =
      dto.slug && dto.slug !== current.slug ? await this.resolveSlug(dto.slug, id) : current.slug;

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        parentId: parentChanged ? (dto.parentId ?? null) : current.parentId,
        slug,
        nameUz: dto.nameUz,
        nameRu: dto.nameRu,
        descUz: dto.descUz ?? null,
        descRu: dto.descRu ?? null,
        imageUrl: dto.imageUrl ?? null,
        iconUrl: dto.iconUrl ?? null,
        seoTitleUz: dto.seoTitleUz ?? null,
        seoTitleRu: dto.seoTitleRu ?? null,
        seoDescUz: dto.seoDescUz ?? null,
        seoDescRu: dto.seoDescRu ?? null,
        sortOrder: dto.sortOrder ?? current.sortOrder,
        isActive: dto.isActive ?? current.isActive,
        depth,
        path,
      },
    });

    if (parentChanged)
      await this.rebuildDescendantPaths(current.path ?? id, path, depth - current.depth);
    return updated;
  }

  /**
   * Soft delete. Ichida kategoriya yoki mahsulot bo'lsa o'chirilmaydi —
   * "yo'qolgan" mahsulotlar muammosini oldini oladi.
   */
  async remove(id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { children: true, products: true } } },
    });
    if (!category) throw new NotFoundException('Kategoriya topilmadi');

    if (category._count.children > 0) {
      throw new ConflictException('Avval ichki kategoriyalarni o‘chiring yoki ko‘chiring');
    }
    if (category._count.products > 0) {
      throw new ConflictException(
        `Kategoriyada ${category._count.products} ta mahsulot bor. Avval ularni boshqa kategoriyaga ko‘chiring.`,
      );
    }

    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, slug: archivedSlug(category.slug) },
    });
  }

  /* ---------- yordamchi ---------- */

  private async loadParent(parentId: string | null) {
    if (!parentId) return null;
    const parent = await this.prisma.category.findFirst({
      where: { id: parentId, deletedAt: null },
    });
    if (!parent) throw new BadRequestException('Ota kategoriya topilmadi');
    return parent;
  }

  private async resolveSlug(desired: string, excludeId?: string): Promise<string> {
    const existing = await this.prisma.category.findMany({
      where: { deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { slug: true },
    });
    return uniqueSlug(desired, new Set(existing.map((e) => e.slug)));
  }

  private async maxDescendantDepth(prefix: string): Promise<number> {
    const rows = await this.prisma.category.findMany({
      where: { path: { startsWith: `${prefix}/` }, deletedAt: null },
      select: { depth: true },
    });
    return rows.reduce((m, r) => Math.max(m, r.depth), 0);
  }

  private async rebuildDescendantPaths(oldPrefix: string, newPrefix: string, depthShift: number) {
    const rows = await this.prisma.category.findMany({
      where: { path: { startsWith: `${oldPrefix}/` } },
      select: { id: true, path: true, depth: true },
    });
    await this.prisma.$transaction(
      rows.map((r) =>
        this.prisma.category.update({
          where: { id: r.id },
          data: {
            path: `${newPrefix}${r.path!.slice(oldPrefix.length)}`,
            depth: r.depth + depthShift,
          },
        }),
      ),
    );
  }
}
