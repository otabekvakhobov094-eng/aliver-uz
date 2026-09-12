import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  NotFoundException,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Audit, RequirePermissions } from '../../common/decorators';
import {
  AdminProductQueryDto,
  UpsertBrandDto,
  UpsertCategoryDto,
  UpsertCollectionDto,
  UpsertProductDto,
} from './dto/catalog.dto';
import { slugify, uniqueSlug } from './slug.util';
import { CategoryService } from './category.service';
import { CollectionService } from './collection.service';
import { ProductService } from './product.service';
import { PrismaService } from '../../prisma/prisma.service';

/** Audit log "before" qiymatini so'rovga qo'yish uchun kengaytma. */
type AuditRequest = Request & { auditBefore?: unknown; auditRecordId?: string };

@ApiTags('admin-catalog')
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(
    private readonly categories: CategoryService,
    private readonly collections: CollectionService,
    private readonly products: ProductService,
    private readonly prisma: PrismaService,
  ) {}

  /* ------------------------------ Brendlar ------------------------------ */

  /**
   * Brendlar ro'yxati. Mahsulot formasidagi tanlov uchun kerak — ilgari
   * hech qanday endpoint yo'q edi va admin brendni umuman biriktira
   * olmasdi, garchi ma'lumotlar bazasida `brandId` bo'lsa ham.
   *
   * Ro'yxat kichik (o'nlab), shuning uchun sahifalash qo'yilmadi.
   */
  @Get('brands')
  @ApiOperation({ summary: 'Brendlar ro‘yxati' })
  @RequirePermissions('products.view')
  async brands() {
    const rows = await this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        // Mahsulot soni o'chirishdan oldin kerak: brend qaysidir
        // mahsulotda ishlatilayotgan bo'lsa, uni o'chirish katalogni
        // buzadi va buni foydalanuvchi OLDINDAN ko'rishi kerak.
        _count: { select: { products: true } },
      },
    });
    return rows.map(({ _count, ...b }) => ({ ...b, productCount: _count.products }));
  }

  @Post('brands')
  @RequirePermissions('products.create')
  @Audit('brands', 'create')
  async createBrand(@Body() dto: UpsertBrandDto) {
    const slug = await this.brandSlug(dto);
    return this.prisma.brand.create({
      data: { slug, name: dto.name.trim(), logoUrl: dto.logoUrl?.trim() || null },
    });
  }

  @Put('brands/:id')
  @RequirePermissions('products.update')
  @Audit('brands', 'update')
  async updateBrand(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertBrandDto) {
    const existing = await this.prisma.brand.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Brend topilmadi');
    const slug = await this.brandSlug(dto, id);
    return this.prisma.brand.update({
      where: { id },
      data: { slug, name: dto.name.trim(), logoUrl: dto.logoUrl?.trim() || null },
    });
  }

  /**
   * Brendni o'chirish. Mahsulotga biriktirilgan brend o'chirilmaydi —
   * `brandId` nullable bo'lgani uchun Prisma buni jimgina uzib qo'yishi
   * mumkin edi va katalogdagi 200 ta mahsulot brendsiz qolardi.
   */
  @Delete('brands/:id')
  @RequirePermissions('products.delete')
  @Audit('brands', 'delete')
  async deleteBrand(@Param('id', ParseUUIDPipe) id: string) {
    const used = await this.prisma.product.count({ where: { brandId: id, deletedAt: null } });
    if (used > 0) {
      throw new BadRequestException(
        `Bu brend ${used} ta mahsulotda ishlatilyapti. Avval ularning brendini almashtiring.`,
      );
    }
    await this.prisma.brand.delete({ where: { id } });
    return { ok: true as const };
  }

  /** Slug band bo'lsa oxiriga raqam qo'shiladi; o'zining slugi band hisoblanmaydi. */
  private async brandSlug(dto: UpsertBrandDto, selfId?: string) {
    const desired = dto.slug?.trim() || slugify(dto.name);
    const others = await this.prisma.brand.findMany({
      where: selfId ? { NOT: { id: selfId } } : undefined,
      select: { slug: true },
    });
    return uniqueSlug(desired, new Set(others.map((b) => b.slug)));
  }

  /* ---------------------------- Kategoriyalar ---------------------------- */

  @Get('categories')
  @RequirePermissions('categories.view')
  categoryTree() {
    return this.categories.tree({ activeOnly: false });
  }

  @Post('categories')
  @RequirePermissions('categories.create')
  @Audit('categories', 'create')
  @ApiOperation({ summary: 'Kategoriya yaratish (maksimal 3 daraja)' })
  createCategory(@Body() dto: UpsertCategoryDto) {
    return this.categories.create(dto);
  }

  @Put('categories/:id')
  @RequirePermissions('categories.update')
  @Audit('categories', 'update')
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertCategoryDto,
    @Req() req: AuditRequest,
  ) {
    req.auditBefore = await this.prisma.category.findUnique({ where: { id } });
    req.auditRecordId = id;
    return this.categories.update(id, dto);
  }

  @Delete('categories/:id')
  @RequirePermissions('categories.delete')
  @Audit('categories', 'delete')
  async removeCategory(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuditRequest) {
    req.auditBefore = await this.prisma.category.findUnique({ where: { id } });
    req.auditRecordId = id;
    return this.categories.remove(id);
  }

  /* ---------------------------- Kolleksiyalar ---------------------------- */

  @Get('collections')
  @RequirePermissions('collections.view')
  collectionList() {
    return this.collections.list(false);
  }

  @Post('collections')
  @RequirePermissions('collections.create')
  @Audit('collections', 'create')
  createCollection(@Body() dto: UpsertCollectionDto) {
    return this.collections.create(dto);
  }

  @Put('collections/:id')
  @RequirePermissions('collections.update')
  @Audit('collections', 'update')
  async updateCollection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertCollectionDto,
    @Req() req: AuditRequest,
  ) {
    req.auditBefore = await this.prisma.collection.findUnique({ where: { id } });
    req.auditRecordId = id;
    return this.collections.update(id, dto);
  }

  @Delete('collections/:id')
  @RequirePermissions('collections.delete')
  @Audit('collections', 'delete')
  removeCollection(@Param('id', ParseUUIDPipe) id: string) {
    return this.collections.remove(id);
  }

  @Get('collections/:id/products')
  @RequirePermissions('collections.view')
  collectionProducts(@Param('id', ParseUUIDPipe) id: string) {
    return this.collections.products(id);
  }

  @Put('collections/:id/products')
  @RequirePermissions('collections.update')
  @Audit('collections', 'set_products')
  setCollectionProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { productIds: string[] },
  ) {
    return this.collections.setProducts(id, body.productIds ?? []);
  }

  /* ------------------------------ Mahsulotlar ------------------------------ */

  @Get('products')
  @RequirePermissions('products.view')
  productList(@Query() query: AdminProductQueryDto) {
    return this.products.adminList(query);
  }

  @Get('products/:id')
  @RequirePermissions('products.view')
  productGet(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.adminGet(id);
  }

  @Post('products')
  @RequirePermissions('products.create')
  @Audit('products', 'create')
  @ApiOperation({
    summary: 'Mahsulot yaratish',
    description:
      'IKPU kodi, tarkib va ogohlantirishlar majburiy. Narxlar so‘mda yuboriladi, bazada tiyinda saqlanadi.',
  })
  createProduct(@Body() dto: UpsertProductDto) {
    return this.products.create(dto);
  }

  @Put('products/:id')
  @RequirePermissions('products.update')
  @Audit('products', 'update')
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertProductDto,
    @Req() req: AuditRequest,
  ) {
    req.auditBefore = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
    req.auditRecordId = id;
    return this.products.update(id, dto);
  }

  @Delete('products/:id')
  @RequirePermissions('products.delete')
  @Audit('products', 'delete')
  @ApiOperation({ summary: 'Trash ga ko‘chirish (TZ 100)' })
  async removeProduct(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuditRequest) {
    req.auditBefore = await this.prisma.product.findUnique({ where: { id } });
    req.auditRecordId = id;
    return this.products.remove(id);
  }

  @Post('products/:id/restore')
  @RequirePermissions('products.update')
  @Audit('products', 'restore')
  restoreProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.restore(id);
  }

  @Post('products/bulk/status')
  @RequirePermissions('products.update')
  @Audit('products', 'bulk_status')
  @ApiOperation({ summary: 'Guruh amali: statusni o‘zgartirish (TZ 99)' })
  bulkStatus(@Body() body: { ids: string[]; status: string }) {
    return this.products.bulkStatus(body.ids ?? [], body.status);
  }

  @Post('products/:id/recompute')
  @RequirePermissions('products.update')
  @ApiOperation({ summary: 'Narx va qidiruv maydonlarini qayta hisoblash' })
  async recompute(@Param('id', ParseUUIDPipe) id: string) {
    await this.products.recomputeFacets(id);
    return { ok: true };
  }
}
