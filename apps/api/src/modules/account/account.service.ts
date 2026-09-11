import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePhone } from '../../common/phone';
import { effectivePrice } from '../catalog/pricing.util';
import type { ConsentDto, UpdateProfileDto, UpsertAddressDto } from './dto/account.dto';

/**
 * Mijoz kabineti.
 *
 * Ikkita qoida bu yerda ko'rinadi:
 *
 *  1. TELEFON O'ZGARMAYDI. U mijozning asosiy identifikatori va
 *     buyurtmalar unga bog'langan. O'zgartirish uchun yangi raqamni
 *     SMS bilan tasdiqlash kerak — bu alohida oqim (`PHONE_CHANGE`).
 *
 *  2. ROZILIK TARIXI O'CHIRILMAYDI. Yangi rozilik yangi yozuv sifatida
 *     qo'shiladi; oldingilari qoladi. Nizoda "qachon rozilik berilgan"
 *     degan savolga javob kerak bo'ladi.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(private readonly prisma: PrismaService) {}

  /* -------------------------------- Profil -------------------------------- */

  async profile(customerId: string) {
    const c = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      include: {
        _count: { select: { orders: true, wishlistItems: true, returns: true } },
      },
    });
    if (!c) throw new NotFoundException('Mijoz topilmadi');

    return {
      id: c.id,
      phone: c.phone,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      locale: c.locale,
      telegramLinked: Boolean(c.telegramChatId),
      stats: {
        ordersCount: c.ordersCount,
        totalSpent: (c.totalSpent as bigint).toString(),
        firstOrderAt: c.firstOrderAt,
        lastOrderAt: c.lastOrderAt,
        wishlistCount: c._count.wishlistItems,
        returnsCount: c._count.returns,
      },
      createdAt: c.createdAt,
    };
  }

  async updateProfile(customerId: string, dto: UpdateProfileDto) {
    // Telefon ataylab ro'yxatda yo'q: u identifikator.
    await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() || null } : {}),
        ...(dto.locale !== undefined ? { locale: dto.locale as never } : {}),
      },
    });
    return this.profile(customerId);
  }

  /* ------------------------------- Manzillar ------------------------------- */

  async addresses(customerId: string) {
    const rows = await this.prisma.address.findMany({
      where: { customerId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: {
        region: { select: { nameUz: true, nameRu: true } },
        district: { select: { nameUz: true, nameRu: true } },
      },
    });

    return rows.map((a: AddressRow) => ({
      id: a.id,
      label: a.label,
      recipient: a.recipient,
      phone: a.phone,
      regionId: a.regionId,
      regionNameUz: a.region?.nameUz ?? null,
      regionNameRu: a.region?.nameRu ?? null,
      districtId: a.districtId,
      districtNameUz: a.district?.nameUz ?? null,
      districtNameRu: a.district?.nameRu ?? null,
      street: a.street,
      landmark: a.landmark,
      isDefault: a.isDefault,
    }));
  }

  async upsertAddress(customerId: string, dto: UpsertAddressDto) {
    const region = await this.prisma.region.findFirst({
      where: { id: dto.regionId, isActive: true },
      select: { id: true },
    });
    if (!region) throw new BadRequestException('Hudud topilmadi yoki faol emas');

    if (dto.districtId) {
      const district = await this.prisma.district.findFirst({
        where: { id: dto.districtId, regionId: dto.regionId },
        select: { id: true },
      });
      if (!district) throw new BadRequestException('Tuman bu hududga tegishli emas');
    }

    const data = {
      customerId,
      label: dto.label?.trim() || null,
      recipient: dto.recipient.trim(),
      phone: normalizePhone(dto.phone),
      regionId: dto.regionId,
      districtId: dto.districtId ?? null,
      street: dto.street.trim(),
      landmark: dto.landmark?.trim() || null,
    };

    const count = await this.prisma.address.count({ where: { customerId, deletedAt: null } });

    const saved = await this.prisma.$transaction(async (tx) => {
      let existing: { id: string; isDefault: boolean } | null = null;
      if (dto.id) {
        existing = await tx.address.findFirst({
          where: { id: dto.id, customerId, deletedAt: null },
          select: { id: true, isDefault: true },
        });
        if (!existing) throw new NotFoundException('Manzil topilmadi');
      }

      // Tahrirlashda bayroq SAQLANADI.
      //
      // Ilgari `dto.isDefault ?? count === 0` tahrirlashda ham
      // ishlatilar va yagona manzilni tuzatgan mijoz standart
      // manzilsiz qolib ketardi (count === 1, demak false).
      const isDefault = dto.isDefault ?? (existing ? existing.isDefault : count === 0);

      const row = existing
        ? await tx.address.update({ where: { id: existing.id }, data: { ...data, isDefault } })
        : await tx.address.create({ data: { ...data, isDefault } });

      // Standart manzil BITTA bo'ladi.
      if (isDefault) {
        await tx.address.updateMany({
          where: { customerId, deletedAt: null, NOT: { id: row.id } },
          data: { isDefault: false },
        });
      }
      return row;
    });

    return this.addresses(customerId).then((list) => list.find((a) => a.id === saved.id) ?? null);
  }

  /**
   * Manzil O'CHIRILMAYDI, `deletedAt` qo'yiladi: eski buyurtmalarda
   * manzil nusxasi saqlangan, lekin mijoz ro'yxatini toza ko'rishi kerak.
   */
  async deleteAddress(customerId: string, addressId: string) {
    const row = await this.prisma.address.findFirst({
      where: { id: addressId, customerId, deletedAt: null },
      select: { id: true, isDefault: true },
    });
    if (!row) throw new NotFoundException('Manzil topilmadi');

    await this.prisma.$transaction(async (tx) => {
      await tx.address.update({
        where: { id: row.id },
        data: { deletedAt: new Date(), isDefault: false },
      });

      // Standart manzil o'chirilsa — keyingisi standart bo'ladi.
      if (row.isDefault) {
        const next = await tx.address.findFirst({
          where: { customerId, deletedAt: null },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });

    return this.addresses(customerId);
  }

  async setDefaultAddress(customerId: string, addressId: string) {
    const row = await this.prisma.address.findFirst({
      where: { id: addressId, customerId, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Manzil topilmadi');

    await this.prisma.$transaction([
      this.prisma.address.updateMany({ where: { customerId }, data: { isDefault: false } }),
      this.prisma.address.update({ where: { id: row.id }, data: { isDefault: true } }),
    ]);
    return this.addresses(customerId);
  }

  /* ------------------------------- Sevimlilar ------------------------------- */

  async wishlist(customerId: string) {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                slug: true,
                nameUz: true,
                nameRu: true,
                status: true,
                deletedAt: true,
                images: { where: { kind: 'MAIN' }, take: 1, select: { url: true, urlWebp: true } },
              },
            },
            inventory: { select: { totalStock: true, reservedStock: true } },
          },
        },
      },
    });

    const now = new Date();
    return rows
      .filter((w: WishlistRow) => !w.variant.product.deletedAt)
      .map((w: WishlistRow) => {
        const price = effectivePrice(w.variant, now);
        const available = w.variant.inventory.reduce(
          (s, inv) => s + Math.max(inv.totalStock - inv.reservedStock, 0),
          0,
        );
        const options = (w.variant.options ?? {}) as Record<string, string>;

        return {
          id: w.id,
          variantId: w.variantId,
          productId: w.variant.product.id,
          slug: w.variant.product.slug,
          nameUz: w.variant.product.nameUz,
          nameRu: w.variant.product.nameRu,
          variantLabel: Object.values(options).join(' / ') || w.variant.sku,
          imageUrl:
            w.variant.product.images[0]?.urlWebp ?? w.variant.product.images[0]?.url ?? null,
          price: price.price.toString(),
          oldPrice: price.oldPrice?.toString() ?? null,
          availableStock: available,
          /** Sotuvdan chiqarilgan bo'lsa — "sotuvda yo'q" deb ko'rsatiladi. */
          onSale: w.variant.product.status === 'ACTIVE' && w.variant.isActive,
          addedAt: w.createdAt,
        };
      });
  }

  async addToWishlist(customerId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, deletedAt: null },
      select: { id: true },
    });
    if (!variant) throw new NotFoundException('Mahsulot topilmadi');

    await this.prisma.wishlistItem
      .create({ data: { customerId, variantId } })
      // Takroriy qo'shish xato emas — tugma ikki marta bosilgan.
      .catch((e: { code?: string }) => {
        if (e.code !== 'P2002') throw e;
      });

    return this.wishlist(customerId);
  }

  async removeFromWishlist(customerId: string, variantId: string) {
    await this.prisma.wishlistItem.deleteMany({ where: { customerId, variantId } });
    return this.wishlist(customerId);
  }

  /* -------------------------------- Rozilik -------------------------------- */

  /**
   * Joriy roziliklar: har bir tur bo'yicha ENG OXIRGI yozuv.
   * Tarix o'chirilmaydi, faqat yangi yozuv qo'shiladi.
   */
  async consents(customerId: string) {
    const rows = await this.prisma.consent.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const latest = new Map<string, ConsentRow>();
    for (const row of rows) {
      if (!latest.has(row.type)) latest.set(row.type, row);
    }

    return {
      current: [...latest.values()].map((c) => ({
        type: c.type,
        granted: c.granted,
        documentSlug: c.documentSlug,
        documentVer: c.documentVer,
        at: c.createdAt,
      })),
      history: rows.map((c: ConsentRow) => ({
        type: c.type,
        granted: c.granted,
        documentSlug: c.documentSlug,
        documentVer: c.documentVer,
        at: c.createdAt,
      })),
    };
  }

  async setConsent(customerId: string, dto: ConsentDto, ip?: string, userAgent?: string) {
    await this.prisma.consent.create({
      data: {
        customerId,
        type: dto.type as never,
        granted: dto.granted,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      },
    });
    this.logger.log(`Rozilik: ${customerId} — ${dto.type} = ${dto.granted}`);
    return this.consents(customerId);
  }

  /**
   * Mijozning barcha ma'lumotlarini bir faylda beradi.
   *
   * TZ da bunday imkon yo'q edi (ekspertiza C-9), lekin shaxsiy
   * ma'lumotlar to'g'risidagi qonun "menda qanday ma'lumot bor"
   * degan savolga javob berishni talab qiladi.
   */
  async exportData(customerId: string) {
    const [customer, orders, addresses, consents, returns, wishlist] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: customerId } }),
      this.prisma.order.findMany({
        where: { customerId },
        include: { items: true },
        orderBy: { placedAt: 'desc' },
      }),
      this.prisma.address.findMany({ where: { customerId } }),
      this.prisma.consent.findMany({ where: { customerId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.return.findMany({ where: { customerId }, include: { items: true } }),
      this.prisma.wishlistItem.findMany({ where: { customerId } }),
    ]);
    if (!customer) throw new NotFoundException('Mijoz topilmadi');

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        phone: customer.phone,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        locale: customer.locale,
        createdAt: customer.createdAt,
      },
      orders: orders.map((o: OrderExportRow) => ({
        number: o.number,
        placedAt: o.placedAt,
        status: o.status,
        grandTotal: (o.grandTotal as bigint).toString(),
        address: [o.regionName, o.districtName, o.addressLine].filter(Boolean).join(', '),
        items: o.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          lineTotal: (i.lineTotal as bigint).toString(),
        })),
      })),
      addresses,
      consents,
      returns: returns.map(
        (r: { number: string; status: string; createdAt: Date; refundAmount: bigint }) => ({
          number: r.number,
          status: r.status,
          refundAmount: (r.refundAmount as bigint).toString(),
          createdAt: r.createdAt,
        }),
      ),
      wishlistCount: wishlist.length,
    };
  }
}

/* ------------------------------- Tiplar ------------------------------- */

interface AddressRow {
  id: string;
  label: string | null;
  recipient: string;
  phone: string;
  regionId: string;
  districtId: string | null;
  street: string;
  landmark: string | null;
  isDefault: boolean;
  region?: { nameUz: string; nameRu: string } | null;
  district?: { nameUz: string; nameRu: string } | null;
}

interface WishlistRow {
  id: string;
  variantId: string;
  createdAt: Date;
  variant: {
    sku: string;
    isActive: boolean;
    options: unknown;
    price: bigint;
    oldPrice: bigint | null;
    saleStartsAt: Date | null;
    saleEndsAt: Date | null;
    inventory: Array<{ totalStock: number; reservedStock: number }>;
    product: {
      id: string;
      slug: string;
      nameUz: string;
      nameRu: string;
      status: string;
      deletedAt: Date | null;
      images: Array<{ url: string; urlWebp: string | null }>;
    };
  };
}

interface ConsentRow {
  type: string;
  granted: boolean;
  documentSlug: string | null;
  documentVer: string | null;
  createdAt: Date;
}

interface OrderExportRow {
  number: string;
  placedAt: Date;
  status: string;
  grandTotal: bigint;
  regionName: string | null;
  districtName: string | null;
  addressLine: string | null;
  items: Array<{ productName: string; quantity: number; lineTotal: bigint }>;
}
