import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { sumToTiyin } from '../../common/money';
import {
  AdminProductQueryDto,
  ProductQueryDto,
  SortOption,
  UpsertProductDto,
  UpsertVariantDto,
} from './dto/catalog.dto';
import { buildProductSearchText, normalizeSearch, searchTokens } from './search.util';
import { archivedSlug, uniqueSlug } from './slug.util';
import { effectivePrice, minVariantPrice, productBadges } from './pricing.util';
import { CategoryService } from './category.service';
import type { Prisma } from '@prisma/client';

const DEFAULT_PER_PAGE = 24;

/** Prisma tranzaksiya klienti: $transaction ichida mavjud bo'lgan metodlar. */
type Tx = Prisma.TransactionClient;

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoryService,
  ) {}

  /* ======================================================================
     OMMAVIY KATALOG
     ====================================================================== */

  /**
   * Filtr paneli uchun MAVJUD qiymatlar: ranglar, hajmlar, narx chegarasi.
   *
   * Ro'yxat qo'lda yozilmaydi va yozilmasligi kerak. aliver.com da rang
   * filtri bor, bizda esa ranglar variantlarning `options` JSON ida
   * yotibdi — agar filtrga qo'lda ro'yxat yozilsa, yangi rang qo'shilgan
   * kuni u filtrda ko'rinmay qoladi va buni hech kim sezmaydi.
   *
   * Shuning uchun ro'yxat har doim BAZADAN chiqadi. Kategoriya yoki
   * kolleksiya berilsa, faqat o'sha bo'limdagi ranglar qaytadi — 500 ta
   * mahsulotning hamma rangini tirnoq bo'limida ko'rsatish foydasiz.
   */
  async publicFacets(query: { category?: string; collection?: string }) {
    const productWhere: Record<string, unknown> = {
      deletedAt: null,
      status: 'ACTIVE',
      isSample: false,
    };
    if (query.category) {
      const ids = await this.categories.descendantIds(query.category);
      productWhere.categories = { some: { categoryId: { in: ids } } };
    }
    if (query.collection) {
      productWhere.collections = { some: { collection: { slug: query.collection } } };
    }

    const [variants, brandRows] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { isActive: true, deletedAt: null, product: productWhere },
        select: { options: true, price: true },
      }),
      // Shu bo'limda haqiqatan mahsuloti bor brendlar.
      this.prisma.product.groupBy({
        by: ['brandId'],
        where: productWhere,
        _count: { _all: true },
      }),
    ]);

    const brandIds = brandRows.map((b) => b.brandId).filter((id): id is string => Boolean(id));
    // Tur aniq yoziladi: bo'sh massiv shoxi tufayli u `{}[]` bo'lib
    // chiqardi va `b.slug` ni TypeScript ko'rmasdi.
    type BrandRow = { id: string; slug: string; name: string };
    const brandNames: BrandRow[] = brandIds.length
      ? ((await this.prisma.brand.findMany({
          where: { id: { in: brandIds } },
          select: { id: true, slug: true, name: true },
        })) as BrandRow[])
      : [];
    const brandById = new Map(brandNames.map((b) => [b.id, b]));
    const brands = brandRows
      .map((row) => {
        const b = row.brandId ? brandById.get(row.brandId) : undefined;
        return b ? { slug: b.slug, name: b.name, count: row._count._all } : null;
      })
      .filter((b): b is { slug: string; name: string; count: number } => b !== null)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const colors = new Map<string, number>();
    const sizes = new Map<string, number>();
    let min: bigint | null = null;
    let max: bigint | null = null;

    for (const v of variants) {
      const o = (v.options ?? {}) as Record<string, unknown>;
      const color = typeof o.color === 'string' ? o.color.trim() : '';
      const size = typeof o.size === 'string' ? o.size.trim() : '';
      if (color) colors.set(color, (colors.get(color) ?? 0) + 1);
      if (size) sizes.set(size, (sizes.get(size) ?? 0) + 1);
      if (min === null || v.price < min) min = v.price;
      if (max === null || v.price > max) max = v.price;
    }

    const sorted = (m: Map<string, number>) =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 40)
        .map(([value, count]) => ({ value, count }));

    return {
      brands,
      colors: sorted(colors),
      sizes: sorted(sizes),
      // Tiyinda emas, SO'MDA: filtr maydonlariga mijoz so'm yozadi.
      minPrice: min === null ? 0 : Number(min / 100n),
      maxPrice: max === null ? 0 : Number(max / 100n),
    };
  }

  async publicList(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    // Namuna katalogda KO'RINMAYDI: u alohida sotilmaydi va faqat
    // savatdagi sovg'a tanlovida chiqadi. `status = HIDDEN` bu yerda
    // yetarli emas edi — yashirin mahsulot savatda ham ko'rinmasligi
    // kerak, namuna esa aynan o'sha yerda kerak.
    const where: Record<string, unknown> = { deletedAt: null, status: 'ACTIVE', isSample: false };

    if (query.category) {
      const ids = await this.categories.descendantIds(query.category);
      where.categories = { some: { categoryId: { in: ids } } };
    }
    if (query.collection) {
      where.collections = { some: { collection: { slug: query.collection } } };
    }
    if (query.brand && query.brand.length > 0) {
      where.brand = { slug: { in: query.brand } };
    }
    if (query.tags && query.tags.length > 0) {
      where.tags = { some: { tag: { slug: { in: query.tags } } } };
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.minPrice = {
        ...(query.minPrice !== undefined ? { gte: sumToTiyin(query.minPrice) } : {}),
        ...(query.maxPrice !== undefined ? { lte: sumToTiyin(query.maxPrice) } : {}),
      };
    }
    if (query.inStock) where.inStock = true;
    if (query.onSale) where.hasSale = true;
    if (query.minRating !== undefined) where.ratingAvg = { gte: query.minRating };

    /*
     * Variant xossalari bo'yicha filtr: hajm va rang.
     *
     * Ikkalasi ham `options` JSON ichida: {"size": "60 ml", "color": "Coral"}.
     *
     * Ular BITTA `where.variants` da yig'iladi va bu ataylab shunday.
     * Ilgari hajm filtri `where.variants = {...}` deb YOZARDI; rang
     * filtri ham xuddi shunday yozilsa, ikkinchisi birinchisini jimgina
     * o'chirib yuborardi — foydalanuvchi ikkita filtr belgilaydi, sayt
     * esa faqat bittasini qo'llaydi va buni hech narsa ko'rsatmaydi.
     *
     * `AND` ishlatilgani ham muhim: bitta variant HAM tanlangan hajmda,
     * HAM tanlangan rangda bo'lishi shart emas — mahsulotda ikkalasi
     * ham bo'lsa yetarli.
     */
    const variantFilters: Array<Record<string, unknown>> = [];
    if (query.volume && query.volume.length > 0) {
      variantFilters.push({
        some: {
          isActive: true,
          deletedAt: null,
          OR: query.volume.map((v) => ({ options: { path: ['size'], equals: v } })),
        },
      });
    }
    if (query.color && query.color.length > 0) {
      variantFilters.push({
        some: {
          isActive: true,
          deletedAt: null,
          OR: query.color.map((c) => ({ options: { path: ['color'], equals: c } })),
        },
      });
    }
    /*
     * `AND` ga hamma shart QO'SHILADI, o'rniga yozilmaydi.
     *
     * Ilgari qidiruv `where.AND = tokens.map(...)` deb yozardi. Agar
     * mijoz bir vaqtda qidiruv VA variant filtrini ishlatsa, qidiruv
     * variant filtrlarini jimgina o'chirib yuborardi. Shuning uchun
     * bu yerda faqat `push` bor.
     */
    const and: Array<Record<string, unknown>> = variantFilters.map((v) => ({ variants: v }));

    if (query.q) {
      const tokens = searchTokens(query.q);
      if (tokens.length > 0) {
        for (const t of tokens) and.push({ searchText: { contains: t } });
      } else {
        /*
         * So'rov berilgan, lekin undan birorta ham qidiriladigan
         * bo'lak chiqmadi (masalan "3", "!!!", yoki apostrof olib
         * tashlangandan keyin bitta harf qolgan "o'").
         *
         * Ilgari bunday holatda `q` JIMGINA tashlab yuborilardi va
         * mijoz "Natijalar: 120" degan yozuv bilan BUTUN katalogni
         * ko'rardi — go'yo hammasi so'roviga mos kelgandek.
         *
         * To'g'ri javob — hech narsa topilmadi.
         */
        and.push({ id: '00000000-0000-0000-0000-000000000000' });
      }
    }

    if (and.length > 0) where.AND = and;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.product.count({ where: where as never }),
      this.prisma.product.findMany({
        where: where as never,
        orderBy: this.orderBy(query.sort),
        skip: (page - 1) * perPage,
        take: perPage,
        select: this.cardSelect(),
      }),
    ]);

    // Aniq moslik topilmasa — imlo xatosi bo'lishi mumkin, trigram bilan urinamiz.
    if (total === 0 && query.q && normalizeSearch(query.q).length >= 4) {
      const fuzzy = await this.fuzzySearch(query.q, perPage);
      if (fuzzy.length > 0) {
        return {
          items: fuzzy.map((p) => this.toCard(p)),
          total: fuzzy.length,
          page: 1,
          perPage,
          fuzzy: true,
        };
      }
    }

    return { items: rows.map((p) => this.toCard(p)), total, page, perPage, fuzzy: false };
  }

  /** Avtoto'ldirish (TZ 23). Nom, SKU, barcode va tarkib bo'yicha. */
  async suggest(q: string, limit = 8) {
    const tokens = searchTokens(q, 1);
    if (tokens.length === 0) return { items: [] };

    const rows = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        isSample: false,
        AND: tokens.map((t) => ({ searchText: { contains: t } })),
      },
      take: limit,
      orderBy: [{ salesCount: 'desc' }, { ratingCount: 'desc' }],
      select: {
        id: true,
        slug: true,
        nameUz: true,
        nameRu: true,
        minPrice: true,
        images: { where: { kind: 'MAIN' }, take: 1, select: { url: true, urlWebp: true } },
        categories: {
          take: 1,
          select: { category: { select: { nameUz: true, nameRu: true, slug: true } } },
        },
      },
    });

    return {
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        nameUz: r.nameUz,
        nameRu: r.nameRu,
        price: r.minPrice.toString(),
        imageUrl: r.images[0]?.urlWebp ?? r.images[0]?.url ?? null,
        category: r.categories[0]?.category ?? null,
      })),
    };
  }

  async publicDetail(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null, isSample: false, status: { in: ['ACTIVE', 'OUT_OF_STOCK'] } },
      include: {
        brand: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { deletedAt: null, isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            inventory: {
              select: { totalStock: true, reservedStock: true, lowStockThreshold: true },
            },
          },
        },
        categories: {
          include: {
            category: { select: { id: true, slug: true, nameUz: true, nameRu: true, path: true } },
          },
        },
        collections: {
          include: { collection: { select: { slug: true, nameUz: true, nameRu: true } } },
        },
        tags: { include: { tag: { select: { slug: true, nameUz: true, nameRu: true } } } },
        relatedFrom: {
          include: { to: { select: this.cardSelect() } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    const primary = product.categories.find((c) => c.isPrimary) ?? product.categories[0];
    const breadcrumb = primary ? await this.categories.breadcrumb(primary.categoryId) : [];

    const now = new Date();
    const variants = product.variants.map((v) => {
      const inv = v.inventory[0];
      const available = inv ? Math.max(inv.totalStock - inv.reservedStock, 0) : 0;
      const price = effectivePrice(v, now);
      return {
        id: v.id,
        sku: v.sku,
        barcode: v.barcode,
        options: v.options,
        price: price.price.toString(),
        oldPrice: price.oldPrice?.toString() ?? null,
        discountPercent: price.discountPercent,
        onSale: price.onSale,
        weightGrams: v.weightGrams,
        volumeMl: v.volumeMl,
        availableStock: available,
        lowStock: inv ? available > 0 && available <= inv.lowStockThreshold : false,
      };
    });

    return {
      id: product.id,
      slug: product.slug,
      nameUz: product.nameUz,
      nameRu: product.nameRu,
      brand: product.brand ? { name: product.brand.name, slug: product.brand.slug } : null,
      shortDescUz: product.shortDescUz,
      shortDescRu: product.shortDescRu,
      descUz: product.descUz,
      descRu: product.descRu,
      benefitsUz: product.benefitsUz,
      benefitsRu: product.benefitsRu,
      ingredientsUz: product.ingredientsUz,
      ingredientsRu: product.ingredientsRu,
      // Uchta asosiy tarkib va isbot qatori — TZ-3, 2.3.
      keyIngredients: (product as { keyIngredients?: unknown }).keyIngredients ?? null,
      claimUz: (product as { claimUz?: string | null }).claimUz ?? null,
      claimRu: (product as { claimRu?: string | null }).claimRu ?? null,
      howToUseUz: product.howToUseUz,
      howToUseRu: product.howToUseRu,
      warningsUz: product.warningsUz,
      warningsRu: product.warningsRu,
      countryOfOrigin: product.countryOfOrigin,
      manufacturer: product.manufacturer,
      shelfLifeMonths: product.shelfLifeMonths,
      ratingAvg: product.ratingAvg,
      ratingCount: product.ratingCount,
      seo: {
        titleUz: product.seoTitleUz,
        titleRu: product.seoTitleRu,
        descUz: product.seoDescUz,
        descRu: product.seoDescRu,
      },
      images: product.images.map((i) => ({
        id: i.id,
        kind: i.kind,
        url: i.urlWebp ?? i.url,
        urlAvif: i.urlAvif,
        altUz: i.altUz,
        altRu: i.altRu,
        variantId: i.variantId,
      })),
      variants,
      categories: product.categories.map((c) => c.category),
      collections: product.collections.map((c) => c.collection),
      tags: product.tags.map((t) => t.tag),
      breadcrumb,
      related: product.relatedFrom.map((r) => this.toCard(r.to as never)),
    };
  }

  /* ======================================================================
     ADMIN
     ====================================================================== */

  async adminList(query: AdminProductQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 30;

    const onlyDeleted = query.deleted === '1' || query.deleted === 'true';
    const where: Record<string, unknown> = onlyDeleted
      ? { deletedAt: { not: null } }
      : { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.categoryId) where.categories = { some: { categoryId: query.categoryId } };
    if (query.q) {
      const tokens = searchTokens(query.q, 1);
      if (tokens.length > 0) where.AND = tokens.map((t) => ({ searchText: { contains: t } }));
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.product.count({ where: where as never }),
      this.prisma.product.findMany({
        where: where as never,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          slug: true,
          nameUz: true,
          nameRu: true,
          status: true,
          ikpuCode: true,
          vatRate: true,
          minPrice: true,
          maxPrice: true,
          hasSale: true,
          inStock: true,
          updatedAt: true,
          deletedAt: true,
          images: { where: { kind: 'MAIN' }, take: 1, select: { url: true, urlWebp: true } },
          _count: { select: { variants: true } },
        },
      }),
    ]);

    return {
      items: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        nameUz: r.nameUz,
        nameRu: r.nameRu,
        status: r.status,
        ikpuCode: r.ikpuCode,
        vatRate: r.vatRate,
        minPrice: r.minPrice.toString(),
        maxPrice: r.maxPrice.toString(),
        hasSale: r.hasSale,
        inStock: r.inStock,
        variantsCount: r._count.variants,
        imageUrl: r.images[0]?.urlWebp ?? r.images[0]?.url ?? null,
        updatedAt: r.updatedAt,
        deletedAt: r.deletedAt,
      })),
      total,
      page,
      perPage,
    };
  }

  async adminGet(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        variants: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
        categories: true,
        collections: true,
        tags: { include: { tag: true } },
      },
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');
    return product;
  }

  async create(dto: UpsertProductDto) {
    this.assertVariants(dto.variants);
    await this.assertSkusFree(dto.variants.map((v) => v.sku));

    const slug = await this.resolveSlug(dto.slug ?? dto.nameUz);
    const warehouse = await this.defaultWarehouse();

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...this.productData(dto),
          slug,
          searchText: '',
        },
      });

      await this.syncRelations(tx, created.id, dto);

      for (const [i, v] of dto.variants.entries()) {
        const variant = await tx.productVariant.create({
          data: { ...this.variantData(v), productId: created.id, sortOrder: v.sortOrder ?? i },
        });
        // Ombor yozuvi darrov yaratiladi: qoldiq 0, 3-etapda harakatlar bilan to'ladi.
        await tx.inventory.create({
          data: { variantId: variant.id, warehouseId: warehouse.id, totalStock: 0 },
        });
      }

      return created;
    });

    await this.recomputeFacets(product.id);
    return this.adminGet(product.id);
  }

  async update(id: string, dto: UpsertProductDto) {
    const current = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { variants: { where: { deletedAt: null } } },
    });
    if (!current) throw new NotFoundException('Mahsulot topilmadi');

    this.assertVariants(dto.variants);
    const keptIds = dto.variants.map((v) => v.id).filter(Boolean) as string[];
    await this.assertSkusFree(
      dto.variants.map((v) => v.sku),
      current.variants.map((v) => v.id),
    );

    const slug =
      dto.slug && dto.slug !== current.slug ? await this.resolveSlug(dto.slug, id) : current.slug;
    const warehouse = await this.defaultWarehouse();

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data: { ...this.productData(dto), slug } });
      await this.syncRelations(tx, id, dto);

      // Ro'yxatga kirmagan variantlar soft delete qilinadi — buyurtmalarda
      // ular havola bo'lib qolgan bo'lishi mumkin, shuning uchun o'chirilmaydi.
      const toArchive = current.variants.filter((v) => !keptIds.includes(v.id));
      for (const v of toArchive) {
        await tx.productVariant.update({
          where: { id: v.id },
          data: {
            deletedAt: new Date(),
            isActive: false,
            sku: `${v.sku}--del-${Date.now().toString(36)}`,
          },
        });
      }

      for (const [i, v] of dto.variants.entries()) {
        if (v.id) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: { ...this.variantData(v), sortOrder: v.sortOrder ?? i },
          });
        } else {
          const variant = await tx.productVariant.create({
            data: { ...this.variantData(v), productId: id, sortOrder: v.sortOrder ?? i },
          });
          await tx.inventory.create({
            data: { variantId: variant.id, warehouseId: warehouse.id, totalStock: 0 },
          });
        }
      }
    });

    await this.recomputeFacets(id);
    return this.adminGet(id);
  }

  /** Soft delete: TZ 100 — mahsulot "Trash" ga tushadi, slug bo'shaydi. */
  async remove(id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, deletedAt: null } });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    return this.prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'ARCHIVED',
        slug: archivedSlug(product.slug),
      },
    });
  }

  async restore(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: { not: null } },
    });
    if (!product) throw new NotFoundException('O‘chirilgan mahsulot topilmadi');

    const slug = await this.resolveSlug(product.slug.replace(/--deleted-.*$/, ''), id);
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: null, status: 'DRAFT', slug },
    });
  }

  /** TZ 99 — bir nechta mahsulot ustida guruh amallari. */
  async bulkStatus(ids: string[], status: string) {
    if (ids.length === 0) throw new BadRequestException('Mahsulot tanlanmagan');
    const result = await this.prisma.product.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: {
        status: status as never,
        ...(status === 'ACTIVE' ? { publishedAt: new Date() } : {}),
      },
    });
    return { updated: result.count };
  }

  /* ======================================================================
     DENORMALLASHTIRILGAN MAYDONLAR
     ====================================================================== */

  /**
   * Variantlardan minPrice/maxPrice/hasSale/inStock va searchText ni qayta hisoblaydi.
   * Mahsulot yoki variant har o'zgarganda chaqiriladi.
   */
  async recomputeFacets(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        brand: true,
        tags: { include: { tag: true } },
        variants: {
          where: { deletedAt: null, isActive: true },
          include: { inventory: { select: { totalStock: true, reservedStock: true } } },
        },
      },
    });
    if (!product) return;

    const now = new Date();
    const prices = product.variants.map((v) => effectivePrice(v, now));
    const min = prices.length > 0 ? prices.reduce((a, b) => (b.price < a.price ? b : a)).price : 0n;
    const max = prices.length > 0 ? prices.reduce((a, b) => (b.price > a.price ? b : a)).price : 0n;
    const hasSale = prices.some((p) => p.onSale);
    const inStock = product.variants.some((v) =>
      v.inventory.some((i) => i.totalStock - i.reservedStock > 0),
    );

    const searchText = buildProductSearchText({
      nameUz: product.nameUz,
      nameRu: product.nameRu,
      nameEn: product.nameEn,
      brand: product.brand?.name ?? null,
      skus: product.variants.map((v) => v.sku),
      barcodes: product.variants.map((v) => v.barcode),
      tags: product.tags.flatMap((t) => [t.tag.nameUz, t.tag.nameRu, t.tag.slug]),
      ingredientsUz: product.ingredientsUz,
      ingredientsRu: product.ingredientsRu,
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: { minPrice: min, maxPrice: max, hasSale, inStock, searchText },
    });
  }

  /* ======================================================================
     yordamchi
     ====================================================================== */

  private orderBy(sort?: SortOption) {
    switch (sort) {
      case SortOption.NEWEST:
        return [{ publishedAt: 'desc' as const }, { createdAt: 'desc' as const }];
      case SortOption.PRICE_ASC:
        return [{ minPrice: 'asc' as const }];
      case SortOption.PRICE_DESC:
        return [{ minPrice: 'desc' as const }];
      case SortOption.RATING:
        return [{ ratingAvg: 'desc' as const }, { ratingCount: 'desc' as const }];
      case SortOption.BEST_SELLING:
        return [{ salesCount: 'desc' as const }];
      case SortOption.POPULAR:
      default:
        return [
          { isFeatured: 'desc' as const },
          { salesCount: 'desc' as const },
          { ratingCount: 'desc' as const },
        ];
    }
  }

  private cardSelect() {
    return {
      id: true,
      slug: true,
      nameUz: true,
      nameRu: true,
      // Bir qatorli izoh — "bu nima" degan savolga kartochkaning o'zida
      // javob beradi; aks holda mijoz bilish uchun bosishi kerak.
      shortDescUz: true,
      shortDescRu: true,
      ratingAvg: true,
      ratingCount: true,
      minPrice: true,
      hasSale: true,
      inStock: true,
      isFeatured: true,
      publishedAt: true,
      images: {
        // IKKITA rasm: ikkinchisi hover'da almashadi. `kind` cheklovi
        // olib tashlandi — ko'p mahsulotda faqat bitta MAIN rasm bor,
        // ikkinchi kadr esa odatda boshqa turda saqlanadi.
        take: 2,
        orderBy: { sortOrder: 'asc' as const },
        select: { url: true, urlWebp: true, altUz: true, altRu: true },
      },
      _count: { select: { variants: true } },
      variants: {
        where: { deletedAt: null, isActive: true },
        select: {
          price: true,
          oldPrice: true,
          saleStartsAt: true,
          saleEndsAt: true,
          inventory: { select: { totalStock: true, reservedStock: true, lowStockThreshold: true } },
        },
      },
    };
  }

  private toCard(p: {
    id: string;
    slug: string;
    nameUz: string;
    nameRu: string;
    shortDescUz?: string | null;
    shortDescRu?: string | null;
    ratingAvg: number;
    ratingCount: number;
    minPrice: bigint;
    isFeatured: boolean;
    publishedAt: Date | null;
    _count?: { variants: number };
    images: Array<{
      url: string;
      urlWebp: string | null;
      altUz: string | null;
      altRu: string | null;
    }>;
    variants: Array<{
      price: bigint;
      oldPrice: bigint | null;
      saleStartsAt: Date | null;
      saleEndsAt: Date | null;
      inventory: Array<{ totalStock: number; reservedStock: number; lowStockThreshold: number }>;
    }>;
  }) {
    const now = new Date();
    const price = minVariantPrice(p.variants, now);
    const available = p.variants.reduce(
      (sum, v) =>
        sum + v.inventory.reduce((s, i) => s + Math.max(i.totalStock - i.reservedStock, 0), 0),
      0,
    );
    const threshold = p.variants[0]?.inventory[0]?.lowStockThreshold ?? 10;

    return {
      id: p.id,
      slug: p.slug,
      nameUz: p.nameUz,
      nameRu: p.nameRu,
      price: (price?.price ?? p.minPrice).toString(),
      oldPrice: price?.oldPrice?.toString() ?? null,
      discountPercent: price?.discountPercent ?? 0,
      ratingAvg: p.ratingAvg,
      ratingCount: p.ratingCount,
      availableStock: available,
      shortUz: p.shortDescUz ?? null,
      shortRu: p.shortDescRu ?? null,
      // Variant soni kosmetikada bosishga sabab: "16 ta soya" ni
      // mahsulot sahifasiga yashirish bosishlarni yo'qotadi.
      variantsCount: p._count?.variants ?? p.variants.length,
      imageUrl: p.images[0]?.urlWebp ?? p.images[0]?.url ?? null,
      // Ikkinchi rasm bo'lmasa `null` — kartochka hover'da o'zgarmaydi,
      // lekin buzilmaydi ham.
      imageHoverUrl: p.images[1]?.urlWebp ?? p.images[1]?.url ?? null,
      imageAltUz: p.images[0]?.altUz ?? null,
      imageAltRu: p.images[0]?.altRu ?? null,
      badges: productBadges(
        {
          publishedAt: p.publishedAt,
          isFeatured: p.isFeatured,
          onSale: price?.onSale ?? false,
          availableStock: available,
          lowStockThreshold: threshold,
        },
        now,
      ),
    };
  }

  /**
   * Imlo xatosiga chidamli qidiruv. pg_trgm kengaytmasi migratsiyada
   * yoqiladi; indeks bo'lmasa ham ishlaydi, faqat sekinroq.
   */
  private async fuzzySearch(q: string, limit: number) {
    const needle = normalizeSearch(q);
    const ids = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM products
      WHERE "deletedAt" IS NULL AND status = 'ACTIVE'
        AND similarity("searchText", ${needle}) > 0.25
      ORDER BY similarity("searchText", ${needle}) DESC
      LIMIT ${limit}
    `;
    if (ids.length === 0) return [];
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
      select: this.cardSelect(),
    });
    // Tartib SQL da similarity bo'yicha chiqqan — Prisma uni saqlamaydi,
    // shuning uchun natijani qo'lda qayta tartiblaymiz.
    const order = new Map<string, number>(ids.map((r, i): [string, number] => [r.id, i]));
    return rows.sort(
      (a: { id: string }, b: { id: string }) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );
  }

  private assertVariants(variants: UpsertVariantDto[]): void {
    if (!variants || variants.length === 0) {
      throw new BadRequestException('Mahsulotda kamida bitta variant bo‘lishi kerak');
    }
    const skus = variants.map((v) => v.sku.trim().toUpperCase());
    if (new Set(skus).size !== skus.length) {
      throw new BadRequestException('SKU lar takrorlanmasligi kerak');
    }
    for (const v of variants) {
      if (v.oldPrice !== undefined && v.oldPrice > 0 && v.oldPrice <= v.price) {
        throw new BadRequestException(`"${v.sku}": eski narx joriy narxdan yuqori bo‘lishi kerak`);
      }
      if (v.saleStartsAt && v.saleEndsAt && new Date(v.saleStartsAt) >= new Date(v.saleEndsAt)) {
        throw new BadRequestException(
          `"${v.sku}": aksiya boshlanish sanasi tugash sanasidan keyin`,
        );
      }
    }
  }

  private async assertSkusFree(skus: string[], ownVariantIds: string[] = []): Promise<void> {
    const clash = await this.prisma.productVariant.findFirst({
      where: {
        sku: { in: skus },
        deletedAt: null,
        ...(ownVariantIds.length > 0 ? { NOT: { id: { in: ownVariantIds } } } : {}),
      },
      select: { sku: true },
    });
    if (clash) throw new ConflictException(`SKU band: ${clash.sku}`);
  }

  private async resolveSlug(desired: string, excludeId?: string): Promise<string> {
    const rows = await this.prisma.product.findMany({
      where: { deletedAt: null, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { slug: true },
    });
    return uniqueSlug(desired, new Set(rows.map((r) => r.slug)));
  }

  private async defaultWarehouse() {
    const wh = await this.prisma.warehouse.findFirst({
      where: { isActive: true },
      orderBy: { isDefault: 'desc' },
    });
    if (!wh) throw new BadRequestException('Ombor topilmadi. Avval seed ni ishga tushiring.');
    return wh;
  }

  private productData(dto: UpsertProductDto) {
    return {
      nameUz: dto.nameUz.trim(),
      nameRu: dto.nameRu.trim(),
      nameEn: dto.nameEn ?? null,
      brandId: dto.brandId ?? null,
      shortDescUz: dto.shortDescUz ?? null,
      shortDescRu: dto.shortDescRu ?? null,
      descUz: dto.descUz ?? null,
      descRu: dto.descRu ?? null,
      benefitsUz: dto.benefitsUz ?? null,
      benefitsRu: dto.benefitsRu ?? null,
      ingredientsUz: dto.ingredientsUz,
      ingredientsRu: dto.ingredientsRu,
      // Bo'sh massiv bilan `null` ataylab farqlanmaydi: ikkalasi ham
      // "asosiy tarkib ko'rsatilmagan" degani va frontend bir xil ishlaydi.
      keyIngredients: (dto.keyIngredients && dto.keyIngredients.length > 0
        ? dto.keyIngredients
        : null) as never,
      claimUz: dto.claimUz?.trim() || null,
      claimRu: dto.claimRu?.trim() || null,
      howToUseUz: dto.howToUseUz ?? null,
      howToUseRu: dto.howToUseRu ?? null,
      warningsUz: dto.warningsUz,
      warningsRu: dto.warningsRu,
      countryOfOrigin: dto.countryOfOrigin ?? null,
      manufacturer: dto.manufacturer ?? null,
      shelfLifeMonths: dto.shelfLifeMonths ?? null,
      ikpuCode: dto.ikpuCode,
      vatRate: dto.vatRate ?? 12,
      unitCode: dto.unitCode ?? '1',
      status: (dto.status ?? 'DRAFT') as never,
      isFeatured: dto.isFeatured ?? false,
      publishedAt: dto.status === 'ACTIVE' ? new Date() : null,
      seoTitleUz: dto.seoTitleUz ?? null,
      seoTitleRu: dto.seoTitleRu ?? null,
      seoDescUz: dto.seoDescUz ?? null,
      seoDescRu: dto.seoDescRu ?? null,
    };
  }

  private variantData(v: UpsertVariantDto) {
    return {
      sku: v.sku.trim().toUpperCase(),
      barcode: v.barcode?.trim() ?? null,
      options: (v.options ?? {}) as never,
      price: sumToTiyin(v.price),
      oldPrice: v.oldPrice ? sumToTiyin(v.oldPrice) : null,
      costPrice: v.costPrice ? sumToTiyin(v.costPrice) : null,
      saleStartsAt: v.saleStartsAt ? new Date(v.saleStartsAt) : null,
      saleEndsAt: v.saleEndsAt ? new Date(v.saleEndsAt) : null,
      weightGrams: v.weightGrams ?? null,
      volumeMl: v.volumeMl ?? null,
      isActive: v.isActive ?? true,
    };
  }

  private async syncRelations(tx: Tx, productId: string, dto: UpsertProductDto): Promise<void> {
    const client = tx;

    await client.productCategory.deleteMany({ where: { productId } });
    if (dto.categoryIds?.length) {
      await client.productCategory.createMany({
        data: dto.categoryIds.map((categoryId, i) => ({
          productId,
          categoryId,
          isPrimary: i === 0,
        })),
        skipDuplicates: true,
      });
    }

    await client.collectionProduct.deleteMany({ where: { productId } });
    if (dto.collectionIds?.length) {
      await client.collectionProduct.createMany({
        data: dto.collectionIds.map((collectionId, i) => ({
          productId,
          collectionId,
          sortOrder: i,
        })),
        skipDuplicates: true,
      });
    }

    await client.productTag.deleteMany({ where: { productId } });
    if (dto.tagSlugs?.length) {
      for (const slug of dto.tagSlugs) {
        const tag = await client.tag.upsert({
          where: { slug },
          update: {},
          create: { slug, nameUz: slug, nameRu: slug },
        });
        await client.productTag.create({ data: { productId, tagId: tag.id } });
      }
    }
  }
}
