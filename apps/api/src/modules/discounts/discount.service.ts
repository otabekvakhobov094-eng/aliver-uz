import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  type CartLine,
  type DiscountRule,
  REJECT_MESSAGE,
  applyDiscounts,
  type ApplyResult,
  validateDiscount,
} from './discount-engine';

/**
 * Tranzaksiya ichida ham ishlashi uchun kerak bo'ladigan minimal mijoz.
 * Buyurtma yaratilayotganda `recordUsage` AYNAN o'sha tranzaksiyada
 * chaqiriladi — chegirma limiti buyurtma bilan birga qulflanadi.
 */
export type DiscountClient = Pick<PrismaService, '$executeRaw'> & {
  discountUsage: PrismaService['discountUsage'];
};

@Injectable()
export class DiscountService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sozlamalardan chegirma siyosati. TZ da bu qiymatlar yo'q edi —
   * ekspertiza B-3 asosida qo'shildi va admin paneldan boshqariladi.
   */
  private async policy(): Promise<{ maxTotalPercent: number; allowStacking: boolean }> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: ['discounts.maxTotalPercent', 'discounts.allowStacking'] } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    return {
      maxTotalPercent: Number(byKey.get('discounts.maxTotalPercent') ?? 40),
      allowStacking: byKey.get('discounts.allowStacking') === true,
    };
  }

  private toRule(row: {
    id: string;
    code: string | null;
    type: string;
    scope: string;
    value: number;
    minOrderAmount: bigint | null;
    maxDiscountAmount: bigint | null;
    minQuantity: number | null;
    stackable: boolean;
    priority: number;
    startsAt: Date | null;
    endsAt: Date | null;
    isActive: boolean;
    targetProductIds: string[];
    targetCategoryIds: string[];
    targetCollectionIds: string[];
    usageLimit: number | null;
    usagePerCustomer: number | null;
  }): DiscountRule {
    return {
      id: row.id,
      code: row.code,
      type: row.type as DiscountRule['type'],
      scope: row.scope as DiscountRule['scope'],
      value: row.value,
      minOrderAmount: row.minOrderAmount,
      maxDiscountAmount: row.maxDiscountAmount,
      minQuantity: row.minQuantity,
      stackable: row.stackable,
      priority: row.priority,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      isActive: row.isActive,
      targetProductIds: row.targetProductIds,
      targetCategoryIds: row.targetCategoryIds,
      targetCollectionIds: row.targetCollectionIds,
      usageLimit: row.usageLimit,
      usagePerCustomer: row.usagePerCustomer,
    };
  }

  private async usageOf(discountId: string, phone?: string) {
    const [totalUsed, customerUsed] = await Promise.all([
      this.prisma.discountUsage.count({ where: { discountId } }),
      phone
        ? this.prisma.discountUsage.count({ where: { discountId, phone } })
        : Promise.resolve(0),
    ]);
    return { totalUsed, customerUsed };
  }

  /**
   * Promo-kodni tekshiradi. Xato bo'lsa — mijozga tushunarli sabab bilan
   * 400 qaytadi ("kod ishlamadi" emas, aynan nima uchun ishlamagani).
   */
  async validateCoupon(code: string, lines: CartLine[], phone?: string): Promise<DiscountRule> {
    const normalized = code.trim().toUpperCase();
    const row = await this.prisma.discount.findFirst({
      where: { code: normalized, deletedAt: null },
    });
    if (!row) {
      throw new BadRequestException({ code: 'COUPON_INVALID', message: REJECT_MESSAGE.NOT_FOUND });
    }

    const rule = this.toRule(row);
    const usage = await this.usageOf(rule.id, phone);
    const check = validateDiscount(rule, lines, usage);
    if (!check.ok) {
      throw new BadRequestException({
        code: `COUPON_${check.reason}`,
        message: REJECT_MESSAGE[check.reason],
      });
    }
    return rule;
  }

  /**
   * Savatga qo'llanadigan barcha chegirmalar: promo-kod (bo'lsa) va
   * avtomatik aksiyalar (kodsiz). Ustuvorlik va chegara dvigatelda.
   */
  async computeForCart(params: {
    lines: CartLine[];
    couponCode?: string | null;
    phone?: string;
  }): Promise<ApplyResult & { couponError?: string }> {
    const { maxTotalPercent, allowStacking } = await this.policy();
    const rules: DiscountRule[] = [];
    let couponError: string | undefined;

    if (params.couponCode) {
      try {
        rules.push(await this.validateCoupon(params.couponCode, params.lines, params.phone));
      } catch (e) {
        // Savatda yaroqsiz kod bo'lsa, butun savat buzilmaydi:
        // kod e'tiborsiz qoldiriladi va sabab qaytariladi.
        const body = (e as { response?: { message?: string } }).response;
        couponError = body?.message ?? 'Promo-kod qo‘llanmadi';
      }
    }

    // Avtomatik aksiyalar (TZ 47): kodsiz, faol va muddati ichida.
    const now = new Date();
    const autoRows = await this.prisma.discount.findMany({
      where: {
        code: null,
        isActive: true,
        deletedAt: null,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      orderBy: { priority: 'asc' },
      take: 20,
    });

    for (const row of autoRows) {
      const rule = this.toRule(row);
      const usage = await this.usageOf(rule.id, params.phone);
      if (validateDiscount(rule, params.lines, usage, now).ok) rules.push(rule);
    }

    const result = applyDiscounts(params.lines, rules, { maxTotalPercent, allowStacking, now });
    return { ...result, couponError };
  }

  /**
   * Buyurtma yaratilgach ishlatilishini qayd etadi.
   *
   * Hisoblagich SHARTLI `UPDATE` bilan oshiriladi:
   *
   * ```sql
   * UPDATE discounts SET "usedCount" = "usedCount" + 1
   *  WHERE id = :id AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")
   * ```
   *
   * Shu sababli "usageLimit: 1" bo'lgan kodni ikki mijoz bir vaqtda
   * ishlatib yubora olmaydi: ikkinchisining `UPDATE` i nol qator o'zgartiradi
   * va tranzaksiya orqaga qaytadi (ekspertiza B-3).
   */
  async recordUsage(
    params: {
      applied: Array<{ id: string; amount: bigint }>;
      orderId: string;
      customerId?: string | null;
      phone: string;
    },
    client?: DiscountClient,
  ): Promise<void> {
    const db = (client ?? this.prisma) as DiscountClient;

    for (const a of params.applied) {
      const affected = await db.$executeRaw`
        UPDATE discounts
           SET "usedCount" = "usedCount" + 1, "updatedAt" = NOW()
         WHERE id = ${a.id}::uuid
           AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")
      `;
      if (affected !== 1) {
        throw new ConflictException({
          code: 'COUPON_USAGE_LIMIT',
          message: REJECT_MESSAGE.USAGE_LIMIT,
        });
      }

      await db.discountUsage.create({
        data: {
          discountId: a.id,
          orderId: params.orderId,
          customerId: params.customerId ?? null,
          phone: params.phone,
          amount: a.amount,
        },
      });
    }
  }

  /**
   * Buyurtma bekor qilinsa yoki qaytarilsa — hisobni qaytaramiz.
   *
   * Avval yozuv O'CHIRILADI, keyin hisoblagich kamaytiriladi: shu tartibda
   * ikki marta chaqirilsa ham hisob ikki marta kamaymaydi (bekor qilish
   * qayta urinilsa yoki cron bilan operator bir vaqtda ishlasa).
   */
  async revokeUsage(orderId: string): Promise<void> {
    const usages = await this.prisma.discountUsage.findMany({ where: { orderId } });
    if (usages.length === 0) return;

    const deleted = await this.prisma.discountUsage.deleteMany({ where: { orderId } });
    if (deleted.count === 0) return;

    for (const u of usages) {
      await this.prisma.$executeRaw`
        UPDATE discounts
           SET "usedCount" = GREATEST("usedCount" - 1, 0), "updatedAt" = NOW()
         WHERE id = ${u.discountId}::uuid
      `;
    }
  }
}
