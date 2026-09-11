import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  MethodRegionRowDto,
  UpsertDeliveryMethodDto,
  UpsertDistrictDto,
  UpsertRegionDto,
} from './dto/delivery-admin.dto';

/**
 * Yetkazib berish boshqaruvi.
 *
 * TZ 29–30 da narxlar "sozlamalarda" deb aytilgan, lekin ular qayerda
 * va kim tomonidan o'zgartirilishi yozilmagan (ekspertiza C-2). Natijada
 * amalda narxlar kodga yozib qo'yiladi va har o'zgarishda reliz kerak
 * bo'lardi. Bu servis narxni admin panelga chiqaradi.
 */
@Injectable()
export class DeliveryAdminService {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------- Hududlar ------------------------------- */

  async regions() {
    const rows = await this.prisma.region.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
      include: {
        districts: { orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }] },
        _count: { select: { districts: true } },
      },
    });
    return rows.map((r: RegionRow) => ({
      id: r.id,
      code: r.code,
      nameUz: r.nameUz,
      nameRu: r.nameRu,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
      districtsCount: r._count.districts,
      districts: r.districts.map((d) => ({
        id: d.id,
        code: d.code,
        nameUz: d.nameUz,
        nameRu: d.nameRu,
        sortOrder: d.sortOrder,
        isActive: d.isActive,
      })),
    }));
  }

  async upsertRegion(dto: UpsertRegionDto) {
    const data = {
      code: dto.code.trim(),
      nameUz: dto.nameUz.trim(),
      nameRu: dto.nameRu.trim(),
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    };

    const clash = await this.prisma.region.findFirst({
      where: { code: data.code, ...(dto.id ? { NOT: { id: dto.id } } : {}) },
      select: { id: true },
    });
    if (clash) throw new BadRequestException(`"${data.code}" kodi band`);

    if (dto.id) return this.prisma.region.update({ where: { id: dto.id }, data });
    return this.prisma.region.create({ data });
  }

  /**
   * Hududni o'chirish o'rniga NOFAOL qilish.
   *
   * Hudud buyurtmalarga bog'langan bo'lishi mumkin; o'chirilsa eski
   * buyurtmalarning manzili yo'qoladi. Nofaol hudud checkout da
   * ko'rinmaydi, lekin tarixda qoladi.
   */
  async setRegionActive(id: string, isActive: boolean) {
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('Hudud topilmadi');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.region.update({ where: { id }, data: { isActive } });
      // Hudud yopilsa uning tumanlari ham yopiladi — aks holda checkout da
      // "hudud yo'q, lekin tuman bor" holati chiqardi.
      if (!isActive) {
        await tx.district.updateMany({ where: { regionId: id }, data: { isActive: false } });
      }
      return updated;
    });
  }

  async upsertDistrict(dto: UpsertDistrictDto) {
    const region = await this.prisma.region.findUnique({ where: { id: dto.regionId } });
    if (!region) throw new NotFoundException('Hudud topilmadi');

    const data = {
      regionId: dto.regionId,
      code: dto.code.trim(),
      nameUz: dto.nameUz.trim(),
      nameRu: dto.nameRu.trim(),
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    };

    const clash = await this.prisma.district.findFirst({
      where: { code: data.code, ...(dto.id ? { NOT: { id: dto.id } } : {}) },
      select: { id: true },
    });
    if (clash) throw new BadRequestException(`"${data.code}" kodi band`);

    if (dto.id) return this.prisma.district.update({ where: { id: dto.id }, data });
    return this.prisma.district.create({ data });
  }

  async setDistrictActive(id: string, isActive: boolean) {
    const district = await this.prisma.district.findUnique({ where: { id } });
    if (!district) throw new NotFoundException('Tuman topilmadi');
    return this.prisma.district.update({ where: { id }, data: { isActive } });
  }

  /* -------------------------------- Usullar -------------------------------- */

  async methods() {
    const rows = await this.prisma.deliveryMethod.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
      include: { regions: true, _count: { select: { orders: true } } },
    });

    return rows.map((m: MethodRow) => ({
      id: m.id,
      code: m.code,
      type: m.type,
      nameUz: m.nameUz,
      nameRu: m.nameRu,
      descUz: m.descUz,
      descRu: m.descRu,
      basePrice: (m.basePrice as bigint).toString(),
      freeThreshold: m.freeThreshold ? (m.freeThreshold as bigint).toString() : null,
      minOrderAmount: m.minOrderAmount ? (m.minOrderAmount as bigint).toString() : null,
      estimatedDaysMin: m.estimatedDaysMin,
      estimatedDaysMax: m.estimatedDaysMax,
      isActive: m.isActive,
      sortOrder: m.sortOrder,
      ordersCount: m._count.orders,
      regionsConfigured: m.regions.length,
    }));
  }

  async upsertMethod(dto: UpsertDeliveryMethodDto) {
    if (dto.estimatedDaysMax < dto.estimatedDaysMin) {
      throw new BadRequestException('Maksimal muddat minimaldan kichik bo‘lishi mumkin emas');
    }

    const data = {
      code: dto.code.trim().toUpperCase(),
      type: dto.type as never,
      nameUz: dto.nameUz.trim(),
      nameRu: dto.nameRu.trim(),
      descUz: dto.descUz?.trim() || null,
      descRu: dto.descRu?.trim() || null,
      basePrice: BigInt(dto.basePrice),
      freeThreshold:
        dto.freeThreshold === null || dto.freeThreshold === undefined
          ? null
          : BigInt(dto.freeThreshold),
      minOrderAmount:
        dto.minOrderAmount === null || dto.minOrderAmount === undefined
          ? null
          : BigInt(dto.minOrderAmount),
      estimatedDaysMin: dto.estimatedDaysMin,
      estimatedDaysMax: dto.estimatedDaysMax,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    };

    const clash = await this.prisma.deliveryMethod.findFirst({
      where: { code: data.code, ...(dto.id ? { NOT: { id: dto.id } } : {}) },
      select: { id: true },
    });
    if (clash) throw new BadRequestException(`"${data.code}" kodi band`);

    if (dto.id) return this.prisma.deliveryMethod.update({ where: { id: dto.id }, data });
    return this.prisma.deliveryMethod.create({ data });
  }

  async setMethodActive(id: string, isActive: boolean) {
    const method = await this.prisma.deliveryMethod.findUnique({ where: { id } });
    if (!method) throw new NotFoundException('Usul topilmadi');

    // Oxirgi faol usulni o'chirib bo'lmaydi — checkout ishlamay qolardi.
    if (!isActive) {
      const others = await this.prisma.deliveryMethod.count({
        where: { isActive: true, NOT: { id } },
      });
      if (others === 0) {
        throw new BadRequestException(
          'Bu oxirgi faol yetkazib berish usuli — o‘chirilsa buyurtma berib bo‘lmaydi',
        );
      }
    }
    return this.prisma.deliveryMethod.update({ where: { id }, data: { isActive } });
  }

  /* ---------------------------- Narx matritsasi ---------------------------- */

  /**
   * Usul va hududlar kesishmasi.
   *
   * Yozuv yo'q hudud uchun standart narx ishlaydi — EKSPRESSDAN tashqari:
   * u faqat aniq ochilgan hududlarda mavjud (3-etapdagi qoida).
   */
  async methodRegions(methodId: string) {
    const method = await this.prisma.deliveryMethod.findUnique({ where: { id: methodId } });
    if (!method) throw new NotFoundException('Usul topilmadi');

    const [regions, links] = await Promise.all([
      this.prisma.region.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }] }),
      this.prisma.deliveryMethodRegion.findMany({ where: { methodId } }),
    ]);

    const byRegion = new Map<string, LinkRow>(links.map((l: LinkRow) => [l.regionId, l]));

    return {
      method: {
        id: method.id,
        code: method.code,
        type: method.type,
        nameUz: method.nameUz,
        basePrice: (method.basePrice as bigint).toString(),
        freeThreshold: method.freeThreshold ? (method.freeThreshold as bigint).toString() : null,
        estimatedDaysMin: method.estimatedDaysMin,
        estimatedDaysMax: method.estimatedDaysMax,
      },
      rows: regions.map((r: { id: string; nameUz: string; nameRu: string; isActive: boolean }) => {
        const link = byRegion.get(r.id);
        return {
          regionId: r.id,
          regionNameUz: r.nameUz,
          regionNameRu: r.nameRu,
          regionActive: r.isActive,
          configured: Boolean(link),
          price: link ? (link.price as bigint).toString() : (method.basePrice as bigint).toString(),
          freeThreshold: link?.freeThreshold
            ? (link.freeThreshold as bigint).toString()
            : method.freeThreshold
              ? (method.freeThreshold as bigint).toString()
              : null,
          daysMin: link?.daysMin ?? method.estimatedDaysMin,
          daysMax: link?.daysMax ?? method.estimatedDaysMax,
          // Ekspress uchun yozuvsiz hudud = mavjud emas.
          isAvailable: link ? link.isAvailable : method.type !== 'EXPRESS',
        };
      }),
    };
  }

  /** Matritsani bitta tranzaksiyada saqlaydi. */
  async saveMethodRegions(methodId: string, rows: MethodRegionRowDto[]) {
    const method = await this.prisma.deliveryMethod.findUnique({ where: { id: methodId } });
    if (!method) throw new NotFoundException('Usul topilmadi');

    const regionIds = rows.map((r) => r.regionId);
    const known = await this.prisma.region.count({ where: { id: { in: regionIds } } });
    if (known !== new Set(regionIds).size) {
      throw new BadRequestException('Noma’lum hudud ko‘rsatilgan');
    }

    for (const row of rows) {
      if (
        row.daysMin !== null &&
        row.daysMax !== null &&
        row.daysMin !== undefined &&
        row.daysMax !== undefined
      ) {
        if (row.daysMax < row.daysMin) {
          throw new BadRequestException('Maksimal muddat minimaldan kichik bo‘lishi mumkin emas');
        }
      }
    }

    await this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.deliveryMethodRegion.upsert({
          where: { methodId_regionId: { methodId, regionId: row.regionId } },
          update: {
            price: BigInt(row.price),
            freeThreshold:
              row.freeThreshold === null || row.freeThreshold === undefined
                ? null
                : BigInt(row.freeThreshold),
            daysMin: row.daysMin ?? null,
            daysMax: row.daysMax ?? null,
            isAvailable: row.isAvailable,
          },
          create: {
            methodId,
            regionId: row.regionId,
            price: BigInt(row.price),
            freeThreshold:
              row.freeThreshold === null || row.freeThreshold === undefined
                ? null
                : BigInt(row.freeThreshold),
            daysMin: row.daysMin ?? null,
            daysMax: row.daysMax ?? null,
            isAvailable: row.isAvailable,
          },
        }),
      ),
    );

    return this.methodRegions(methodId);
  }
}

interface RegionRow {
  id: string;
  code: string;
  nameUz: string;
  nameRu: string;
  sortOrder: number;
  isActive: boolean;
  _count: { districts: number };
  districts: Array<{
    id: string;
    code: string;
    nameUz: string;
    nameRu: string;
    sortOrder: number;
    isActive: boolean;
  }>;
}

interface MethodRow {
  id: string;
  code: string;
  type: string;
  nameUz: string;
  nameRu: string;
  descUz: string | null;
  descRu: string | null;
  basePrice: bigint;
  freeThreshold: bigint | null;
  minOrderAmount: bigint | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
  sortOrder: number;
  regions: unknown[];
  _count: { orders: number };
}

interface LinkRow {
  methodId: string;
  regionId: string;
  price: bigint;
  freeThreshold: bigint | null;
  daysMin: number | null;
  daysMax: number | null;
  isAvailable: boolean;
}
