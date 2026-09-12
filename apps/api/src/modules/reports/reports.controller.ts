import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermissions } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { UTF8_BOM, tiyinToSum, toCsv } from './report-csv';

/**
 * Davr kalitini aniq sanalarga aylantiradi. Toshkent vaqti (UTC+5)
 * bo'yicha — server UTC da ishlasa ham "bugun" mijoz uchun bugun bo'lsin.
 */
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;

function startOfLocalDay(d: Date): Date {
  const shifted = new Date(d.getTime() + TZ_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - TZ_OFFSET_MS);
}

function resolvePeriod(period: string, from?: string, to?: string): { gte: Date; lte: Date } {
  const now = new Date();
  const today = startOfLocalDay(now);
  const day = 86400000;

  switch (period) {
    case 'today':
      return { gte: today, lte: now };
    case 'yesterday':
      return { gte: new Date(today.getTime() - day), lte: today };
    case '7d':
      return { gte: new Date(today.getTime() - 6 * day), lte: now };
    case 'month': {
      const m = new Date(today);
      m.setUTCDate(1);
      return { gte: startOfLocalDay(m), lte: now };
    }
    case 'custom':
      return {
        gte: from ? new Date(from) : new Date(today.getTime() - 29 * day),
        lte: to ? new Date(to) : now,
      };
    case '30d':
    default:
      return { gte: new Date(today.getTime() - 29 * day), lte: now };
  }
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Umumiy hisobot.
   *
   * `period` shu yerda ham ishlatiladi: ilgari `resolvePeriod` faqat
   * dashboard uchun chaqirilardi va overview `from`/`to` ni xom holda
   * olardi. Natijada bitta hisobotning ikki qismi turli qoida bo'yicha
   * sana kesardi — «bugun» dashboardda Toshkent kuni, overview da esa
   * UTC kuni edi.
   */
  @Get('overview')
  @RequirePermissions('reports.view')
  async overview(
    @Query('period') period = '30d',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { gte, lte } = resolvePeriod(period, from, to);
    const placedAt = { gte, lte };
    const saleWhere: Prisma.OrderWhereInput = { placedAt, deletedAt: null, paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] } };
    const [orders, customers, products, leads, channels] = await Promise.all([
      this.prisma.order.aggregate({ where: saleWhere, _count: true, _sum: { grandTotal: true, discountTotal: true, shippingTotal: true } }),
      this.prisma.customer.count({ where: { createdAt: placedAt } }),
      this.prisma.orderItem.groupBy({ by: ['productName'], where: { order: saleWhere }, _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { lineTotal: 'desc' } }, take: 10 }),
      this.prisma.b2BLead.groupBy({ by: ['status'], where: { createdAt: placedAt }, _count: true }),
      this.prisma.order.groupBy({ by: ['utmSource'], where: saleWhere, _count: true, _sum: { grandTotal: true }, orderBy: { _sum: { grandTotal: 'desc' } }, take: 10 }),
    ]);
    return { period: { from: placedAt.gte, to: placedAt.lte, key: period }, orders: { count: orders._count, revenue: orders._sum?.grandTotal ?? 0n, discount: orders._sum?.discountTotal ?? 0n, shipping: orders._sum?.shippingTotal ?? 0n }, newCustomers: customers, topProducts: products, b2b: leads, attribution: channels };
  }

  /**
   * Dashboard KPI va grafigi. TZ-2, 4.9-bo'lim.
   *
   * Davr tanlagichi mijozda emas, serverda hisoblanadi — aks holda
   * brauzer vaqt mintaqasi bilan hisobot vaqt mintaqasi mos kelmaydi
   * va "bugungi tushum" tunda noto'g'ri chiqadi.
   */
  @Get('dashboard')
  @RequirePermissions('dashboard.view')
  async dashboard(
    @Query('period') period = '30d',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { gte, lte } = resolvePeriod(period, from, to);
    // Oldingi davr — bir xil uzunlikda, taqqoslash uchun.
    const span = lte.getTime() - gte.getTime();
    const prevGte = new Date(gte.getTime() - span);

    const paid = { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] };
    const sale = (a: Date, b: Date): Prisma.OrderWhereInput => ({
      placedAt: { gte: a, lte: b },
      deletedAt: null,
      paymentStatus: paid,
    });

    const [current, previous, allOrders, cancelled, newCustomers, lowStock, series] =
      await Promise.all([
        this.prisma.order.aggregate({
          where: sale(gte, lte),
          _count: true,
          _sum: { grandTotal: true },
        }),
        this.prisma.order.aggregate({
          where: sale(prevGte, gte),
          _count: true,
          _sum: { grandTotal: true },
        }),
        this.prisma.order.count({
          where: { placedAt: { gte, lte }, deletedAt: null },
        }),
        this.prisma.order.count({
          where: { placedAt: { gte, lte }, deletedAt: null, status: OrderStatus.CANCELLED },
        }),
        this.prisma.customer.count({ where: { createdAt: { gte, lte } } }),
        // Prisma `where` ichida ustunlarni o'zaro taqqoslay olmaydi,
        // shuning uchun xom SQL.
        this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM inventory
          WHERE "totalStock" - "reservedStock" <= "lowStockThreshold"
        `,
        this.prisma.$queryRaw<Array<{ day: Date; revenue: bigint | null; orders: bigint }>>`
          SELECT date_trunc('day', "placedAt") AS day,
                 SUM("grandTotal")::bigint     AS revenue,
                 COUNT(*)::bigint              AS orders
          FROM orders
          WHERE "placedAt" >= ${gte}
            AND "placedAt" <= ${lte}
            AND "deletedAt" IS NULL
            AND "paymentStatus" IN ('PAID', 'PARTIALLY_REFUNDED')
          GROUP BY 1
          ORDER BY 1
        `,
      ]);

    const revenue = current._sum?.grandTotal ?? 0n;
    const prevRevenue = previous._sum?.grandTotal ?? 0n;
    // O'rtacha chek butun songa yaxlitlanadi — pul har doim tiyinda.
    const avgOrder = current._count > 0 ? revenue / BigInt(current._count) : 0n;

    return {
      period: { from: gte, to: lte, key: period },
      revenue,
      orders: current._count,
      avgOrder,
      newCustomers,
      paidOrders: current._count,
      allOrders,
      cancelledOrders: cancelled,
      lowStock: Number(lowStock[0]?.count ?? 0n),
      previous: { revenue: prevRevenue, orders: previous._count },
      series: series.map((row) => ({
        day: row.day,
        revenue: row.revenue ?? 0n,
        orders: Number(row.orders),
      })),
    };
  }

  /**
   * Hisobotni CSV ga chiqarish.
   *
   * Excel CSV ni tizim kodlashida o'qiydi va O'zbek lotin harflari
   * (o', g', ') UTF-8 belgisisiz buziladi — shuning uchun boshiga BOM
   * qo'yiladi. Ajratgich ham nuqta-vergul: ruscha va o'zbekcha Windows
   * lokalida Excel vergulni ustun ajratgichi deb qabul qilmaydi.
   *
   * Pul SO'MDA yoziladi, tiyinda emas: bu fayl buxgalteriyaga boradi.
   */
  @Get('export')
  @RequirePermissions('reports.view')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @Res() res: Response,
    @Query('period') period = '30d',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { gte, lte } = resolvePeriod(period, from, to);
    const placedAt = { gte, lte };
    const saleWhere: Prisma.OrderWhereInput = {
      placedAt,
      deletedAt: null,
      paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] },
    };

    const [orders, products, channels] = await Promise.all([
      this.prisma.order.aggregate({
        where: saleWhere,
        _count: true,
        _sum: { grandTotal: true, discountTotal: true, shippingTotal: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productName'],
        where: { order: saleWhere },
        _sum: { quantity: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 100,
      }),
      this.prisma.order.groupBy({
        by: ['utmSource'],
        where: saleWhere,
        _count: true,
        _sum: { grandTotal: true },
        orderBy: { _sum: { grandTotal: 'desc' } },
        take: 50,
      }),
    ]);

    const rows: string[][] = [
      ['ALIVER.UZ hisoboti'],
      ['Davr', fmtDate(gte), fmtDate(lte)],
      [],
      ['Ko‘rsatkich', 'Qiymat'],
      ['To‘langan buyurtmalar', String(orders._count)],
      ['Tushum, so‘m', tiyinToSum(orders._sum?.grandTotal)],
      ['Chegirmalar, so‘m', tiyinToSum(orders._sum?.discountTotal)],
      ['Yetkazish, so‘m', tiyinToSum(orders._sum?.shippingTotal)],
      [],
      ['Mahsulot', 'Dona', 'Summa, so‘m'],
      ...products.map((p) => [
        p.productName,
        String(p._sum.quantity ?? 0),
        tiyinToSum(p._sum.lineTotal),
      ]),
      [],
      ['Manba', 'Buyurtma', 'Summa, so‘m'],
      ...channels.map((c) => [
        c.utmSource ?? 'to‘g‘ridan-to‘g‘ri',
        String(c._count),
        tiyinToSum(c._sum.grandTotal),
      ]),
    ];

    const csv = toCsv(rows);
    const name = `aliver-hisobot-${fmtDate(gte)}_${fmtDate(lte)}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    // BOM: bunsiz Excel o'zbek lotin harflarini buzadi.
    res.send(UTF8_BOM + csv);
  }
}
