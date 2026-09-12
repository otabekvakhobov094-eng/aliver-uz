import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CURATED_COLLECTIONS,
  TAXONOMY,
  brandSlug,
  TAG_RULES,
  categoryFor,
  collectionsFor,
  tagsFor,
  descriptionFrom,
  productTitle,
  roundPriceTiyin,
  sourceStock,
  previewRow,
  resolveSkus,
  stripHtml,
  toTiyin,
  type ShopifyProduct,
} from './shopify-catalog.util';

/** Bir sahifada nechta mahsulot so'raladi. */
const PAGE_LIMIT = 250;
/** Umumiy chegara: cheksiz sahifalash serverni bog'lab qo'yishi mumkin. */
const MAX_PRODUCTS = 3000;

@Injectable()
export class ShopifyImportService {
  private readonly logger = new Logger(ShopifyImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Manba do'kon manzilini tekshiradi.
   *
   * Manzil FOYDALANUVCHIDAN keladi, ya'ni u serverga ixtiyoriy so'rov
   * yubortirish vositasiga aylanishi mumkin (SSRF). Shuning uchun faqat
   * `https` va faqat ommaviy host qabul qilinadi: ichki tarmoq
   * manzillari rad etiladi.
   */
  private assertSafeUrl(raw: string): URL {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new BadRequestException('Manzil noto‘g‘ri. Masalan: https://www.aliverbeauty.eu');
    }
    if (url.protocol !== 'https:') {
      throw new BadRequestException('Faqat https manzil qabul qilinadi');
    }
    const host = url.hostname.toLowerCase();
    const blocked =
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.internal') ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
      host.includes(':');
    if (blocked) {
      throw new BadRequestException('Ichki tarmoq manzillari qabul qilinmaydi');
    }
    return url;
  }

  /** Shopify ning ochiq `products.json` idan katalogni yuklaydi. */
  async fetchCatalog(sourceUrl: string): Promise<ShopifyProduct[]> {
    const base = this.assertSafeUrl(sourceUrl);
    const products: ShopifyProduct[] = [];

    for (let page = 1; ; page += 1) {
      const url = new URL('/products.json', base);
      url.searchParams.set('limit', String(PAGE_LIMIT));
      url.searchParams.set('page', String(page));

      let res: Response;
      try {
        res = await fetch(url.toString(), {
          headers: { accept: 'application/json', 'user-agent': 'ALIVER.UZ catalog import/1.0' },
          signal: AbortSignal.timeout(30_000),
        });
      } catch (e) {
        throw new BadRequestException(
          `Do‘konga ulanib bo‘lmadi: ${e instanceof Error ? e.message : 'noma’lum xato'}`,
        );
      }
      if (!res.ok) {
        throw new BadRequestException(
          `Do‘kon ${res.status} qaytardi. Bu manzilda Shopify katalogi bormi?`,
        );
      }

      const body = (await res.json()) as { products?: ShopifyProduct[] };
      const batch = body.products ?? [];
      products.push(...batch);

      if (batch.length < PAGE_LIMIT) break;
      if (products.length >= MAX_PRODUCTS) {
        this.logger.warn(`Import chegarasi: ${MAX_PRODUCTS} ta mahsulotdan keyin to‘xtatildi`);
        break;
      }
    }
    return products;
  }

  /**
   * KO'RIB CHIQISH — hech narsa yozilmaydi.
   *
   * Bu ataylab alohida amal. 500 ta mahsulotni ko'r-ko'rona yozib
   * qo'yish va keyin qo'lda tozalash admin panel qiladigan ish emas.
   */
  async preview(sourceUrl: string, usdToUzs: number) {
    const products = await this.fetchCatalog(sourceUrl);
    const rows = products.map((p) => previewRow(p, usdToUzs));

    const brands = new Map<string, number>();
    const categories = new Map<string, number>();
    for (const p of products) {
      const b = brandSlug(p.vendor).name;
      brands.set(b, (brands.get(b) ?? 0) + 1);
      const c = categoryFor(p).nameUz;
      categories.set(c, (categories.get(c) ?? 0) + 1);
    }

    // Qaysi mahsulotlar YANGI, qaysilari yangilanadi — bu eng muhim
    // savol va uni import qilmasdan turib bilish kerak.
    const handles = products.map((p) => p.handle);
    const existing = await this.prisma.product.findMany({
      where: { slug: { in: handles } },
      select: { slug: true },
    });
    const known = new Set(existing.map((p) => p.slug));

    return {
      sourceUrl,
      usdToUzs,
      total: products.length,
      willCreate: handles.filter((h) => !known.has(h)).length,
      willUpdate: handles.filter((h) => known.has(h)).length,
      images: products.reduce((sum, p) => sum + (p.images?.length ?? 0), 0),
      variants: products.reduce((sum, p) => sum + p.variants.length, 0),
      brands: [...brands.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      categories: [...categories.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      sample: rows.slice(0, 25),
    };
  }

  /**
   * IMPORT — bazaga yozadi.
   *
   * Har bir mahsulot O'Z tranzaksiyasida yoziladi. Hammasini bitta
   * tranzaksiyaga solish jozibali ko'rinadi («yo hammasi, yo hech
   * narsa»), lekin amalda 500 ta mahsulot uchun u soatlab qulf ushlab
   * turadi va bitta buzuq yozuv butun ishni bekor qiladi. Muvaffaqiyatsiz
   * mahsulot O'TKAZIB YUBORILADI va xatosi jurnalga tushadi.
   */
  async run(params: {
    sourceUrl: string;
    usdToUzs: number;
    warehouseCode: string;
    defaultIkpu: string;
    adminId?: string;
  }) {
    const { sourceUrl, usdToUzs, warehouseCode, defaultIkpu, adminId } = params;
    if (!Number.isFinite(usdToUzs) || usdToUzs <= 0) {
      throw new BadRequestException('USD → UZS kursi ko‘rsatilishi shart');
    }

    const warehouse = await this.prisma.warehouse.findUnique({ where: { code: warehouseCode } });
    if (!warehouse) throw new BadRequestException(`Ombor topilmadi: ${warehouseCode}`);

    const products = await this.fetchCatalog(sourceUrl);
    const skuByVariant = resolveSkus(products);

    const job = await this.prisma.importJob.create({
      data: {
        kind: 'SHOPIFY',
        mode: 'CREATE_AND_UPDATE',
        fileName: sourceUrl,
        adminId: adminId ?? null,
        totalRows: products.length,
        status: 'PENDING',
      },
      select: { id: true },
    });

    // Kategoriya va kolleksiyalar — bir marta.
    const categoryIds = new Map<string, string>();
    for (const [sortOrder, item] of TAXONOMY.entries()) {
      const row = await this.prisma.category.upsert({
        where: { slug: item.slug },
        update: { nameUz: item.nameUz, nameRu: item.nameRu, sortOrder, isActive: true },
        create: {
          slug: item.slug,
          nameUz: item.nameUz,
          nameRu: item.nameRu,
          sortOrder,
          isActive: true,
          depth: 0,
        },
        select: { id: true },
      });
      categoryIds.set(item.slug, row.id);
    }

    const collectionIds = new Map<string, string>();
    for (const [sortOrder, item] of CURATED_COLLECTIONS.entries()) {
      const row = await this.prisma.collection.upsert({
        where: { slug: item.slug },
        update: { nameUz: item.nameUz, nameRu: item.nameRu, sortOrder, isActive: true, deletedAt: null },
        create: { slug: item.slug, nameUz: item.nameUz, nameRu: item.nameRu, sortOrder, isActive: true },
        select: { id: true },
      });
      collectionIds.set(item.slug, row.id);
    }

    /*
     * Teglar.
     *
     * Ilgari importer teg umuman yaratmasdi. Natijada bosh sahifadagi
     * «Vosita tanlash» — uch savolli tanlagich — qaysi javob berilsa
     * ham BO'SH ro'yxat ochardi: u `?tags=namlantirish` bilan
     * filtrlaydi, bazada esa bunday teg yo'q edi. Xato chiqmagani
     * uchun buni hech kim nosozlik deb aytmagan.
     */
    const tagIds = new Map<string, string>();
    for (const item of TAG_RULES) {
      const row = await this.prisma.tag.upsert({
        where: { slug: item.slug },
        update: { nameUz: item.nameUz, nameRu: item.nameRu },
        create: { slug: item.slug, nameUz: item.nameUz, nameRu: item.nameRu },
        select: { id: true },
      });
      tagIds.set(item.slug, row.id);
    }

    const brandIds = new Map<string, string>();
    const brandFor = async (vendor?: string | null) => {
      const { slug, name } = brandSlug(vendor);
      const cached = brandIds.get(slug);
      if (cached) return cached;
      const row = await this.prisma.brand.upsert({
        // Mavjud brend nomiga TEGILMAYDI: adminda to'g'rilangan yozuv
        // keyingi importda yo'qolmasligi kerak.
        where: { slug },
        update: {},
        create: { slug, name },
        select: { id: true },
      });
      brandIds.set(slug, row.id);
      return row.id;
    };

    let created = 0;
    let updated = 0;
    const errors: Array<{ row: number; column: string; message: string }> = [];

    for (const [index, product] of products.entries()) {
      try {
        const brandId = await brandFor(product.vendor);
        const existed = await this.prisma.product.findUnique({
          where: { slug: product.handle },
          select: { id: true },
        });
        await this.importOne(product, {
          brandId,
          warehouseId: warehouse.id,
          categoryIds,
          collectionIds,
          tagIds,
          usdToUzs,
          defaultIkpu,
          skuByVariant,
        });
        if (existed) updated += 1;
        else created += 1;
      } catch (e) {
        errors.push({
          row: index + 1,
          column: product.handle,
          message: e instanceof Error ? e.message : 'noma’lum xato',
        });
        this.logger.warn(`Import xatosi (${product.handle}): ${String(e)}`);
      }
    }

    await this.prisma.importJob.update({
      where: { id: job.id },
      data: {
        createdRows: created,
        updatedRows: updated,
        errorRows: errors.length,
        // Jurnal cheksiz o'smasin: birinchi 100 tasi yetarli.
        errors: errors.slice(0, 100),
        status: errors.length === products.length && products.length > 0 ? 'FAILED' : 'DONE',
        finishedAt: new Date(),
      },
    });

    return {
      jobId: job.id,
      total: products.length,
      created,
      updated,
      failed: errors.length,
      brands: [...brandIds.keys()],
      errors: errors.slice(0, 20),
    };
  }

  private async importOne(
    product: ShopifyProduct,
    ctx: {
      brandId: string;
      warehouseId: string;
      categoryIds: Map<string, string>;
      collectionIds: Map<string, string>;
      tagIds: Map<string, string>;
      usdToUzs: number;
      defaultIkpu: string;
      skuByVariant: Map<string, string>;
    },
  ) {
    const { usdToUzs } = ctx;
    // Nom TARJIMA QILINMAYDI — sababi `productTitle` izohida.
    const name = productTitle(product);
    const description = descriptionFrom(product.body_html);
    const prices = product.variants.map((v) => roundPriceTiyin(toTiyin(v.price, usdToUzs)));
    const compare = product.variants.map((v) =>
      v.compare_at_price ? roundPriceTiyin(toTiyin(v.compare_at_price, usdToUzs)) : null,
    );
    const active = product.published_at !== null && product.published_at !== undefined;

    const data = {
      brandId: ctx.brandId,
      nameUz: name,
      nameRu: name,
      nameEn: name,
      /*
       * Tavsif MANBADAN olinadi.
       *
       * Ilgari bu yerda har bir mahsulotga bir xil jumla yozilardi,
       * Shopify'dagi haqiqiy matn esa o'qilib, tashlab yuborilardi.
       * Natijada 556 ta sahifada bitta matn turardi — mijozga
       * foydasiz, Google uchun esa takroriy kontent.
       *
       * Matn yo'q bo'lsa `null` qoladi: bo'sh joyni shablon bilan
       * to'ldirish yo'qligini yashiradi va uni hech kim tuzatmaydi.
       */
      shortDescUz: description ? description.slice(0, 300) : null,
      shortDescRu: description ? description.slice(0, 300) : null,
      descUz: description,
      descRu: description,
      warningsUz: 'Faqat ko‘rsatma bo‘yicha foydalaning. Qadoqdagi ogohlantirishni tekshiring.',
      warningsRu: 'Используйте согласно инструкции. Проверьте предупреждения на упаковке.',
      slug: product.handle,
      ikpuCode: ctx.defaultIkpu,
      vatRate: 12,
      unitCode: '796',
      /*
       * `as const` SHART.
       *
       * `const data = { status: active ? 'ACTIVE' : 'DRAFT' }` da
       * TypeScript turni `string` gacha kengaytiradi, Prisma esa
       * `ProductStatus` enumini kutadi. Lokal typecheck buni ko'rmadi,
       * chunki u stub bilan ishlaydi — xato faqat Render'dagi build'da
       * chiqdi.
       */
      status: active ? ('ACTIVE' as const) : ('DRAFT' as const),
      publishedAt: active ? new Date(product.published_at ?? Date.now()) : null,
      minPrice: prices.length ? prices.reduce((a, b) => (a < b ? a : b)) : 0n,
      maxPrice: prices.length ? prices.reduce((a, b) => (a > b ? a : b)) : 0n,
      hasSale: compare.some((old, i) => old !== null && old > (prices[i] ?? 0n)),
      searchText: `${name} ${product.handle} ${product.vendor ?? ''}`.toLowerCase(),
    };

    await this.prisma.$transaction(
      async (tx) => {
        const saved = await tx.product.upsert({
          where: { slug: product.handle },
          update: data,
          create: data,
          select: { id: true },
        });

        const variantIds = new Map<string, string>();
        for (const [index, variant] of product.variants.entries()) {
          const sku = ctx.skuByVariant.get(`${product.id}:${variant.id}`)!;
          const options = {
            title: variant.title,
            option1: variant.option1,
            option2: variant.option2,
            option3: variant.option3,
          };
          const variantData = {
            productId: saved.id,
            barcode: variant.barcode || null,
            options,
            price: toTiyin(variant.price, usdToUzs),
            oldPrice: variant.compare_at_price ? toTiyin(variant.compare_at_price, usdToUzs) : null,
            weightGrams: variant.grams || null,
            isActive: variant.available !== false,
            sortOrder: index,
          };
          const savedVariant = await tx.productVariant.upsert({
            where: { sku },
            update: { ...variantData, deletedAt: null },
            create: { ...variantData, sku },
            select: { id: true },
          });
          variantIds.set(String(variant.id), savedVariant.id);

          /*
           * QOLDIQQA IMPORT TEGMAYDI, agar manba uni bilmasa.
           *
           * Shopify'ning ochiq fayli qoldiqni bermaydi — u yerda nol
           * turadi. O'sha nolni yozish ikki marta zarar keltirgan:
           *
           *   1. 556 ta mahsulot «Tugagan» bo'lib qolgan va do'kon
           *      umuman sotolmagan;
           *   2. importni qayta ishga tushirish xodim qo'lda kiritgan
           *      qoldiqni nolga qaytargan bo'lardi — ya'ni katalogni
           *      yangilash omborni o'chirib yuborardi.
           *
           * Shuning uchun: son ma'lum bo'lsa yoziladi, aks holda
           * mavjud yozuvga tegilmaydi va yangi variantga nol bilan
           * ochiladi (xodim keyin to'ldiradi).
           */
          const stock = sourceStock(variant);
          if (stock !== null && stock > 0) {
            await tx.inventory.upsert({
              where: {
                variantId_warehouseId: { variantId: savedVariant.id, warehouseId: ctx.warehouseId },
              },
              update: { totalStock: stock },
              create: {
                variantId: savedVariant.id,
                warehouseId: ctx.warehouseId,
                totalStock: stock,
              },
            });
          } else {
            // `create` — mavjud bo'lmasa ochiladi; `update: {}` —
            // mavjud bo'lsa hech narsa o'zgarmaydi.
            await tx.inventory.upsert({
              where: {
                variantId_warehouseId: { variantId: savedVariant.id, warehouseId: ctx.warehouseId },
              },
              update: {},
              create: { variantId: savedVariant.id, warehouseId: ctx.warehouseId, totalStock: 0 },
            });
          }
        }

        await tx.productImage.deleteMany({ where: { productId: saved.id } });
        if (product.images?.length) {
          await tx.productImage.createMany({
            data: product.images.map((image, index) => ({
              productId: saved.id,
              variantId:
                image.variant_ids?.length === 1
                  ? (variantIds.get(String(image.variant_ids[0])) ?? null)
                  : null,
              // Yuqoridagi sabab: `MediaKind` enumi, `string` emas.
              kind: index === 0 ? ('MAIN' as const) : ('GALLERY' as const),
              url: image.src,
              width: image.width || null,
              height: image.height || null,
              altUz: image.alt || name,
              altRu: image.alt || name,
              sortOrder: index,
            })),
          });
        }

        const category = categoryFor(product);
        const categoryId = ctx.categoryIds.get(category.slug);
        if (categoryId) {
          await tx.productCategory.deleteMany({ where: { productId: saved.id } });
          await tx.productCategory.create({
            data: { productId: saved.id, categoryId, isPrimary: true },
          });
          if (product.images?.[0]?.src) {
            await tx.category.updateMany({
              where: { id: categoryId, imageUrl: null },
              data: { imageUrl: product.images[0].src },
            });
          }
        }

        await tx.collectionProduct.deleteMany({ where: { productId: saved.id } });
        for (const [sortOrder, collection] of collectionsFor(product).entries()) {
          const collectionId = ctx.collectionIds.get(collection.slug);
          if (collectionId) {
            await tx.collectionProduct.create({
              data: { productId: saved.id, collectionId, sortOrder },
            });
          }
        }

        /*
         * Teglar QO'LDA qo'yilgani bilan birga saqlanmaydi: import
         * manbadagi holatni aks ettiradi. Admin tegni o'zgartirsa,
         * keyingi import uni qaytadan hisoblaydi — bu ataylab, aks
         * holda eski, endi noto'g'ri teglar abadiy qolib ketardi.
         */
        await tx.productTag.deleteMany({ where: { productId: saved.id } });
        for (const slug of tagsFor(product)) {
          const tagId = ctx.tagIds.get(slug);
          if (tagId) await tx.productTag.create({ data: { productId: saved.id, tagId } });
        }
      },
      { timeout: 30_000 },
    );
  }
}
