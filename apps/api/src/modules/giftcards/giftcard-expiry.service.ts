import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import {
  GIFTCARD_WARN_DAYS,
  cardState,
  giftCardWarnKey,
  giftCardWarning,
} from './giftcard-rules';

/** Eng uzoq bosqich — so'rov oynasi shunga qarab olinadi. */
const MAX_WINDOW = Math.max(...GIFTCARD_WARN_DAYS);

/**
 * Sertifikat muddati — ogohlantirish va nazorat.
 *
 * NEGA KUYDIRISH YO'Q. Ballardan farqli o'laroq, bu yerda hech narsa
 * yozilmaydi: karta muddati `cardState()` da HISOBLANADI va muddati
 * o'tgan karta o'z-o'zidan ishlamay qoladi. Bu to'g'ri yondashuv —
 * pulni «kuydiradigan» yozuv qo'shish, keyin uni qaytarish kerak
 * bo'lganda (masalan sud yoki shikoyat) tarixni buzardi.
 *
 * MUAMMO BOSHQA JOYDA edi: mijoz muddat tugaganini FAQAT kartani
 * ishlatmoqchi bo'lganda bilardi, ya'ni eng yomon paytda — kassada.
 * Admin ham tez orada tugaydigan kartalarni ko'ra olmasdi. Shu ikki
 * teshik yopiladi.
 */
@Injectable()
export class GiftCardExpiryService {
  private readonly logger = new Logger(GiftCardExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Muddati yaqinlashgan kartalar.
   *
   * Bekor qilinganlar SQL darajasida chiqarib tashlanadi, qolgan
   * shartlar (qoldiq, bosqich) esa kodda tekshiriladi: qoldiq
   * yozuvlar yig'indisi bo'lgani uchun uni `where` da hisoblab
   * bo'lmaydi.
   */
  private async upcoming(now: Date, days: number, limit: number) {
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.giftCard.findMany({
      where: {
        cancelledAt: null,
        expiresAt: { gt: now, lte: until },
      },
      orderBy: { expiresAt: 'asc' },
      take: limit,
      select: {
        id: true,
        codeTail: true,
        initialAmount: true,
        expiresAt: true,
        cancelledAt: true,
        recipientName: true,
        recipientPhone: true,
        purchasedBy: { select: { phone: true, locale: true, telegramChatId: true } },
        entries: { select: { amount: true } },
      },
    });

    return rows.map((c) => {
      const spent = c.entries.reduce((sum: bigint, e: { amount: bigint }) => sum + e.amount, 0n);
      const state = cardState({
        initialAmount: c.initialAmount as bigint,
        spent,
        expiresAt: c.expiresAt,
        cancelledAt: c.cancelledAt,
      });
      return { card: c, state };
    });
  }

  /**
   * Muddat tugashidan 30 va 7 kun oldin xabar.
   *
   * Kimga: kartada qabul qiluvchining telefoni bo'lsa — o'shanga,
   * aks holda sotib olgan mijozga. Sovg'a boshqa odamga atalgan
   * bo'lishi mumkin va xabar kartani ISHLATADIGAN odamga kerak.
   */
  async warnExpiring(now: Date = new Date()): Promise<{ warned: number }> {
    const rows = await this.upcoming(now, MAX_WINDOW, 500);
    let warned = 0;

    for (const { card, state } of rows) {
      const warning = giftCardWarning({
        expiresAt: card.expiresAt,
        remaining: state.remaining,
        cancelledAt: card.cancelledAt,
        now,
      });
      if (warning.milestone === null || !card.expiresAt) continue;

      const phone = card.recipientPhone ?? card.purchasedBy?.phone ?? null;
      if (!phone) continue;

      await this.notifications.notifyCustomer({
        template: 'GIFTCARD_EXPIRING',
        lang: card.purchasedBy?.locale === 'RU' ? 'ru' : 'uz',
        phone,
        // Telegram FAQAT sotib olgan mijozga: qabul qiluvchining
        // chat id si bizda yo'q va sotib oluvchining chatiga boshqa
        // odamga atalgan xabarni yuborish noto'g'ri bo'lardi.
        telegramChatId: card.recipientPhone ? null : (card.purchasedBy?.telegramChatId ?? null),
        vars: {
          tail: card.codeTail,
          amount: formatSum(state.remaining),
          date: formatDate(card.expiresAt),
        },
        dedupeId: giftCardWarnKey(card.id, card.expiresAt, warning.milestone),
      });
      warned += 1;
    }

    if (warned > 0) this.logger.log(`Sertifikat muddati haqida ogohlantirildi: ${warned} ta`);
    return { warned };
  }

  /** Admin uchun: tez orada tugaydigan kartalar. */
  async expiringSoon(params: { days?: number; limit?: number } = {}) {
    const now = new Date();
    const days = params.days ?? MAX_WINDOW;
    const rows = await this.upcoming(now, days, Math.min(params.limit ?? 100, 500));

    const items = rows
      // Puli qolmagan karta ro'yxatda keraksiz: uning muddati
      // tugashining hech qanday oqibati yo'q.
      .filter(({ state }) => state.remaining > 0n)
      .map(({ card, state }) => ({
        id: card.id,
        masked: `ALV-••••-••••-••••-${card.codeTail}`,
        remaining: state.remaining.toString(),
        initialAmount: (card.initialAmount as bigint).toString(),
        recipientName: card.recipientName,
        recipientPhone: card.recipientPhone ?? card.purchasedBy?.phone ?? null,
        expiresAt: card.expiresAt,
        daysLeft: card.expiresAt
          ? Math.ceil((card.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          : null,
      }));

    return {
      days,
      totalRemaining: items
        .reduce((sum, i) => sum + BigInt(i.remaining), 0n)
        .toString(),
      items,
    };
  }
}

/* ---------------------------------------------------------------------- */

function formatDate(at: Date): string {
  const dd = String(at.getDate()).padStart(2, '0');
  const mm = String(at.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${at.getFullYear()}`;
}

function formatSum(tiyin: bigint): string {
  return (tiyin / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
