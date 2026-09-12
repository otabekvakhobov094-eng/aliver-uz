import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EXPIRY_MONTHS,
  EXPIRY_WARN_DAYS,
  MAX_REDEEM_SHARE,
  POINTS_PER_SUM,
  TIYIN_PER_POINT,
  expiryState,
  planRedeem,
  pointsForOrder,
  pointsToTiyin,
  reversalFor,
} from './loyalty-rules';

/**
 * Sodiqlik dasturi — TZ-3.
 *
 * Balans hech qayerda SAQLANMAYDI — u har doim harakatlar yig'indisi.
 * Alohida ustun tezroq bo'lardi, lekin u bir marta haqiqatdan chetga
 * chiqsa (yarim bajarilgan tranzaksiya, qo'lda tuzatish), qaysi biri
 * to'g'riligini aniqlashning iloji bo'lmasdi. Pul bilan bog'liq joyda
 * bu qabul qilinmaydi.
 *
 * Takrorlanishdan himoya BAZADA: `(orderId, kind)` bo'yicha unikal
 * indeks. Webhook takror kelsa yoki operator ikki marta bossa, ikkinchi
 * yozuv o'tmaydi — bu kafolat kodga ishonib qo'yilmagan.
 */
/**
 * Prisma ning «bunday yozuv allaqachon bor» xatosi.
 *
 * NEGA TEKSHIRILADI. Ilgari `catch` HAMMA xatoni «allaqachon
 * berilgan» deb hisoblardi: bazaga ulanish uzilsa ham, boshqa
 * cheklov buzilsa ham log'da «ball allaqachon berilgan» deb
 * yozilardi. Natijada mijoz to'lagan, ball esa berilmagan bo'lardi
 * va buni hech kim bilmasdi — na xato, na ogohlantirish.
 */
function isDuplicate(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Mijozning joriy balansi va uning so'mdagi qiymati. */
  async balance(customerId: string) {
    const [agg, lastActivity] = await Promise.all([
      this.prisma.loyaltyEntry.aggregate({
        where: { customerId },
        _sum: { points: true },
      }),
      // Oxirgi FAOLIYAT — EXPIRE yozuvisiz.
      //
      // EXPIRE ni tizim o'zi yozadi va uni faoliyat deb hisoblash
      // muddatni o'zi qaytadan uzaytirardi: ball kuyadi, sana esa yana
      // 12 oyga suriladi va keyingi safar kuyadigan narsa qolmaydi.
      // Ya'ni qoida bir marta ishlab, keyin jim o'chib qolardi.
      this.prisma.loyaltyEntry.findFirst({
        where: { customerId, kind: { not: 'EXPIRE' } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);
    const points = agg._sum.points ?? 0;
    const last = lastActivity?.createdAt ?? null;

    return {
      points,
      // «Ikki valyuta»: ball har doim so'mda ham ko'rsatiladi. Faqat
      // ball ko'rsatish mijozga hech narsa demaydi — «1 250 ball»
      // qancha ekanini u bilmaydi va shuning uchun ishlatmaydi ham.
      amount: pointsToTiyin(points).toString(),
      rate: {
        pointsPerSum: POINTS_PER_SUM.toString(),
        tiyinPerPoint: TIYIN_PER_POINT.toString(),
        maxRedeemSharePercent: MAX_REDEEM_SHARE,
        expiryMonths: EXPIRY_MONTHS,
        expiryWarnDays: EXPIRY_WARN_DAYS,
      },
      // Ballar oxirgi harakatdan 12 oy keyin kuyadi — sana ochiq
      // ko'rsatiladi, aks holda u kutilmaganda yo'qolib qolardi.
      //
      // Balans nol bo'lsa sana KO'RSATILMAYDI: «0 ball 12 oydan keyin
      // kuyadi» degan yozuvning ma'nosi yo'q va u mijozni chalg'itadi.
      ...expiryState({ lastActivityAt: last, balance: points, now: new Date() }),
    };
  }

  async history(customerId: string, limit = 50) {
    const rows = await this.prisma.loyaltyEntry.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        kind: true,
        points: true,
        amount: true,
        comment: true,
        createdAt: true,
        order: { select: { number: true } },
      },
    });
    return rows.map((r) => ({
      ...r,
      amount: r.amount.toString(),
      orderNumber: r.order?.number ?? null,
      order: undefined,
    }));
  }

  /**
   * Buyurtma uchun ball berish. To'lov TASDIQLANGANDA chaqiriladi.
   *
   * Buyurtma yaratilganda emas: to'lanmagan yoki bekor qilingan
   * buyurtma ball bermasligi kerak, aks holda ball ishlab chiqarish
   * uchun buyurtma berib, to'lamay qo'yish yetarli bo'lardi.
   */
  async earnForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        subtotal: true,
        discountTotal: true,
        paymentStatus: true,
      },
    });
    // Mehmon buyurtmasi uchun ball yo'q: uni yozib qo'yadigan hisob yo'q.
    if (!order?.customerId) return null;
    if (order.paymentStatus !== 'PAID') return null;

    const redeemed = await this.prisma.loyaltyEntry.findFirst({
      where: { orderId, kind: 'REDEEM' },
      select: { amount: true },
    });

    const points = pointsForOrder({
      itemsTotalAfterDiscount: (order.subtotal as bigint) - (order.discountTotal as bigint),
      // Ball bilan qoplangan qismga ball BERILMAYDI — aks holda mijoz
      // ballarni aylantirib, cheksiz ball ishlab chiqarardi.
      paidWithPoints: redeemed ? -(redeemed.amount as bigint) : 0n,
    });
    if (points <= 0) return null;

    try {
      return await this.prisma.loyaltyEntry.create({
        data: {
          customerId: order.customerId,
          kind: 'EARN',
          points,
          amount: pointsToTiyin(points),
          orderId,
        },
        select: { id: true, points: true },
      });
    } catch (error) {
      if (isDuplicate(error)) {
        // Unikal indeks — ball allaqachon berilgan. Bu XATO EMAS:
        // webhook takror kelgan.
        this.logger.log(`Ball allaqachon berilgan (buyurtma ${orderId})`);
        return null;
      }
      /*
       * Boshqa har qanday xato — HAQIQIY nosozlik. Uni yutib
       * yuborsak, mijoz to'lagan bo'lib ball olmay qoladi va bu
       * hech qayerda ko'rinmaydi. Shuning uchun log'ga xato
       * darajasida yoziladi va yuqoriga uzatiladi.
       */
      this.logger.error(
        `Ball berishda xato (buyurtma ${orderId}): ${(error as Error)?.message ?? error}`,
      );
      throw error;
    }
  }

  /** Checkout uchun: shu summada nechta ball ishlatish mumkin. */
  async quote(customerId: string, itemsTotalAfterDiscount: bigint, requestedPoints: number) {
    const { points: balance } = await this.balance(customerId);
    return planRedeem({ requestedPoints, balance, itemsTotalAfterDiscount });
  }

  /**
   * Ballarni buyurtmaga yozish. Buyurtma tranzaksiyasi ICHIDA
   * chaqiriladi — `tx` shuning uchun parametr.
   */
  async redeem(
    tx: {
      loyaltyEntry: { create: (args: unknown) => Promise<unknown> };
      $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
    },
    params: { customerId: string; orderId: string; points: number; amount: bigint },
  ) {
    if (params.points <= 0) return;

    /*
     * BALANS AYNAN SHU YERDA, TRANZAKSIYA ICHIDA QAYTA TEKSHIRILADI.
     *
     * Ilgari tekshiruv faqat `quote` da edi — u esa tranzaksiyadan
     * TASHQARIDA, buyurtma yaratilishidan oldin chaqiriladi. Ikki
     * so'rov bir vaqtda kelsa (ikkita varaq, ilovaning qayta
     * urinishi, ikki marta bosilgan tugma) ikkalasi ham o'sha
     * balansni ko'rardi va ikkalasi ham chiqim yozardi: 100 balli
     * mijoz 200 ball sarflab, balansi −100 bo'lardi. `(orderId, kind)`
     * unikal indeksi bunga to'sqinlik qilmaydi — buyurtmalar boshqa.
     *
     * `FOR UPDATE` mijozning mavjud qatorlarini qulflaydi: ikkinchi
     * tranzaksiya birinchisi tugaguncha kutadi va keyin YANGI
     * yig'indini ko'radi. Qator umuman bo'lmasa balans nol — u holda
     * quyidagi shart baribir rad etadi.
     */
    // Ikki so'rov: PostgreSQL `FOR UPDATE` ni agregat bilan birga
    // ishlatishga ruxsat bermaydi. Avval qatorlar qulflanadi,
    // keyin yig'indi olinadi — qulf olingandan keyingi holat bo'yicha.
    await tx.$queryRaw`
      SELECT id FROM loyalty_entries
      WHERE "customerId" = ${params.customerId}::uuid
      FOR UPDATE
    `;
    const rows = (await tx.$queryRaw`
      SELECT COALESCE(SUM(points), 0)::int AS balance
      FROM loyalty_entries
      WHERE "customerId" = ${params.customerId}::uuid
    `) as Array<{ balance: number }>;
    const balance = rows[0]?.balance ?? 0;

    if (balance < params.points) {
      throw new BadRequestException(
        `Ball yetarli emas: balansda ${balance} ta, so‘ralgan ${params.points} ta`,
      );
    }

    await tx.loyaltyEntry.create({
      data: {
        customerId: params.customerId,
        kind: 'REDEEM',
        // Chiqim MANFIY yoziladi: balans oddiy yig'indi bo'lib qolsin
        // va hech qayerda «kind ga qarab qo'shish yoki ayirish» degan
        // shart bo'lmasin.
        points: -Math.floor(params.points),
        amount: -params.amount,
        orderId: params.orderId,
      },
    });
  }

  /**
   * Buyurtma bekor qilinganda yoki qaytarilganda.
   *
   * Ikki tomonlama bo'lishi SHART: berilgan ball olinadi, ishlatilgan
   * ball qaytariladi. Faqat bittasini qilish mijozni yo yutuqda, yo
   * zararda qoldirardi — ikkalasi ham shikoyat.
   */
  async reverseForOrder(orderId: string) {
    const entries = await this.prisma.loyaltyEntry.findMany({
      where: { orderId, kind: { in: ['EARN', 'REDEEM'] } },
      select: { customerId: true, kind: true, points: true, amount: true },
    });
    if (entries.length === 0) return null;

    const earned = entries.find((e) => e.kind === 'EARN');
    const spent = entries.find((e) => e.kind === 'REDEEM');
    const { take, giveBack } = reversalFor({
      earned: earned?.points ?? 0,
      redeemed: spent ? Math.abs(spent.points) : 0,
    });

    const net = giveBack - take;
    const amount =
      (spent ? -(spent.amount as bigint) : 0n) - (earned ? (earned.amount as bigint) : 0n);

    try {
      return await this.prisma.loyaltyEntry.create({
        data: {
          customerId: entries[0]!.customerId,
          kind: 'REVERSAL',
          points: net,
          amount,
          orderId,
          comment: 'Buyurtma bekor qilindi yoki qaytarildi',
        },
        select: { id: true, points: true },
      });
    } catch (error) {
      if (isDuplicate(error)) {
        // Allaqachon qaytarilgan — takroriy chaqiruv.
        return null;
      }
      this.logger.error(
        `Ballarni qaytarishda xato (buyurtma ${orderId}): ${(error as Error)?.message ?? error}`,
      );
      throw error;
    }
  }

  /** Admin qo'lda tuzatishi. Izoh MAJBURIY — bu pul bilan bog'liq amal. */
  async adjust(params: {
    customerId: string;
    points: number;
    comment: string;
    adminId?: string;
  }) {
    if (!Number.isInteger(params.points) || params.points === 0) {
      throw new BadRequestException('Ball butun va noldan farqli bo‘lishi kerak');
    }
    if (params.comment.trim().length < 3) {
      throw new BadRequestException('Izoh majburiy — bu pul bilan bog‘liq amal');
    }

    // Balansni manfiyga tushirmaymiz: manfiy balans mijozga «qarzdorsiz»
    // deb ko'rinardi va buning ma'nosi yo'q.
    const { points: current } = await this.balance(params.customerId);
    if (current + params.points < 0) {
      throw new BadRequestException(
        `Balans manfiy bo‘lib qoladi: hozir ${current} ball`,
      );
    }

    return this.prisma.loyaltyEntry.create({
      data: {
        customerId: params.customerId,
        kind: 'ADJUST',
        points: params.points,
        amount: pointsToTiyin(Math.abs(params.points)) * (params.points < 0 ? -1n : 1n),
        comment: params.comment.trim(),
        adminId: params.adminId ?? null,
      },
      select: { id: true, points: true },
    });
  }
}
