import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  cardState,
  generateCode,
  hashCode,
  maskCode,
  normaliseCode,
  planGiftUse,
} from './giftcard-rules';

/**
 * Sovg'a sertifikatlari — TZ-3.
 *
 * Eng muhim qaror: OCHIQ KOD hech qayerda saqlanmaydi va faqat
 * yaratilganda BIR MARTA qaytariladi. Uni keyin ko'rishning iloji
 * yo'q — na adminda, na bazada. Bu noqulay, lekin sertifikat pul va
 * baza nusxasi chiqib ketsa ochiq kod bilan hammasini darhol ishlatib
 * bo'lardi.
 */
@Injectable()
export class GiftCardService {
  private readonly logger = new Logger(GiftCardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get secret(): string {
    const s = this.config.get<string>('GIFTCARD_SECRET');
    if (!s) {
      // Sir yo'q bo'lsa xesh oldindan hisoblanadigan bo'lib qoladi.
      // Bu jimgina o'tib ketmasligi kerak.
      throw new Error('GIFTCARD_SECRET sozlanmagan — sertifikat kodlari himoyasiz qoladi');
    }
    return s;
  }

  /**
   * Sertifikat yaratish. Ochiq kod FAQAT SHU YERDA qaytariladi.
   */
  async issue(params: {
    initialAmount: bigint;
    purchasedById?: string;
    recipientName?: string;
    recipientPhone?: string;
    message?: string;
    expiresAt?: Date | null;
  }) {
    if (params.initialAmount <= 0n) {
      throw new BadRequestException('Sertifikat summasi noldan katta bo‘lishi kerak');
    }

    const code = generateCode();
    const flat = normaliseCode(code);

    const card = await this.prisma.giftCard.create({
      data: {
        codeHash: hashCode(code, this.secret),
        codeTail: flat.slice(-4),
        initialAmount: params.initialAmount,
        purchasedById: params.purchasedById ?? null,
        recipientName: params.recipientName ?? null,
        recipientPhone: params.recipientPhone ?? null,
        message: params.message ?? null,
        expiresAt: params.expiresAt ?? null,
      },
      select: { id: true, initialAmount: true, expiresAt: true },
    });

    return {
      id: card.id,
      // BIR MARTA. Keyin uni hech kim, hech qayerdan ko'ra olmaydi.
      code,
      amount: card.initialAmount.toString(),
      expiresAt: card.expiresAt,
      warning:
        'Kodni hozir saqlab oling — u boshqa ko‘rsatilmaydi va tiklab bo‘lmaydi.',
    };
  }

  /** Kod bo'yicha topish va holatini hisoblash. */
  async check(code: string) {
    const card = await this.prisma.giftCard.findUnique({
      where: { codeHash: hashCode(code, this.secret) },
      include: { entries: { select: { amount: true } } },
    });
    if (!card) throw new NotFoundException('Sertifikat topilmadi');

    const spent = card.entries.reduce((sum, e) => sum + (e.amount as bigint), 0n);
    const state = cardState({
      initialAmount: card.initialAmount as bigint,
      spent,
      expiresAt: card.expiresAt,
      cancelledAt: card.cancelledAt,
    });

    return {
      id: card.id,
      masked: maskCode(`ALV-${card.codeTail}`.padEnd(20, 'X')),
      tail: card.codeTail,
      initialAmount: (card.initialAmount as bigint).toString(),
      remaining: state.remaining.toString(),
      status: state.status,
      usable: state.usable,
      reason: state.reason,
      expiresAt: card.expiresAt,
    };
  }

  /** Checkout uchun: shu buyurtmada qancha qoplanadi. */
  async quote(code: string, orderTotal: bigint) {
    const card = await this.check(code);
    if (!card.usable) {
      return {
        ...card,
        apply: '0',
        leftOnCard: card.remaining,
        coversWholeOrder: false,
      };
    }
    const plan = planGiftUse({ remaining: BigInt(card.remaining), orderTotal });
    return {
      ...card,
      apply: plan.amount.toString(),
      leftOnCard: plan.leftOnCard.toString(),
      coversWholeOrder: plan.coversWholeOrder,
    };
  }

  /**
   * Buyurtmaga yozish. Buyurtma tranzaksiyasi ICHIDA chaqiriladi.
   *
   * Ikki marta yozilishining oldini baza oladi: `(giftCardId, orderId)`
   * bo'yicha unikal indeks SPEND uchun.
   */
  async spend(
    tx: { giftCardEntry: { create: (args: unknown) => Promise<unknown> } },
    params: { giftCardId: string; orderId: string; amount: bigint },
  ) {
    if (params.amount <= 0n) return;
    await tx.giftCardEntry.create({
      data: {
        giftCardId: params.giftCardId,
        kind: 'SPEND',
        // Chiqim MUSBAT: yig'indi har doim «sarflangan» bo'lib qoladi.
        amount: params.amount,
        orderId: params.orderId,
      },
    });
  }

  /** Buyurtma qaytarilganda summa kartaga qaytadi. */
  async refundForOrder(orderId: string) {
    const spends = await this.prisma.giftCardEntry.findMany({
      where: { orderId, kind: 'SPEND' },
      select: { giftCardId: true, amount: true },
    });
    if (spends.length === 0) return null;

    // Karta muddati o'tgan bo'lsa ham pul qaytariladi: bu mijozning
    // puli edi va uni qaytarmaslik o'g'irlik bo'lardi. Muddat faqat
    // ISHLATISHNI cheklaydi.
    const created: Array<{ id: string }> = [];
    for (const s of spends) {
      created.push(
        await this.prisma.giftCardEntry.create({
          data: {
            giftCardId: s.giftCardId,
            kind: 'REFUND',
            amount: -(s.amount as bigint),
            orderId,
            comment: 'Buyurtma qaytarildi',
          },
          select: { id: true },
        }),
      );
    }
    return created;
  }

  async cancel(id: string, reason: string, adminId?: string) {
    if (reason.trim().length < 3) {
      throw new BadRequestException('Bekor qilish sababi majburiy');
    }
    return this.prisma.giftCard.update({
      where: { id },
      data: { cancelledAt: new Date(), cancelReason: reason.trim() },
      select: { id: true, cancelledAt: true, cancelReason: true },
    });
  }

  /** Admin ro'yxati. Ochiq kod bu yerda ham YO'Q. */
  async list(params: { tail?: string; page?: number }) {
    const perPage = 25;
    const page = Math.max(1, params.page ?? 1);
    const where = params.tail ? { codeTail: params.tail.toUpperCase().slice(-4) } : {};

    const [total, rows] = await Promise.all([
      this.prisma.giftCard.count({ where }),
      this.prisma.giftCard.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { entries: { select: { amount: true } } },
      }),
    ]);

    return {
      total,
      page,
      perPage,
      items: rows.map((c) => {
        const spent = c.entries.reduce((sum, e) => sum + (e.amount as bigint), 0n);
        const state = cardState({
          initialAmount: c.initialAmount as bigint,
          spent,
          expiresAt: c.expiresAt,
          cancelledAt: c.cancelledAt,
        });
        return {
          id: c.id,
          tail: c.codeTail,
          masked: `ALV-••••-••••-••••-${c.codeTail}`,
          initialAmount: (c.initialAmount as bigint).toString(),
          remaining: state.remaining.toString(),
          status: state.status,
          recipientName: c.recipientName,
          recipientPhone: c.recipientPhone,
          expiresAt: c.expiresAt,
          createdAt: c.createdAt,
        };
      }),
    };
  }
}
