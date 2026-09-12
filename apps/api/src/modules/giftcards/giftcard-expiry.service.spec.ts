import type { PrismaService } from '../../prisma/prisma.service';
import type { NotificationService } from '../notifications/notification.service';
import { GiftCardExpiryService } from './giftcard-expiry.service';

interface Card {
  id: string;
  codeTail: string;
  initialAmount: bigint;
  expiresAt: Date | null;
  cancelledAt: Date | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  purchasedBy?: { phone: string | null; locale?: string; telegramChatId?: string | null } | null;
  entries: Array<{ amount: bigint }>;
}

function harness(cards: Card[]) {
  const notified: Array<Record<string, unknown>> = [];
  const prisma = {
    giftCard: {
      // Xizmat SQL da bekor qilinganlarni va muddati o'tganlarni
      // chiqarib tashlaydi; bu yerda ham shu filtrni takrorlaymiz,
      // aks holda test haqiqatdan uzoqlashardi.
      findMany: async (args: { where: { expiresAt: { gt: Date; lte: Date } } }) =>
        cards.filter(
          (c) =>
            !c.cancelledAt &&
            c.expiresAt !== null &&
            c.expiresAt > args.where.expiresAt.gt &&
            c.expiresAt <= args.where.expiresAt.lte,
        ),
    },
  } as unknown as PrismaService;

  const notifications = {
    notifyCustomer: async (p: Record<string, unknown>) => {
      notified.push(p);
    },
  } as unknown as NotificationService;

  return { service: new GiftCardExpiryService(prisma, notifications), notified };
}

const NOW = new Date('2026-09-12T03:00:00Z');

function card(over: Partial<Card> = {}): Card {
  return {
    id: 'gc1',
    codeTail: 'K7M2',
    initialAmount: 500_000_00n,
    expiresAt: new Date('2026-09-17T03:00:00Z'),
    cancelledAt: null,
    recipientPhone: '+998901112233',
    purchasedBy: { phone: '+998907778899', locale: 'UZ', telegramChatId: 'tg-1' },
    entries: [],
    ...over,
  };
}

describe('GiftCardExpiryService', () => {
  it('muddati yaqin kartaga xabar ketadi — qoldiq bilan', () => {
    const { service, notified } = harness([card({ entries: [{ amount: 120_000_00n }] })]);
    return service.warnExpiring(NOW).then((res) => {
      expect(res).toEqual({ warned: 1 });
      expect(notified[0]).toMatchObject({ template: 'GIFTCARD_EXPIRING' });
      // 500 000 dan 120 000 ishlatilgan → 380 000 qolgan.
      expect(notified[0]!.vars).toMatchObject({
        tail: 'K7M2',
        amount: '380 000',
        date: '17.09.2026',
      });
    });
  });

  it('qabul qiluvchining telefoni bo‘lsa — xabar O‘SHANGA, sotib oluvchiga emas', async () => {
    // Sovg'a boshqa odamga atalgan; kartani ishlatadigan odam xabarni
    // olishi kerak.
    const { service, notified } = harness([card()]);
    await service.warnExpiring(NOW);
    expect(notified[0]!.phone).toBe('+998901112233');
    // Telegram esa sotib oluvchining chati — unga boshqa odamga
    // atalgan xabar yuborilmaydi.
    expect(notified[0]!.telegramChatId).toBeNull();
  });

  it('qabul qiluvchi ko‘rsatilmagan bo‘lsa — sotib oluvchiga', async () => {
    const { service, notified } = harness([card({ recipientPhone: null })]);
    await service.warnExpiring(NOW);
    expect(notified[0]!.phone).toBe('+998907778899');
    expect(notified[0]!.telegramChatId).toBe('tg-1');
  });

  it('to‘liq ishlatilgan kartaga xabar yo‘q', async () => {
    const { service, notified } = harness([card({ entries: [{ amount: 500_000_00n }] })]);
    expect(await service.warnExpiring(NOW)).toEqual({ warned: 0 });
    expect(notified).toHaveLength(0);
  });

  it('bekor qilingan karta umuman ko‘rilmaydi', async () => {
    const { service } = harness([card({ cancelledAt: new Date('2026-01-01') })]);
    expect(await service.warnExpiring(NOW)).toEqual({ warned: 0 });
  });

  it('telefonsiz kartaga xabar yo‘q, lekin xato ham bermaydi', async () => {
    const { service } = harness([card({ recipientPhone: null, purchasedBy: null })]);
    expect(await service.warnExpiring(NOW)).toEqual({ warned: 0 });
  });

  it('kalit karta, sana va bosqichdan tuziladi', async () => {
    const { service, notified } = harness([card()]);
    await service.warnExpiring(NOW);
    expect(notified[0]!.dedupeId).toBe('gc1:2026-09-17:7');
  });

  it('admin ro‘yxatida puli qolmagan kartalar ko‘rinmaydi', async () => {
    const { service } = harness([
      card({ id: 'a', entries: [{ amount: 500_000_00n }] }),
      card({ id: 'b', entries: [{ amount: 100_000_00n }] }),
    ]);
    const res = await service.expiringSoon({ days: 30 });
    expect(res.items.map((i) => i.id)).toEqual(['b']);
    expect(res.totalRemaining).toBe('40000000');
  });
});
