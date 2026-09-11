import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, Prisma } from '@prisma/client';

@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('overview')
  @RequirePermissions('reports.view')
  async overview(@Query('from') from?: string, @Query('to') to?: string) {
    const placedAt = { gte: from ? new Date(from) : new Date(Date.now() - 30 * 86400000), lte: to ? new Date(to) : new Date() };
    const saleWhere: Prisma.OrderWhereInput = { placedAt, deletedAt: null, paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] } };
    const [orders, customers, products, leads, channels] = await Promise.all([
      this.prisma.order.aggregate({ where: saleWhere, _count: true, _sum: { grandTotal: true, discountTotal: true, shippingTotal: true } }),
      this.prisma.customer.count({ where: { createdAt: placedAt } }),
      this.prisma.orderItem.groupBy({ by: ['productName'], where: { order: saleWhere }, _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { lineTotal: 'desc' } }, take: 10 }),
      this.prisma.b2BLead.groupBy({ by: ['status'], where: { createdAt: placedAt }, _count: true }),
      this.prisma.order.groupBy({ by: ['utmSource'], where: saleWhere, _count: true, _sum: { grandTotal: true }, orderBy: { _sum: { grandTotal: 'desc' } }, take: 10 }),
    ]);
    return { period: { from: placedAt.gte, to: placedAt.lte }, orders: { count: orders._count, revenue: orders._sum?.grandTotal ?? 0n, discount: orders._sum?.discountTotal ?? 0n, shipping: orders._sum?.shippingTotal ?? 0n }, newCustomers: customers, topProducts: products, b2b: leads, attribution: channels };
  }
}
