import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { OrderService } from '../orders/order.service';

/**
 * Muddati o'tgan rezervlarni bo'shatadi.
 *
 * Ataylab alohida modulda: u ham omborga, ham buyurtmaga tegadi.
 * Agar u InventoryModule ichida qolsa, Inventory -> Orders -> Cart ->
 * Inventory aylanasi hosil bo'lardi.
 *
 * TZ da rezerv muddati umuman yo'q edi: mijoz Payme sahifasini ochib
 * qoldirsa, tovar cheksiz band bo'lib turardi (ekspertiza A-6).
 *
 * Bir necha nusxa (instance) ishlaganda vazifa faqat bittasida bajarilishi
 * uchun Redis da qisqa muddatli qulf olinadi.
 */
@Injectable()
export class ReservationScheduler {
  private readonly logger = new Logger(ReservationScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly orders: OrderService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'expire-reservations' })
  async handle(): Promise<void> {
    const locked = await this.redis.setNx('lock:reservations:expire', '1', 55);
    if (!locked) return;

    try {
      await this.expireOverdue();
    } catch (e) {
      this.logger.error(`Rezervlarni bo‘shatishda xato: ${(e as Error).message}`);
    }
  }

  /** Alohida metod — testda va admin tugmasida ham chaqirilishi mumkin. */
  async expireOverdue(now: Date = new Date()): Promise<{ checked: number; cancelled: number }> {
    // Faqat HALI YANGI buyurtmalarning rezervi qidiriladi. Tasdiqlangan
    // buyurtmalarda `expiresAt` allaqachon null qilinadi, lekin eski
    // yozuvlar qolishi mumkin — ular 500 qatorlik oynani egallab, haqiqiy
    // tashlab ketilgan buyurtmalarga navbat qoldirmasligi kerak.
    const overdue = await this.prisma.stockReservation.findMany({
      where: {
        status: 'HELD',
        expiresAt: { not: null, lt: now },
        order: { is: { status: 'NEW', paymentStatus: { not: 'PAID' } } },
      },
      select: { orderId: true },
      orderBy: { expiresAt: 'asc' },
      take: 500,
    });

    const orderIds = [
      ...new Set<string>(
        overdue
          .map((r: { orderId: string | null }) => r.orderId)
          .filter((id: string | null): id is string => Boolean(id)),
      ),
    ];
    if (orderIds.length === 0) return { checked: 0, cancelled: 0 };

    let cancelled = 0;
    for (const orderId of orderIds) {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, number: true, status: true, paymentStatus: true },
      });
      if (!order) continue;

      // So'rov va shu tekshiruv orasida holat o'zgargan bo'lishi mumkin.
      if (order.paymentStatus === 'PAID' || order.status !== 'NEW') continue;

      // Bekor qilish AYNAN admin bosgandagi yo'l bilan bajariladi:
      // holat mashinasi, tarix, rezervni bo'shatish va chegirma limitini
      // qaytarish — hammasi bir joyda. Aks holda cron bilan bekor qilingan
      // buyurtmada promo-kod hisobi qaytmay qolardi.
      try {
        await this.orders.changeStatus({
          orderId,
          to: 'CANCELLED',
          source: 'SYSTEM',
          comment: 'To‘lov muddati tugadi — rezerv avtomatik bo‘shatildi',
        });
        cancelled += 1;
        this.logger.log(`Buyurtma ${order.number} to‘lov muddati tugagani uchun bekor qilindi`);
      } catch (e) {
        // Boshqa joyda holat o'zgargan bo'lsa (operator tasdiqlab yuborgan) —
        // bu xato emas, keyingi buyurtmaga o'tamiz.
        this.logger.warn(`Buyurtma ${order.number} bekor qilinmadi: ${(e as Error).message}`);
      }
    }

    await this.warnPaidButExpired(now);
    return { checked: orderIds.length, cancelled };
  }

  /**
   * To'langan buyurtma rezervi HECH QACHON avtomatik bo'shatilmaydi.
   * Lekin bunday holat o'zi muammo belgisi — to'lov kelgan, ammo operator
   * buyurtmani tasdiqlamagan. Shuning uchun logga chiqariladi.
   */
  private async warnPaidButExpired(now: Date): Promise<void> {
    const stuck = await this.prisma.stockReservation.findMany({
      where: {
        status: 'HELD',
        expiresAt: { not: null, lt: now },
        order: { is: { paymentStatus: 'PAID', status: 'NEW' } },
      },
      select: { order: { select: { number: true } } },
      take: 50,
    });

    for (const row of stuck) {
      this.logger.warn(
        `Buyurtma ${row.order?.number}: to‘lov qabul qilingan, lekin tasdiqlanmagan — rezerv muddati o‘tdi, qo‘lda ko‘rib chiqilsin`,
      );
    }
  }

  /** Egasiz (buyurtmasiz) va eskirgan savatlarni tozalaydi. */
  @Cron(CronExpression.EVERY_HOUR, { name: 'purge-carts' })
  async purgeCarts(): Promise<void> {
    const locked = await this.redis.setNx('lock:carts:purge', '1', 300);
    if (!locked) return;

    const res = await this.prisma.cart.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    if (res.count > 0) this.logger.log(`Eskirgan savatlar tozalandi: ${res.count}`);
  }
}
