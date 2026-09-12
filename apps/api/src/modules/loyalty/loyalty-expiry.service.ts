import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import {
  EXPIRY_MONTHS,
  EXPIRY_WARN_DAYS,
  expiryState,
  expiryWarnKey,
  pointsToTiyin,
} from './loyalty-rules';

/**
 * Bir martada ko'riladigan mijozlar soni.
 *
 * Chegara SHART: kuydirish har bir mijoz uchun alohida tranzaksiya
 * ochadi va cheklanmagan ro'yxat bazani bir necha daqiqaga band qilib
 * qo'yishi mumkin. Qolganlari ertaga ko'riladi — bir kunlik kechikish
 * 12 oylik muddat oldida ahamiyatsiz.
 */
const BATCH = 500;

interface Candidate {
  customerId: string;
  balance: number;
  lastActivityAt: Date;
}

/**
 * Ballarning kuyishi.
 *
 * NEGA ALOHIDA XIZMAT. Sxemada `LoyaltyEntryKind.EXPIRE` turi bor edi,
 * hujjatda «ballar 12 oydan keyin kuyadi» deb yozilgan edi, lekin uni
 * YOZADIGAN kod umuman yo'q edi. Ya'ni qoida faqat qog'ozda ishlardi:
 * mijoz ballari cheksiz to'planardi va vaqt o'tib bu haqiqiy pul
 * majburiyatiga aylanardi.
 *
 * IKKI BOSQICH. Avval OGOHLANTIRISH (14 kun oldin), keyin KUYDIRISH.
 * Faqat kuydirish shikoyat keltiradi: mijoz ballari yo'qolganini
 * o'zi sezadi va buni o'g'irlik deb biladi. Ogohlantirish esa ko'pincha
 * buyurtmaga aylanadi — bu dasturning maqsadi ham.
 *
 * FAOLIYAT deganda mijozning o'z harakati tushuniladi. Tizim yozadigan
 * EXPIRE yozuvi faoliyat emas: aks holda kuydirish amali muddatni o'zi
 * uzaytirib, ball hech qachon kuymasdi.
 */
@Injectable()
export class LoyaltyExpiryService {
  private readonly logger = new Logger(LoyaltyExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  /* ======================================================================
     NOMZODLAR
     ====================================================================== */

  /**
   * Balansi musbat bo'lgan va oxirgi faoliyati berilgan oraliqqa
   * tushadigan mijozlar.
   *
   * Xom SQL ATAYLAB: bitta so'rovda ikki xil shart kerak — YIG'INDI
   * hamma yozuvlar bo'yicha, MAKSIMAL sana esa faqat EXPIRE bo'lmagan
   * yozuvlar bo'yicha. Prisma `groupBy` da bitta guruh ichida ikki xil
   * filtr berib bo'lmaydi, ORM ni majburlash esa o'qilishi qiyin va
   * xato qilish oson kod hosil qilardi. Bu joy pul bilan bog'liq.
   */
  private async candidates(params: {
    /** Oxirgi faoliyat shu sanadan OLDIN bo'lganlar. */
    before: Date;
    /** Oxirgi faoliyat shu sanadan KEYIN bo'lganlar (ixtiyoriy). */
    after?: Date;
    limit: number;
  }): Promise<Candidate[]> {
    const after = params.after ?? new Date(0);
    const rows = await this.prisma.$queryRaw<
      Array<{ customerId: string; balance: number; lastActivityAt: Date }>
    >`
      SELECT e."customerId"                                        AS "customerId",
             SUM(e.points)::int                                    AS "balance",
             MAX(e."createdAt") FILTER (WHERE e.kind <> 'EXPIRE')  AS "lastActivityAt"
      FROM loyalty_entries e
      JOIN customers c ON c.id = e."customerId"
      WHERE c."deletedAt" IS NULL
        AND c.status = 'ACTIVE'
      GROUP BY e."customerId"
      HAVING SUM(e.points) > 0
         AND MAX(e."createdAt") FILTER (WHERE e.kind <> 'EXPIRE') <  ${params.before}
         AND MAX(e."createdAt") FILTER (WHERE e.kind <> 'EXPIRE') >= ${after}
      ORDER BY 3 ASC
      LIMIT ${params.limit}
    `;
    return rows.map((r) => ({
      customerId: r.customerId,
      balance: Number(r.balance),
      lastActivityAt: new Date(r.lastActivityAt),
    }));
  }

  /* ======================================================================
     OGOHLANTIRISH
     ====================================================================== */

  /**
   * Kuyishiga 14 kun yoki undan kam qolganlarga xabar.
   *
   * Takrorlanmaslik `dedupeKey` orqali: kalitga KUYISH SANASI kiradi,
   * yuborilgan vaqt emas. Shuning uchun har kuni ishlaydigan cron bir
   * xil mijozga har kuni SMS yubormaydi — bitta muddat davri uchun
   * bitta xabar. Buning uchun alohida jadval kerak emas.
   */
  async warnExpiring(now: Date = new Date()): Promise<{ warned: number }> {
    const months = EXPIRY_MONTHS;
    // Kuyish = lastActivity + 12 oy. Demak 14 kun ichida kuyadiganlar —
    // faoliyati (hozir - 12 oy + 14 kun) dan oldin, lekin (hozir - 12 oy)
    // dan keyin bo'lganlar. Ikkinchi chegara muhim: undan oldingilar
    // allaqachon kuygan va ularga ogohlantirish emas, kuydirish kerak.
    const before = addMonths(addDays(now, EXPIRY_WARN_DAYS), -months);
    const after = addMonths(now, -months);

    const rows = await this.candidates({ before, after, limit: BATCH });
    if (rows.length === 0) return { warned: 0 };

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: rows.map((r) => r.customerId) } },
      select: { id: true, phone: true, locale: true, telegramChatId: true },
    });
    const byId = new Map(customers.map((c) => [c.id, c]));

    let warned = 0;
    for (const row of rows) {
      const customer = byId.get(row.customerId);
      if (!customer?.phone) continue;

      const state = expiryState({
        lastActivityAt: row.lastActivityAt,
        balance: row.balance,
        now,
      });
      // SQL oraliq bo'yicha tanlaydi, bu yerda esa AYNAN o'sha qoida
      // bilan qayta tekshiriladi: chegaradagi bir kunlik farq tufayli
      // allaqachon kuygan mijozga «tez orada kuyadi» deb yozib
      // qo'ymaslik uchun.
      if (state.stage !== 'warning' || !state.expiresAt) continue;

      await this.notifications.notifyCustomer({
        template: 'LOYALTY_EXPIRING',
        lang: customer.locale === 'RU' ? 'ru' : 'uz',
        phone: customer.phone,
        telegramChatId: customer.telegramChatId,
        vars: {
          points: String(row.balance),
          amount: formatSum(pointsToTiyin(row.balance)),
          date: formatDate(state.expiresAt),
        },
        dedupeId: expiryWarnKey(row.customerId, state.expiresAt),
      });
      warned += 1;
    }

    if (warned > 0) this.logger.log(`Ball kuyishi haqida ogohlantirildi: ${warned} mijoz`);
    return { warned };
  }

  /* ======================================================================
     KUYDIRISH
     ====================================================================== */

  /**
   * Muddati o'tgan ballarni kuydiradi.
   *
   * Har bir mijoz ALOHIDA tranzaksiyada va balans tranzaksiya ICHIDA
   * qayta o'qiladi. Sabab: ro'yxat olingandan keyin mijoz buyurtma
   * berib ball ishlatgan bo'lishi mumkin va eski summani kuydirish
   * balansni manfiyga tushirardi.
   */
  async expireOverdue(now: Date = new Date()): Promise<{ customers: number; points: number }> {
    const before = addMonths(now, -EXPIRY_MONTHS);
    const rows = await this.candidates({ before, limit: BATCH });
    if (rows.length === 0) return { customers: 0, points: 0 };

    let customers = 0;
    let points = 0;

    for (const row of rows) {
      try {
        const burned = await this.expireOne(row.customerId, now);
        if (burned > 0) {
          customers += 1;
          points += burned;
        }
      } catch (e) {
        // Bitta mijozdagi xato qolganlarini to'xtatmasligi kerak.
        this.logger.error(
          `Ball kuydirishda xato (mijoz ${row.customerId}): ${(e as Error).message}`,
        );
      }
    }

    if (customers > 0) {
      this.logger.log(`Ballar kuydirildi: ${points} ball, ${customers} mijoz`);
    }
    return { customers, points };
  }

  private async expireOne(customerId: string, now: Date): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const entries = await tx.loyaltyEntry.findMany({
        where: { customerId },
        select: { kind: true, points: true, createdAt: true },
      });

      const balance = entries.reduce((sum, e) => sum + e.points, 0);
      const lastActivityAt = entries
        .filter((e) => e.kind !== 'EXPIRE')
        .reduce<Date | null>(
          (max, e) => (!max || e.createdAt > max ? e.createdAt : max),
          null,
        );

      const state = expiryState({ lastActivityAt, balance, now });
      // Ro'yxat olingandan keyin mijoz harakat qilgan bo'lishi mumkin.
      if (state.stage !== 'due') return 0;

      await tx.loyaltyEntry.create({
        data: {
          customerId,
          kind: 'EXPIRE',
          // Chiqim MANFIY — balans oddiy yig'indi bo'lib qolsin.
          points: -balance,
          amount: -pointsToTiyin(balance),
          comment: `${EXPIRY_MONTHS} oy faoliyatsizlik — ballar kuydi`,
        },
      });
      return balance;
    });
  }

  /* ======================================================================
     ADMIN HISOBOTI
     ====================================================================== */

  /** Tez orada kuyadigan ballar — adminda ro'yxat. */
  async expiringSoon(params: { days?: number; limit?: number } = {}) {
    const now = new Date();
    const days = params.days ?? EXPIRY_WARN_DAYS;
    const limit = Math.min(params.limit ?? 100, BATCH);

    const rows = await this.candidates({
      before: addMonths(addDays(now, days), -EXPIRY_MONTHS),
      after: addMonths(now, -EXPIRY_MONTHS),
      limit,
    });
    if (rows.length === 0) return { days, totalPoints: 0, items: [] };

    const customers = await this.prisma.customer.findMany({
      where: { id: { in: rows.map((r) => r.customerId) } },
      select: { id: true, phone: true, firstName: true, lastName: true },
    });
    const byId = new Map(customers.map((c) => [c.id, c]));

    const items = rows.map((r) => {
      const state = expiryState({
        lastActivityAt: r.lastActivityAt,
        balance: r.balance,
        now,
      });
      const c = byId.get(r.customerId);
      return {
        customerId: r.customerId,
        phone: c?.phone ?? null,
        name: [c?.firstName, c?.lastName].filter(Boolean).join(' ') || null,
        points: r.balance,
        amount: pointsToTiyin(r.balance).toString(),
        lastActivityAt: r.lastActivityAt,
        expiresAt: state.expiresAt,
        daysLeft: state.daysLeft,
      };
    });

    return {
      days,
      totalPoints: items.reduce((s, i) => s + i.points, 0),
      items,
    };
  }

  /** Kuygan ballar tarixi — adminda hisobot. */
  async expiredReport(params: { from?: Date; to?: Date; limit?: number } = {}) {
    const limit = Math.min(params.limit ?? 200, 1000);
    const where: Record<string, unknown> = { kind: 'EXPIRE' };
    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from ? { gte: params.from } : {}),
        ...(params.to ? { lte: params.to } : {}),
      };
    }

    const [rows, agg] = await Promise.all([
      this.prisma.loyaltyEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          points: true,
          amount: true,
          createdAt: true,
          customerId: true,
          customer: { select: { phone: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.loyaltyEntry.aggregate({ where, _sum: { points: true, amount: true } }),
    ]);

    return {
      // Yozuvlar manfiy saqlanadi; hisobotda musbat ko'rsatiladi —
      // «kuygan ball» miqdori manfiy son bo'lib ko'rinmasligi kerak.
      totalPoints: Math.abs(agg._sum?.points ?? 0),
      totalAmount: (-(agg._sum?.amount ?? 0n)).toString(),
      items: rows.map((r) => ({
        id: r.id,
        customerId: r.customerId,
        phone: r.customer?.phone ?? null,
        name: [r.customer?.firstName, r.customer?.lastName].filter(Boolean).join(' ') || null,
        points: Math.abs(r.points),
        amount: (-(r.amount as bigint)).toString(),
        createdAt: r.createdAt,
      })),
    };
  }
}

/* ---------------------------------------------------------------------- */

function addDays(at: Date, days: number): Date {
  const d = new Date(at);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(at: Date, months: number): Date {
  const d = new Date(at);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** SMS uchun sana: 14.03.2027. */
function formatDate(at: Date): string {
  const dd = String(at.getDate()).padStart(2, '0');
  const mm = String(at.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${at.getFullYear()}`;
}

function formatSum(tiyin: bigint): string {
  const sum = tiyin / 100n;
  return sum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
