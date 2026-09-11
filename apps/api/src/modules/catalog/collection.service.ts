import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertCollectionDto } from './dto/catalog.dto';
import { archivedSlug, uniqueSlug } from './slug.util';

/**
 * Kolleksiya — kategoriyadan ALOHIDA tushuncha (TZ 11).
 * Mahsulot bir vaqtda bir nechta kolleksiyada bo'lishi mumkin:
 * "Best Sellers", "Yangi kelganlar", "Hair Growth to'plami".
 */
@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  async list(activeOnly = true) {
    const rows = await this.prisma.collection.findMany({
      where: { deletedAt: null, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      nameUz: c.nameUz,
      nameRu: c.nameRu,
      descUz: c.descUz,
      descRu: c.descRu,
      imageUrl: c.imageUrl,
      isActive: c.isActive,
      sortOrder: c.sortOrder,
      productCount: c._count.products,
    }));
  }

  async bySlug(slug: string) {
    const collection = await this.prisma.collection.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!collection) throw new NotFoundException('Kolleksiya topilmadi');
    return collection;
  }

  async create(dto: UpsertCollectionDto) {
    const slug = await this.resolveSlug(dto.slug ?? dto.nameUz);
    return this.prisma.collection.create({
      data: {
        slug,
        nameUz: dto.nameUz,
        nameRu: dto.nameRu,
        descUz: dto.descUz ?? null,
        descRu: dto.descRu ?? null,
        imageUrl: dto.imageUrl ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpsertCollectionDto) {
    const current = await this.prisma.collection.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw new NotFoundException('Kolleksiya topilmadi');

    const slug =
      dto.slug && dto.slug !== current.slug ? await this.resolveSlug(dto.slug, id) : current.slug;

    return this.prisma.collection.update({
      where: { id },
      data: {
        slug,
        nameUz: dto.nameUz,
        nameRu: dto.nameRu,
        descUz: dto.descUz ?? null,
        descRu: dto.descRu ?? null,
        imageUrl: dto.imageUrl ?? null,
        sortOrder: dto.sortOrder ?? current.sortOrder,
        isActive: dto.isActive ?? current.isActive,
      },
    });
  }

  async remove(id: string) {
    const collection = await this.prisma.collection.findFirst({ where: { id, deletedAt: null } });
    if (!collection) throw new NotFoundException('Kolleksiya topilmadi');
    return this.prisma.collection.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, slug: archivedSlug(collection.slug) },
    });
  }

  /** Kolleksiya tarkibini to'liq almashtiradi (admin panelda drag-and-drop tartibi bilan). */
  async setProducts(collectionId: string, productIds: string[]) {
    await this.prisma.$transaction([
      this.prisma.collectionProduct.deleteMany({ where: { collectionId } }),
      this.prisma.collectionProduct.createMany({
        data: productIds.map((productId, i) => ({ collectionId, productId, sortOrder: i })),
        skipDuplicates: true,
      }),
    ]);
    return { count: productIds.length };
  }

  private async resolveSlug(desired: string, excludeId?: string): Promise<string> {
    const rows = await this.prisma.collection.findMany({
      where: { deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { slug: true },
    });
    return uniqueSlug(desired, new Set(rows.map((r) => r.slug)));
  }
}
