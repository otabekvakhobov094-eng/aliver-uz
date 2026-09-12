import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Prisma tranzaksiya klienti. Rezerv buyurtma yaratish bilan BITTA
 * tranzaksiyada bajarilishi kerak: aks holda buyurtma yaratilib, rezerv
 * qilinmagan holat paydo bo'lishi mumkin.
 */
export type InventoryClient = Pick<PrismaService, '$executeRaw'> & {
  stockReservation: PrismaService['stockReservation'];
  productVariant: PrismaService['productVariant'];
  inventory: PrismaService['inventory'];
};

export interface ReserveItem {
  variantId: string;
  quantity: number;
}

export interface AvailabilityRow {
  variantId: string;
  warehouseId: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
}

/** Qoldiq yetmaganda — qaysi mahsulot ekani aniq aytiladi. */
export class OutOfStockError extends ConflictException {
  constructor(
    readonly variantId: string,
    readonly requested: number,
    readonly available: number,
    productName?: string,
  ) {
    super({
      code: 'OUT_OF_STOCK',
      message: productName
        ? `"${productName}" — so‘ralgan miqdor yo‘q. Mavjud: ${available} dona.`
        : `So‘ralgan miqdor omborda yo‘q. Mavjud: ${available} dona.`,
      variantId,
      requested,
      available,
    });
  }
}

/**
 * Ombor.
 *
 * Ekspertiza A-6 bandining javobi. Uchta qoida:
 *
 *  1. REZERV ATOMAR. Qoldiq "avval o'qib, keyin yozish" bilan emas,
 *     bitta SHARTLI UPDATE bilan band qilinadi:
 *
 *        UPDATE inventory SET reservedStock = reservedStock + N
 *        WHERE variantId = ? AND totalStock - reservedStock >= N
 *
 *     Ikki mijoz oxirgi bir dona uchun bir vaqtda kelsa, ikkinchisining
 *     UPDATE i 0 satrga ta'sir qiladi va u xato oladi. Ilova darajasidagi
 *     tekshiruv bunday kafolat bermaydi.
 *
 *  2. REZERV MUDDATLI. To'lanmagan buyurtma rezervi `expiresAt` da bo'shaydi
 *     (ReservationScheduler). TZ da bu muddat umuman yo'q edi.
 *
 *  3. QOLDIQ FAQAT HARAKAT ORQALI O'ZGARADI. `totalStock` ning har bir
 *     o'zgarishi `inventory_movements` ga sabab bilan yoziladi.
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async defaultWarehouseId(): Promise<string> {
    const wh = await this.prisma.warehouse.findFirst({
      where: { isActive: true },
      orderBy: { isDefault: 'desc' },
      select: { id: true },
    });
    if (!wh) throw new BadRequestException('Faol ombor topilmadi');
    return wh.id;
  }

  async availability(variantIds: string[]): Promise<Map<string, AvailabilityRow>> {
    if (variantIds.length === 0) return new Map();
    const rows = await this.prisma.inventory.findMany({
      where: { variantId: { in: variantIds } },
    });
    const map = new Map<string, AvailabilityRow>();
    for (const r of rows) {
      const prev = map.get(r.variantId);
      const available = Math.max(r.totalStock - r.reservedStock, 0);
      // Ko'p omborli rejimda qoldiqlar yig'iladi (MVP da bitta ombor).
      map.set(r.variantId, {
        variantId: r.variantId,
        warehouseId: r.warehouseId,
        totalStock: (prev?.totalStock ?? 0) + r.totalStock,
        reservedStock: (prev?.reservedStock ?? 0) + r.reservedStock,
        availableStock: (prev?.availableStock ?? 0) + available,
        lowStockThreshold: r.lowStockThreshold,
      });
    }
    return map;
  }

  /**
   * Buyurtma uchun qoldiqni band qiladi.
   * Bir pozitsiya band qilinmasa — allaqachon band qilinganlari bo'shatiladi
   * va xato tashlanadi (yarim rezerv qolmaydi).
   */
  async reserveForOrder(
    params: {
      orderId: string;
      items: ReserveItem[];
      /**
       * Rezerv muddati. `null` — muddatsiz: naqd to'lovda buyurtma
       * to'lovni kutmaydi, shuning uchun uni avtomatik bekor qilib
       * bo'lmaydi (aks holda har bir COD buyurtma 30 daqiqada o'chardi).
       */
      ttlMinutes: number | null;
      warehouseId?: string;
    },
    client?: InventoryClient,
  ): Promise<void> {
    const db = (client ?? this.prisma) as InventoryClient;
    const warehouseId = params.warehouseId ?? (await this.defaultWarehouseId());
    const expiresAt =
      params.ttlMinutes === null ? null : new Date(Date.now() + params.ttlMinutes * 60_000);
    const done: ReserveItem[] = [];

    try {
      for (const item of params.items) {
        if (item.quantity <= 0) throw new BadRequestException('Miqdor musbat bo‘lishi kerak');

        const affected = await db.$executeRaw`
          UPDATE inventory
             SET "reservedStock" = "reservedStock" + ${item.quantity},
                 "updatedAt" = NOW()
           WHERE "variantId" = ${item.variantId}::uuid
             AND "warehouseId" = ${warehouseId}::uuid
             AND "totalStock" - "reservedStock" >= ${item.quantity}
        `;

        if (affected !== 1) {
          const rows = await db.inventory.findMany({ where: { variantId: item.variantId } });
          const available = rows.reduce(
            (s: number, r: { totalStock: number; reservedStock: number }) =>
              s + Math.max(r.totalStock - r.reservedStock, 0),
            0,
          );
          const variant = await db.productVariant.findUnique({
            where: { id: item.variantId },
            select: { sku: true, product: { select: { nameUz: true } } },
          });
          throw new OutOfStockError(
            item.variantId,
            item.quantity,
            available,
            variant?.product?.nameUz ?? variant?.sku,
          );
        }

        await db.stockReservation.create({
          data: {
            variantId: item.variantId,
            warehouseId,
            orderId: params.orderId,
            quantity: item.quantity,
            status: 'HELD',
            expiresAt,
          },
        });

        done.push(item);
      }
    } catch (e) {
      // Tranzaksiya ichida bo'lsak, rollback baribir hammasini qaytaradi.
      // Tranzaksiyasiz chaqirilganda qisman rezervni o'zimiz ortga qaytaramiz —
      // aks holda tovar "osilib" qoladi.
      if (!client) {
        for (const item of done) {
          await this.decrementReserved(item.variantId, warehouseId, item.quantity);
        }
        await this.prisma.stockReservation.deleteMany({
          where: { orderId: params.orderId, status: 'HELD' },
        });
      }
      throw e;
    }
  }

  /**
   * Rezervni bo'shatadi (buyurtma bekor qilindi yoki muddati o'tdi).
   *
   * Ikki holat farqlanadi:
   *  - `HELD` rezerv — hali jo'natilmagan: faqat `reservedStock` kamayadi;
   *  - `CONSUMED` rezerv — allaqachon jo'natilgan va `totalStock` dan
   *    yechilgan: bekor qilinganda tovar OMBORGA QAYTARILADI, aks holda
   *    qaytib kelgan buyurtmadan keyin qoldiq abadiy kam bo'lib qolardi.
   */
  async releaseForOrder(
    orderId: string,
    reason: 'CANCELLED' | 'EXPIRED' = 'CANCELLED',
  ): Promise<number> {
    const reservations = await this.prisma.stockReservation.findMany({
      where: { orderId, status: { in: ['HELD', 'CONSUMED'] } },
    });
    if (reservations.length === 0) return 0;

    const now = new Date();
    const touched = new Set<string>();

    for (const r of reservations) {
      if (r.status === 'HELD') {
        await this.decrementReserved(r.variantId, r.warehouseId, r.quantity);
        await this.prisma.stockReservation.update({
          where: { id: r.id },
          data: { status: reason === 'EXPIRED' ? 'EXPIRED' : 'RELEASED', releasedAt: now },
        });
      } else {
        // Jo'natilgan tovar qaytdi: totalStock tiklanadi va harakat yoziladi,
        // shunda qoldiq qayerdan kelgani jurnalda ko'rinadi.
        await this.prisma.$executeRaw`
          UPDATE inventory SET "totalStock" = "totalStock" + ${r.quantity}, "updatedAt" = NOW()
           WHERE "variantId" = ${r.variantId}::uuid AND "warehouseId" = ${r.warehouseId}::uuid
        `;
        await this.writeMovement({
          variantId: r.variantId,
          warehouseId: r.warehouseId,
          reason: 'RETURN_IN',
          quantity: r.quantity,
          orderId,
          comment: 'Jo‘natilgan buyurtma bekor qilindi — tovar omborga qaytarildi',
        });
        await this.prisma.stockReservation.update({
          where: { id: r.id },
          data: { status: 'RELEASED', releasedAt: now },
        });
      }
      touched.add(r.variantId);
    }

    for (const variantId of touched) await this.syncProductStockFlag(variantId);

    this.logger.log(`Rezerv bo‘shatildi: buyurtma ${orderId}, ${reservations.length} pozitsiya`);
    return reservations.length;
  }

  /**
   * Jo'natishda rezerv qoldiqqa aylanadi: reservedStock va totalStock
   * birgalikda kamayadi, har biri uchun harakat yoziladi.
   */
  async consumeForOrder(orderId: string, adminId?: string): Promise<number> {
    const reservations = await this.prisma.stockReservation.findMany({
      where: { orderId, status: 'HELD' },
    });
    if (reservations.length === 0) return 0;

    for (const r of reservations) {
      await this.prisma.$executeRaw`
        UPDATE inventory
           SET "reservedStock" = GREATEST("reservedStock" - ${r.quantity}, 0),
               "totalStock" = GREATEST("totalStock" - ${r.quantity}, 0),
               "updatedAt" = NOW()
         WHERE "variantId" = ${r.variantId}::uuid AND "warehouseId" = ${r.warehouseId}::uuid
      `;

      await this.writeMovement({
        variantId: r.variantId,
        warehouseId: r.warehouseId,
        reason: 'ORDER_SHIP',
        quantity: -r.quantity,
        orderId,
        adminId,
        comment: 'Buyurtma jo‘natildi',
      });
    }

    await this.prisma.stockReservation.updateMany({
      where: { orderId, status: 'HELD' },
      data: { status: 'CONSUMED' },
    });

    // totalStock kamaydi — katalogdagi "sotuvda bor" bayrog'i yangilanadi.
    for (const variantId of new Set<string>(
      reservations.map((r: { variantId: string }) => r.variantId),
    )) {
      await this.syncProductStockFlag(variantId);
    }

    return reservations.length;
  }

  /**
   * Buyurtma tasdiqlangach rezerv muddatsiz bo'ladi.
   *
   * Aks holda muddati o'tgan, lekin bo'shatilmaydigan yozuvlar to'planib,
   * har daqiqalik cron ning 500 qatorlik oynasini to'ldirib qo'yardi va
   * haqiqiy tashlab ketilgan buyurtmalarga navbat yetmay qolardi.
   */
  async clearReservationDeadline(orderId: string): Promise<void> {
    await this.prisma.stockReservation.updateMany({
      where: { orderId, status: 'HELD' },
      data: { expiresAt: null },
    });
  }

  /** Qaytarilgan mahsulotni omborga qaytarish (6-etapda ishlatiladi). */
  async restock(params: {
    variantId: string;
    quantity: number;
    resellable: boolean;
    orderId?: string;
    returnId?: string;
    adminId?: string;
  }): Promise<void> {
    const warehouseId = await this.defaultWarehouseId();

    if (params.resellable) {
      const affected = await this.prisma.$executeRaw`
        UPDATE inventory SET "totalStock" = "totalStock" + ${params.quantity}, "updatedAt" = NOW()
        WHERE "variantId" = ${params.variantId}::uuid AND "warehouseId" = ${warehouseId}::uuid
      `;

      // Variant uchun shu omborda yozuv bo'lmasa `UPDATE` jim o'tib
      // ketardi: chaqiruvchi "qaytarildi" deb belgilar, qoldiq esa
      // o'zgarmasdi. Yozuvni yaratamiz va shundan keyin davom etamiz.
      if (affected !== 1) {
        await this.prisma.inventory.upsert({
          where: { variantId_warehouseId: { variantId: params.variantId, warehouseId } },
          update: { totalStock: { increment: params.quantity } },
          create: {
            variantId: params.variantId,
            warehouseId,
            totalStock: params.quantity,
            reservedStock: 0,
          },
        });
      }
    }

    await this.writeMovement({
      variantId: params.variantId,
      warehouseId,
      reason: params.resellable ? 'RETURN_IN' : 'RETURN_SCRAP',
      quantity: params.resellable ? params.quantity : 0,
      orderId: params.orderId,
      returnId: params.returnId,
      adminId: params.adminId,
      comment: params.resellable ? 'Qaytarildi, qayta sotiladi' : 'Qaytarildi, yaroqsiz',
    });

    // Katalogdagi "sotuvda bor" bayrog'i ham yangilanadi.
    await this.syncProductStockFlag(params.variantId);
  }

  /** Admin qo'lda qoldiq o'zgartiradi. Sabab MAJBURIY. */
  async adjust(params: {
    variantId: string;
    delta: number;
    reason: 'PURCHASE_IN' | 'ADJUSTMENT' | 'LOSS';
    comment: string;
    adminId?: string;
  }): Promise<AvailabilityRow> {
    if (params.delta === 0) throw new BadRequestException('O‘zgarish nol bo‘lishi mumkin emas');
    if (!params.comment?.trim()) throw new BadRequestException('Sabab izohi majburiy');

    const warehouseId = await this.defaultWarehouseId();

    if (params.delta < 0) {
      // Manfiy qoldiqqa yo'l qo'ymaymiz, band qilinganidan pastga ham tushmaymiz.
      const affected = await this.prisma.$executeRaw`
        UPDATE inventory
           SET "totalStock" = "totalStock" + ${params.delta}, "updatedAt" = NOW()
         WHERE "variantId" = ${params.variantId}::uuid
           AND "warehouseId" = ${warehouseId}::uuid
           AND "totalStock" + ${params.delta} >= "reservedStock"
      `;
      if (affected !== 1) {
        throw new ConflictException(
          'Qoldiqni bunchaga kamaytirib bo‘lmaydi: band qilingan miqdordan past tushadi',
        );
      }
    } else {
      await this.prisma.$executeRaw`
        UPDATE inventory
           SET "totalStock" = "totalStock" + ${params.delta}, "updatedAt" = NOW()
         WHERE "variantId" = ${params.variantId}::uuid AND "warehouseId" = ${warehouseId}::uuid
      `;
    }

    await this.writeMovement({
      variantId: params.variantId,
      warehouseId,
      reason: params.reason,
      quantity: params.delta,
      adminId: params.adminId,
      comment: params.comment,
    });

    await this.syncProductStockFlag(params.variantId);

    const map = await this.availability([params.variantId]);
    return map.get(params.variantId)!;
  }

  /**
   * Fayldan ommaviy qoldiq kiritish — INVENTARIZATSIYA.
   *
   * Semantika «qo'shish» emas, «shu son bo'lsin»: xodim omborni
   * sanaydi va natijani yozadi. Qo'shish bo'lganda faylni ikki marta
   * yuklash qoldiqni ikki barobar qilib qo'yardi — va buni faqat
   * tovar tugagach sezish mumkin bo'lardi.
   *
   * Har bir o'zgarish HARAKAT sifatida yoziladi: ombor tarixi
   * uzilmasligi kerak, aks holda «qayerdan keldi» degan savolga
   * javob yo'qoladi.
   */
  async bulkSetStock(
    rows: Array<{ sku: string; quantity: number }>,
    options: { adminId?: string; comment?: string; dryRun?: boolean } = {},
  ): Promise<{
    updated: number;
    unchanged: number;
    unknownSkus: string[];
    changes: Array<{ sku: string; from: number; to: number }>;
    dryRun: boolean;
  }> {
    // Standart — YOZADI. «Ko'rib chiqish» rejimi adminda tugma
    // bilan tanlanadi, ya'ni xodim nima bo'lishini oldin ko'radi.
    const dryRun = options.dryRun ?? false;
    if (rows.length === 0) {
      return { updated: 0, unchanged: 0, unknownSkus: [], changes: [], dryRun };
    }

    const warehouseId = await this.defaultWarehouseId();
    const skus = [...new Set(rows.map((r) => r.sku))];

    const variants = await this.prisma.productVariant.findMany({
      where: { sku: { in: skus }, deletedAt: null },
      select: {
        id: true,
        sku: true,
        inventory: { where: { warehouseId }, select: { totalStock: true, reservedStock: true } },
      },
    });
    const bySku = new Map(variants.map((v) => [v.sku, v]));

    const unknownSkus = skus.filter((sku) => !bySku.has(sku));
    const changes: Array<{ sku: string; from: number; to: number }> = [];
    let unchanged = 0;

    for (const row of rows) {
      const variant = bySku.get(row.sku);
      if (!variant) continue;

      const current = variant.inventory[0]?.totalStock ?? 0;
      const reserved = variant.inventory[0]?.reservedStock ?? 0;
      if (current === row.quantity) {
        unchanged += 1;
        continue;
      }

      /*
       * Band qilingan miqdordan past tushirib bo'lmaydi: o'sha
       * tovar allaqachon kimningdir buyurtmasida turibdi va uni
       * «yo'q» deb belgilash buyurtmani bajarib bo'lmaydigan holga
       * keltirardi.
       */
      if (row.quantity < reserved) {
        unknownSkus.push(`${row.sku} (${reserved} dona band qilingan)`);
        continue;
      }

      changes.push({ sku: row.sku, from: current, to: row.quantity });

      if (!dryRun) {
        await this.prisma.inventory.upsert({
          where: { variantId_warehouseId: { variantId: variant.id, warehouseId } },
          update: { totalStock: row.quantity },
          create: { variantId: variant.id, warehouseId, totalStock: row.quantity },
        });
        await this.writeMovement({
          variantId: variant.id,
          warehouseId,
          reason: 'ADJUSTMENT',
          quantity: row.quantity - current,
          adminId: options.adminId,
          comment: options.comment?.trim() || 'Fayldan ommaviy qoldiq kiritildi',
        });
        await this.syncProductStockFlag(variant.id);
      }
    }

    return { updated: changes.length, unchanged, unknownSkus, changes, dryRun };
  }

  async movements(variantId: string, limit = 50) {
    return this.prisma.inventoryMovement.findMany({
      where: { variantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async lowStock(limit = 50) {
    const rows = await this.prisma.inventory.findMany({
      where: { totalStock: { gt: 0 } },
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
            options: true,
            product: { select: { nameUz: true, slug: true } },
          },
        },
      },
      take: 500,
    });
    return rows
      .map((r) => ({
        variantId: r.variantId,
        sku: r.variant.sku,
        options: r.variant.options,
        productName: r.variant.product.nameUz,
        productSlug: r.variant.product.slug,
        available: Math.max(r.totalStock - r.reservedStock, 0),
        threshold: r.lowStockThreshold,
      }))
      .filter((r) => r.available <= r.threshold)
      .sort((a, b) => a.available - b.available)
      .slice(0, limit);
  }

  /**
   * Kam qoldiq ostonasini bir nechta variant uchun qo'yish.
   *
   * `updateMany` bitta so'rov bilan bajaradi — 200 ta variant uchun
   * 200 ta so'rov yuborish kerak emas. Ostona qoldiqning O'ZIGA
   * tegmaydi, shuning uchun bu yerda harakat jurnaliga yozuv yo'q:
   * jurnal `totalStock` o'zgarishini qayd etadi, ostona esa sozlama.
   * Amalning o'zi audit logga `Audit` dekoratori orqali tushadi.
   */
  async setThresholds(variantIds: string[], threshold: number) {
    const result = await this.prisma.inventory.updateMany({
      where: { variantId: { in: variantIds } },
      data: { lowStockThreshold: threshold },
    });
    return {
      updated: result.count,
      // Farq bo'lsa — ba'zi variantda ombor yozuvi umuman yo'q.
      // Buni jimgina yutib yuborish xato bo'lardi: operator 10 ta
      // tanlab, 7 tasi o'zgarganini bilishi kerak.
      requested: variantIds.length,
      threshold,
    };
  }

  /* ---------------------------- ichki ---------------------------- */

  private async decrementReserved(variantId: string, warehouseId: string, quantity: number) {
    await this.prisma.$executeRaw`
      UPDATE inventory
         SET "reservedStock" = GREATEST("reservedStock" - ${quantity}, 0), "updatedAt" = NOW()
       WHERE "variantId" = ${variantId}::uuid AND "warehouseId" = ${warehouseId}::uuid
    `;
  }

  private async writeMovement(params: {
    variantId: string;
    warehouseId: string;
    reason: string;
    quantity: number;
    orderId?: string;
    returnId?: string;
    adminId?: string;
    comment?: string;
  }) {
    const inv = await this.prisma.inventory.findFirst({
      where: { variantId: params.variantId, warehouseId: params.warehouseId },
      select: { totalStock: true },
    });

    await this.prisma.inventoryMovement.create({
      data: {
        variantId: params.variantId,
        warehouseId: params.warehouseId,
        reason: params.reason as never,
        quantity: params.quantity,
        balanceAfter: inv?.totalStock ?? 0,
        orderId: params.orderId ?? null,
        returnId: params.returnId ?? null,
        adminId: params.adminId ?? null,
        comment: params.comment ?? null,
      },
    });
  }

  /** Katalogdagi `inStock` bayrog'ini qoldiqqa moslashtiradi. */
  async syncProductStockFlag(variantId: string): Promise<void> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { productId: true },
    });
    if (!variant) return;

    const rows = await this.prisma.inventory.findMany({
      where: { variant: { productId: variant.productId, deletedAt: null, isActive: true } },
      select: { totalStock: true, reservedStock: true },
    });
    const inStock = rows.some((r) => r.totalStock - r.reservedStock > 0);

    await this.prisma.product.update({
      where: { id: variant.productId },
      data: { inStock },
    });
  }
}
