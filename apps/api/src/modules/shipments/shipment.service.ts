import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderService } from '../orders/order.service';
import {
  SHIPMENT_TO_ORDER,
  SHIPPABLE_ORDER_STATUSES,
  type ShipmentStatus,
  assertShipmentTransition,
  carrierTrackUrl,
} from './shipment-state';
import {
  type OrderStatus,
  canTransitionOrder,
} from '../../common/state-machine/order-state-machine';

/**
 * Jo'natmalar.
 *
 * TZ 32-bo'limda "kuryer biriktiriladi" deyilgan, lekin qayerda
 * saqlanishi va buyurtma holatiga qanday ta'sir qilishi yozilmagan
 * (ekspertiza C-3). Bu servis ikkalasini ham hal qiladi:
 *
 *  - kuryer, tashuvchi va trek raqami jo'natmada saqlanadi;
 *  - jo'natma "yo'lda" bo'lsa buyurtma `SHIPPED`, "yetkazildi" bo'lsa
 *    `DELIVERED` bo'ladi — ikkisini qo'lda ikki joyda o'zgartirish
 *    shart emas va ular bir-biriga zid bo'lib qolmaydi.
 */
@Injectable()
export class ShipmentService {
  private readonly logger = new Logger(ShipmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrderService,
  ) {}

  async forOrder(orderId: string) {
    const rows = await this.prisma.shipment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((s: ShipmentRow) => this.view(s));
  }

  private view(s: ShipmentRow) {
    return {
      id: s.id,
      orderId: s.orderId,
      status: s.status,
      carrier: s.carrier,
      trackingNo: s.trackingNo,
      trackUrl: carrierTrackUrl(s.carrier, s.trackingNo),
      courierName: s.courierName,
      courierPhone: s.courierPhone,
      shippedAt: s.shippedAt,
      deliveredAt: s.deliveredAt,
      note: s.note,
      createdAt: s.createdAt,
    };
  }

  /**
   * Jo'natma yaratadi yoki mavjudini yangilaydi.
   *
   * Bitta buyurtmaga bitta faol jo'natma: ikkinchisini yaratish o'rniga
   * mavjudi tahrirlanadi. Aks holda kuryer ikki marta chiqib ketardi.
   */
  async assign(params: {
    orderId: string;
    carrier: string;
    courierName?: string | null;
    courierPhone?: string | null;
    trackingNo?: string | null;
    note?: string | null;
    adminId?: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, number: true, status: true, deliveryType: true },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    if (!SHIPPABLE_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `Bu holatdagi buyurtmaga kuryer biriktirib bo‘lmaydi: ${order.status}`,
      );
    }
    if (order.deliveryType === 'PICKUP') {
      throw new BadRequestException('Olib ketish buyurtmasiga kuryer kerak emas');
    }

    const existing = await this.prisma.shipment.findFirst({
      where: { orderId: order.id, status: { notIn: ['RETURNED', 'DELIVERED'] } },
      orderBy: { createdAt: 'desc' },
    });

    const data = {
      carrier: params.carrier,
      courierName: params.courierName?.trim() || null,
      courierPhone: params.courierPhone?.trim() || null,
      trackingNo: params.trackingNo?.trim() || null,
      note: params.note?.trim() || null,
      status: 'ASSIGNED' as never,
    };

    let shipment;
    if (existing) {
      shipment = await this.prisma.shipment.update({ where: { id: existing.id }, data });
    } else {
      try {
        shipment = await this.prisma.shipment.create({ data: { orderId: order.id, ...data } });
      } catch (e) {
        // Ikki operator bir vaqtda bosgan bo'lsa (bazada qisman unikal
        // indeks bor — migratsiya hujjatiga qarang), ikkinchisi shu
        // yerga tushadi va mavjud jo'natmani yangilaydi.
        if ((e as { code?: string }).code !== 'P2002') throw e;
        const again = await this.prisma.shipment.findFirst({
          where: { orderId: order.id, status: { notIn: ['RETURNED', 'DELIVERED'] } },
          orderBy: { createdAt: 'desc' },
        });
        if (!again) throw e;
        shipment = await this.prisma.shipment.update({ where: { id: again.id }, data });
      }
    }

    this.logger.log(
      `Buyurtma ${order.number}: kuryer biriktirildi (${params.carrier}` +
        `${params.courierName ? `, ${params.courierName}` : ''})`,
    );
    return this.view(shipment as ShipmentRow);
  }

  /**
   * Jo'natma holatini o'zgartiradi va kerak bo'lsa buyurtmani ham
   * ilgari suradi.
   *
   * Buyurtma holatini o'zgartirish `OrderService.changeStatus` orqali
   * boradi — ya'ni holat mashinasi, tarix, bildirishnoma va ombor
   * amallari o'z-o'zidan ishlaydi.
   */
  async changeStatus(params: {
    shipmentId: string;
    to: ShipmentStatus;
    adminId?: string;
    note?: string;
  }) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: params.shipmentId },
      include: { order: { select: { id: true, number: true, status: true } } },
    });
    if (!shipment) throw new NotFoundException('Jo‘natma topilmadi');

    const from = shipment.status as ShipmentStatus;
    assertShipmentTransition(from, params.to);

    // Buyurtma holatini OLDINDAN tekshiramiz.
    //
    // Ilgari bu tekshiruv jo'natma yozilgandan keyin bo'lardi va xato
    // faqat logga tushardi: jo'natma "yo'lda", buyurtma esa
    // "tasdiqlangan" bo'lib qolar, rezerv hisobdan chiqmas, naqd to'lov
    // yopilmas va fiskal chek berilmasdi — operator esa muvaffaqiyat
    // ko'rardi. Endi amal umuman bajarilmaydi va sabab aytiladi.
    const orderTarget = SHIPMENT_TO_ORDER[params.to];
    if (orderTarget && shipment.order) {
      const orderFrom = shipment.order.status as OrderStatus;
      if (orderFrom !== orderTarget && !canTransitionOrder(orderFrom, orderTarget as OrderStatus)) {
        throw new BadRequestException({
          code: 'ORDER_STATUS_BLOCKS_SHIPMENT',
          message:
            `Buyurtma hozir "${orderFrom}" holatida va undan "${orderTarget}" ga o‘tib ` +
            'bo‘lmaydi. Avval buyurtma holatini ilgari suring.',
        });
      }
    }

    const now = new Date();
    const claimed = await this.prisma.shipment.updateMany({
      where: { id: shipment.id, status: from as never },
      data: {
        status: params.to as never,
        ...(params.to === 'IN_TRANSIT' ? { shippedAt: now } : {}),
        ...(params.to === 'DELIVERED' ? { deliveredAt: now } : {}),
        ...(params.note ? { note: params.note } : {}),
      },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException('Jo‘natma holati boshqa joyda o‘zgardi — sahifani yangilang');
    }

    // Buyurtmani ilgari surish. Buyurtma allaqachon o'sha holatda
    // bo'lsa (masalan operator qo'lda o'zgartirgan) — jim o'tkazamiz.
    if (orderTarget && shipment.order && shipment.order.status !== orderTarget) {
      try {
        await this.orders.changeStatus({
          orderId: shipment.order.id,
          to: orderTarget,
          adminId: params.adminId,
          source: 'SHIPMENT',
          comment: params.note ?? `Jo‘natma: ${params.to}`,
        });
      } catch (e) {
        // Bu yerga faqat poyga holatida tushamiz (yuqoridagi tekshiruvdan
        // keyin holat o'zgargan). Jo'natma o'zgarishi yozilgan, shuning
        // uchun operatorga ochiq aytamiz.
        this.logger.error(
          `Jo‘natma ${shipment.id}: buyurtma holati o‘zgartirilmadi — ${(e as Error).message}`,
        );
        throw new BadRequestException({
          code: 'ORDER_STATUS_RACE',
          message:
            'Jo‘natma yangilandi, lekin buyurtma holati o‘zgarmadi (u boshqa joyda ' +
            'o‘zgartirilgan). Sahifani yangilang.',
        });
      }
    }

    const fresh = await this.prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    return this.view(fresh as ShipmentRow);
  }

  /**
   * Kuryer varaqasi uchun ma'lumot.
   * Chop etish frontendda — bu yerda faqat toza ma'lumot.
   */
  async waybill(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        deliveryMethod: { select: { nameUz: true, type: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    const payment = order.payments[0];
    const shipment = order.shipments[0];
    const cashOnDelivery = payment?.provider === 'CASH_ON_DELIVERY' && payment?.status !== 'PAID';

    return {
      number: order.number,
      placedAt: order.placedAt,
      customer: {
        name: [order.firstName, order.lastName].filter(Boolean).join(' '),
        phone: order.contactPhone,
      },
      address: {
        region: order.regionName,
        district: order.districtName,
        line: order.addressLine,
        landmark: order.landmark,
      },
      delivery: {
        method: order.deliveryMethod?.nameUz ?? order.deliveryType,
        etaFrom: order.deliveryEtaFrom,
        etaTo: order.deliveryEtaTo,
        carrier: shipment?.carrier ?? null,
        courierName: shipment?.courierName ?? null,
        courierPhone: shipment?.courierPhone ?? null,
        trackingNo: shipment?.trackingNo ?? null,
      },
      items: order.items.map(
        (i: {
          productName: string;
          variantName: string | null;
          sku: string;
          quantity: number;
          lineTotal: bigint;
        }) => ({
          name: [i.productName, i.variantName].filter(Boolean).join(', '),
          sku: i.sku,
          quantity: i.quantity,
          lineTotal: (i.lineTotal as bigint).toString(),
        }),
      ),
      totals: {
        grandTotal: (order.grandTotal as bigint).toString(),
        shippingTotal: (order.shippingTotal as bigint).toString(),
      },
      /** Kuryer mijozdan pul olishi kerakmi — varaqada eng muhim qator. */
      collectCash: cashOnDelivery ? (order.grandTotal as bigint).toString() : null,
      comment: order.comment,
    };
  }
}

interface ShipmentRow {
  id: string;
  orderId: string;
  status: string;
  carrier: string | null;
  trackingNo: string | null;
  courierName: string | null;
  courierPhone: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  note: string | null;
  createdAt: Date;
}
