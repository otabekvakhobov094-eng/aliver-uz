import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePhone } from '../../common/phone';
import { LOYAL_FROM_ORDERS, REPEAT_FROM_ORDERS, SLEEPING_AFTER_DAYS, segmentOf } from './segment';

/**
 * Mijozlar (admin tomoni).
 *
 * Segment har safar JONLI ko'rsatkichlardan hisoblanadi.
 * `segmentCached` faqat hisobotlarni tezlashtirish uchun — unga
 * qaror qabul qilishda tayanilmaydi, chunki u eskirgan bo'lishi mumkin.
 */
@Injectable()
export class CustomerAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: {
    q?: string;
    segment?: string;
    status?: string;
    page?: number;
    perPage?: number;
  }) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 30;

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.q) {
      const q = query.q.trim();
      const digits = q.replace(/\D/g, '');
      where.OR = [
        ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const sleepingBefore = new Date(Date.now() - SLEEPING_AFTER_DAYS * 24 * 3600 * 1000);
    if (query.segment === 'SLEEPING') {
      where.lastOrderAt = { lt: sleepingBefore };
    } else if (query.segment) {
      // Qolgan segmentlar "uxlab qolgan" bo'lmaganlar orasidan tanlanadi.
      // Shart `AND` ga qo'yiladi: qidiruvdagi `OR` bilan aralashib
      // ketmasligi kerak.
      where.AND = [{ OR: [{ lastOrderAt: null }, { lastOrderAt: { gte: sleepingBefore } }] }];
      if (query.segment === 'NEW') where.ordersCount = { lte: 1 };
      if (query.segment === 'REPEAT') {
        where.ordersCount = { gte: REPEAT_FROM_ORDERS, lt: LOYAL_FROM_ORDERS };
      }
      if (query.segment === 'LOYAL') where.ordersCount = { gte: LOYAL_FROM_ORDERS };
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.customer.count({ where: where as never }),
      this.prisma.customer.findMany({
        where: where as never,
        orderBy: [{ lastOrderAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return {
      items: rows.map((c: CustomerRow) => ({
        id: c.id,
        phone: c.phone,
        email: c.email,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || null,
        status: c.status,
        locale: c.locale,
        ordersCount: c.ordersCount,
        totalSpent: (c.totalSpent as bigint).toString(),
        lastOrderAt: c.lastOrderAt,
        segment: segmentOf(c),
        createdAt: c.createdAt,
      })),
      total,
      page,
      perPage,
    };
  }

  async get(id: string) {
    const c = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        addresses: {
          where: { deletedAt: null },
          include: { region: { select: { nameUz: true } }, district: { select: { nameUz: true } } },
        },
        orders: {
          where: { deletedAt: null },
          orderBy: { placedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            number: true,
            status: true,
            paymentStatus: true,
            grandTotal: true,
            placedAt: true,
          },
        },
        returns: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, number: true, status: true, refundAmount: true, createdAt: true },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { admin: { select: { fullName: true } } },
        },
        consents: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!c) throw new NotFoundException('Mijoz topilmadi');

    // Rozilikning joriy holati — har tur bo'yicha ENG OXIRGI yozuv.
    const latest = new Map<string, { granted: boolean; at: Date }>();
    for (const row of c.consents) {
      if (!latest.has(row.type)) latest.set(row.type, { granted: row.granted, at: row.createdAt });
    }

    return {
      id: c.id,
      phone: c.phone,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      status: c.status,
      locale: c.locale,
      telegramLinked: Boolean(c.telegramChatId),
      segment: segmentOf(c),
      stats: {
        ordersCount: c.ordersCount,
        totalSpent: (c.totalSpent as bigint).toString(),
        avgCheck:
          c.ordersCount > 0 ? ((c.totalSpent as bigint) / BigInt(c.ordersCount)).toString() : '0',
        firstOrderAt: c.firstOrderAt,
        lastOrderAt: c.lastOrderAt,
      },
      addresses: c.addresses.map((a: AddressRow) => ({
        id: a.id,
        label: a.label,
        recipient: a.recipient,
        phone: a.phone,
        address: [a.region?.nameUz, a.district?.nameUz, a.street].filter(Boolean).join(', '),
        isDefault: a.isDefault,
      })),
      orders: c.orders.map((o: OrderRow) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        paymentStatus: o.paymentStatus,
        grandTotal: (o.grandTotal as bigint).toString(),
        placedAt: o.placedAt,
      })),
      returns: c.returns.map((r: ReturnRow) => ({
        id: r.id,
        number: r.number,
        status: r.status,
        refundAmount: (r.refundAmount as bigint).toString(),
        createdAt: r.createdAt,
      })),
      notes: c.notes.map((n: NoteRow) => ({
        id: n.id,
        body: n.body,
        adminName: n.admin?.fullName ?? null,
        createdAt: n.createdAt,
      })),
      consents: [...latest.entries()].map(([type, v]) => ({ type, ...v })),
      createdAt: c.createdAt,
    };
  }

  async addNote(customerId: string, adminId: string, body: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');
    if (!body.trim()) throw new BadRequestException('Izoh bo‘sh bo‘lishi mumkin emas');

    await this.prisma.customerNote.create({ data: { customerId, adminId, body: body.trim() } });
    return this.get(customerId);
  }

  /**
   * Mijozni bloklash.
   *
   * Yozuv O'CHIRILMAYDI: buyurtmalar, fiskal cheklar va roziliklar
   * unga bog'langan. Bloklangan mijoz kira olmaydi va buyurtma
   * berolmaydi; barcha sessiyalari yopiladi.
   */
  async setStatus(customerId: string, status: 'ACTIVE' | 'BLOCKED') {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Mijoz topilmadi');

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { status: status as never },
    });
    if (status === 'BLOCKED') {
      await this.prisma.customerSession.deleteMany({ where: { customerId } });
    }
    return this.get(customerId);
  }

  /**
   * Telefon bo'yicha tez qidiruv — operator qo'ng'iroq paytida
   * ishlatadi. Ro'yxatdan o'tmagan mijozning buyurtmalari ham topiladi.
   */
  async findByPhone(phoneRaw: string) {
    const phone = normalizePhone(phoneRaw);
    const c = await this.prisma.customer.findFirst({
      where: { phone, deletedAt: null },
      select: { id: true },
    });
    if (c) return { customer: await this.get(c.id), guestOrders: [] };

    const orders = await this.prisma.order.findMany({
      where: { contactPhone: phone, deletedAt: null },
      orderBy: { placedAt: 'desc' },
      take: 10,
      select: { id: true, number: true, status: true, grandTotal: true, placedAt: true },
    });

    return {
      customer: null,
      guestOrders: orders.map((o: GuestOrderRow) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        grandTotal: (o.grandTotal as bigint).toString(),
        placedAt: o.placedAt,
      })),
    };
  }
}

/* -------------------------------- Tiplar -------------------------------- */

interface CustomerRow {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  status: string;
  locale: string;
  ordersCount: number;
  totalSpent: bigint;
  lastOrderAt: Date | null;
  createdAt: Date;
}

interface AddressRow {
  id: string;
  label: string | null;
  recipient: string;
  phone: string;
  street: string;
  isDefault: boolean;
  region?: { nameUz: string } | null;
  district?: { nameUz: string } | null;
}

interface OrderRow {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  grandTotal: bigint;
  placedAt: Date;
}

interface GuestOrderRow {
  id: string;
  number: string;
  status: string;
  grandTotal: bigint;
  placedAt: Date;
}

interface ReturnRow {
  id: string;
  number: string;
  status: string;
  refundAmount: bigint;
  createdAt: Date;
}

interface NoteRow {
  id: string;
  body: string;
  createdAt: Date;
  admin?: { fullName: string } | null;
}
