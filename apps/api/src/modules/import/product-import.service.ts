import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductService } from '../catalog/product.service';
import { slugify } from '../catalog/slug.util';
import {
  IMPORT_COLUMNS,
  type ParsedProduct,
  type RawRow,
  type RowError,
  parseRows,
} from './product-import.schema';

export type ImportMode = 'PREVIEW' | 'CREATE_ONLY' | 'UPDATE_ONLY' | 'CREATE_AND_UPDATE';

export interface ImportSummary {
  jobId: string | null;
  mode: ImportMode;
  totalRows: number;
  products: number;
  created: number;
  updated: number;
  skipped: number;
  errorRows: number;
  errors: RowError[];
  /** PREVIEW rejimida: nima bo'lishini oldindan ko'rsatadi. */
  plan: Array<{ productSlug: string; action: 'create' | 'update' | 'skip'; variants: number }>;
}

@Injectable()
export class ProductImportService {
  private readonly logger = new Logger(ProductImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductService,
  ) {}

  /** Bo'sh shablon: admin panelda "Shablonni yuklab olish" tugmasi. */
  async buildTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ALIVER.UZ';

    const sheet = wb.addWorksheet('mahsulotlar');
    sheet.columns = IMPORT_COLUMNS.map((c) => ({
      header: c.header,
      key: c.key,
      width: Math.max(c.header.length + 4, 18),
    }));

    // Sarlavha satri
    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.eachCell((cell, col) => {
      const column = IMPORT_COLUMNS[col - 1];
      if (column?.required) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE3EE' } };
      }
      if (column?.note) cell.note = column.note;
    });

    // Namuna satri
    sheet.addRow(Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.key, c.example])));

    // Yo'riqnoma varag'i
    const help = wb.addWorksheet('yoriqnoma');
    help.columns = [
      { header: 'Ustun', key: 'k', width: 22 },
      { header: 'Majburiy', key: 'r', width: 12 },
      { header: 'Izoh', key: 'n', width: 70 },
    ];
    help.getRow(1).font = { bold: true };
    for (const c of IMPORT_COLUMNS) {
      help.addRow({ k: c.header, r: c.required ? 'ha' : 'yo‘q', n: c.note ?? '' });
    }
    help.addRow({});
    help.addRow({
      k: 'Eslatma',
      n: 'Bir mahsulotning har bir varianti — alohida satr. Ularni product_slug ustuni birlashtiradi.',
    });
    help.addRow({ k: '', n: 'IKPU (MXIK) kodi majburiy: usiz fiskal chek yuborib bo‘lmaydi.' });
    help.addRow({ k: '', n: 'Narxlar so‘mda, butun son. Tiyin avtomatik hisoblanadi.' });

    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out);
  }

  /** Faylni o'qib, satrlarni oddiy obyektlarga aylantiradi. */
  async readWorkbook(file: { buffer: Buffer; originalname: string }): Promise<RawRow[]> {
    const wb = new ExcelJS.Workbook();
    const isCsv = /\.csv$/i.test(file.originalname);

    if (isCsv) {
      const { Readable } = await import('node:stream');
      await wb.csv.read(Readable.from(file.buffer.toString('utf8')));
    } else {
      await wb.xlsx.load(file.buffer as unknown as ArrayBuffer);
    }

    const sheet = wb.worksheets[0];
    if (!sheet) throw new BadRequestException('Faylda varaq topilmadi');

    const headerRow = sheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, col) => {
      headers[col - 1] = String(cell.value ?? '')
        .trim()
        .toLowerCase();
    });

    const known = new Set(IMPORT_COLUMNS.map((c) => c.header));
    const unknown = headers.filter((h) => h && !known.has(h));
    if (unknown.length > 0) {
      this.logger.warn(`Noma'lum ustunlar e'tiborsiz qoldirildi: ${unknown.join(', ')}`);
    }

    const rows: RawRow[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: RawRow = {};
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        const key = headers[col - 1];
        if (!key) return;
        const v = cell.value;
        obj[key] =
          v && typeof v === 'object' && 'text' in v
            ? String((v as { text: unknown }).text)
            : ((v as string | number | null) ?? '');
      });
      // Butunlay bo'sh satrlarni tashlab ketamiz
      if (Object.values(obj).some((v) => String(v ?? '').trim() !== '')) rows.push(obj);
    });

    return rows;
  }

  /**
   * Asosiy metod. PREVIEW rejimida bazaga hech narsa yozilmaydi —
   * admin avval nima bo'lishini ko'radi, keyin tasdiqlaydi (TZ 97).
   */
  async run(params: {
    file: { buffer: Buffer; originalname: string };
    mode: ImportMode;
    adminId?: string;
  }): Promise<ImportSummary> {
    const rows = await this.readWorkbook(params.file);
    if (rows.length === 0) throw new BadRequestException('Faylda ma’lumot yo‘q');
    if (rows.length > 5000) {
      throw new BadRequestException('Bir faylda 5000 tagacha satr bo‘lishi mumkin');
    }

    const parsed = parseRows(rows);
    const existingSlugs = await this.existingSlugs(parsed.products.map((p) => p.productSlug));

    const plan = parsed.products.map((p) => {
      const exists = existingSlugs.has(p.productSlug);
      let action: 'create' | 'update' | 'skip' = 'skip';
      if (exists && (params.mode === 'UPDATE_ONLY' || params.mode === 'CREATE_AND_UPDATE')) {
        action = 'update';
      } else if (
        !exists &&
        (params.mode === 'CREATE_ONLY' || params.mode === 'CREATE_AND_UPDATE')
      ) {
        action = 'create';
      } else if (params.mode === 'PREVIEW') {
        action = exists ? 'update' : 'create';
      }
      return { productSlug: p.productSlug, action, variants: p.variants.length };
    });

    const summary: ImportSummary = {
      jobId: null,
      mode: params.mode,
      totalRows: parsed.totalRows,
      products: parsed.products.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errorRows: parsed.errors.length,
      errors: parsed.errors.slice(0, 200),
      plan,
    };

    if (params.mode !== 'PREVIEW') {
      for (const [i, product] of parsed.products.entries()) {
        const action = plan[i]!.action;
        if (action === 'skip') {
          summary.skipped += 1;
          continue;
        }
        try {
          if (action === 'create') {
            await this.createProduct(product);
            summary.created += 1;
          } else {
            await this.updateProduct(product);
            summary.updated += 1;
          }
        } catch (e) {
          summary.errors.push({
            row: product.firstRow,
            column: 'product_slug',
            message: (e as Error).message,
          });
          summary.errorRows += 1;
        }
      }
    }

    const job = await this.prisma.importJob.create({
      data: {
        kind: 'PRODUCTS',
        mode: params.mode as never,
        fileName: params.file.originalname,
        adminId: params.adminId ?? null,
        totalRows: summary.totalRows,
        createdRows: summary.created,
        updatedRows: summary.updated,
        skippedRows: summary.skipped,
        errorRows: summary.errorRows,
        errors: summary.errors as never,
        status: 'DONE',
        finishedAt: new Date(),
      },
    });
    summary.jobId = job.id;

    return summary;
  }

  async history(limit = 20) {
    return this.prisma.importJob.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
  }

  /* ---------------------------- yordamchi ---------------------------- */

  private async existingSlugs(slugs: string[]): Promise<Set<string>> {
    if (slugs.length === 0) return new Set();
    const rows = await this.prisma.product.findMany({
      where: { slug: { in: slugs }, deletedAt: null },
      select: { slug: true },
    });
    return new Set(rows.map((r) => r.slug));
  }

  private async resolveRefs(p: ParsedProduct) {
    const categoryIds: string[] = [];
    if (p.categorySlug) {
      const c = await this.prisma.category.findFirst({
        where: { slug: p.categorySlug, deletedAt: null },
        select: { id: true },
      });
      if (!c) throw new Error(`Kategoriya topilmadi: ${p.categorySlug}`);
      categoryIds.push(c.id);
    }

    const collectionIds: string[] = [];
    if (p.collectionSlugs.length > 0) {
      const found = await this.prisma.collection.findMany({
        where: { slug: { in: p.collectionSlugs }, deletedAt: null },
        select: { id: true, slug: true },
      });
      const missing = p.collectionSlugs.filter((s) => !found.some((f) => f.slug === s));
      if (missing.length > 0) throw new Error(`Kolleksiya topilmadi: ${missing.join(', ')}`);
      collectionIds.push(...found.map((f) => f.id));
    }

    let brandId: string | undefined;
    if (p.brand) {
      const brand = await this.prisma.brand.upsert({
        where: { slug: slugify(p.brand) },
        update: {},
        create: { slug: slugify(p.brand), name: p.brand },
      });
      brandId = brand.id;
    }

    return { categoryIds, collectionIds, brandId };
  }

  private toDto(p: ParsedProduct, refs: Awaited<ReturnType<typeof this.resolveRefs>>) {
    return {
      slug: p.productSlug,
      nameUz: p.nameUz,
      nameRu: p.nameRu,
      brandId: refs.brandId,
      shortDescUz: p.shortDescUz,
      shortDescRu: p.shortDescRu,
      ingredientsUz: p.ingredientsUz,
      ingredientsRu: p.ingredientsRu,
      warningsUz: p.warningsUz,
      warningsRu: p.warningsRu,
      ikpuCode: p.ikpuCode,
      vatRate: p.vatRate,
      unitCode: p.unitCode,
      status: p.status,
      categoryIds: refs.categoryIds,
      collectionIds: refs.collectionIds,
      tagSlugs: p.tagSlugs,
      variants: p.variants.map((v, i) => ({
        sku: v.sku,
        barcode: v.barcode,
        options: v.options,
        price: v.price,
        oldPrice: v.oldPrice,
        costPrice: v.costPrice,
        volumeMl: v.volumeMl,
        weightGrams: v.weightGrams,
        sortOrder: i,
      })),
    };
  }

  private async createProduct(p: ParsedProduct) {
    const refs = await this.resolveRefs(p);
    return this.products.create(this.toDto(p, refs) as never);
  }

  /**
   * Yangilashda mavjud variantlar SKU bo'yicha moslashtiriladi — shunda
   * import buyurtmalarda ishlatilgan variantni "yangi" qilib yuborib,
   * eski havolalarni buzmaydi.
   */
  private async updateProduct(p: ParsedProduct) {
    const existing = await this.prisma.product.findFirst({
      where: { slug: p.productSlug, deletedAt: null },
      include: { variants: { where: { deletedAt: null }, select: { id: true, sku: true } } },
    });
    if (!existing) throw new Error(`Mahsulot topilmadi: ${p.productSlug}`);

    const refs = await this.resolveRefs(p);
    const dto = this.toDto(p, refs) as {
      variants: Array<{ sku: string; id?: string }>;
    } & Record<string, unknown>;

    const bySku = new Map<string, string>(
      existing.variants.map((v: { id: string; sku: string }) => [v.sku.toUpperCase(), v.id]),
    );
    for (const v of dto.variants) {
      const id = bySku.get(v.sku.toUpperCase());
      if (id) v.id = id;
    }

    return this.products.update(existing.id, dto as never);
  }
}
