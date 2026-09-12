import type { PrismaService } from '../../prisma/prisma.service';
import type { NotificationService } from '../notifications/notification.service';
import { LoyaltyExpiryService } from './loyalty-expiry.service';

/**
 * Ball kuydirish — eng xavfli joy.
 *
 * Bu yerda xato jimgina sodir bo'ladi: ball noto'g'ri kuysa, mijoz
 * shikoyat qilgandagina bilinadi, kuymay qolsa esa umuman bilinmaydi.
 * Shuning uchun testlar aynan «o'zini ko'rsatmaydigan» holatlarni
 * qo'riqlaydi.
 */

interface Entry {
  kind: string;
  points: number;
  createdAt: Date;
}

function harness(options: {
  candidates?: Array<{ customerId: string; balance: number; lastActivityAt: Date }>;
  entries?: Record<string, Entry[]>;
  customers?: Array<{
    id: string;
    phone: string | null;
    locale?: string;
    telegramChatId?: string | null;
  }>;
}) {
  const created: Array<Record<string, unknown>> = [];
  const notified: Array<Record<string, unknown>> = [];
  const entries = options.entries ?? {};

  const tx = {
    loyaltyEntry: {
      findMany: async (args: { where: { customerId: string } }) =>
        entries[args.where.customerId] ?? [],
      create: async (args: { data: Record<string, unknown> }) => {
        created.push(args.data);
        return args.data;
      },
    },
  };

  const prisma = {
    $queryRaw: async () => options.candidates ?? [],
    $transaction: async (fn: (t: unknown) => Promise<unknown>) => fn(tx),
    customer: {
      findMany: async () => options.customers ?? [],
    },
    loyaltyEntry: {
      findMany: async () => [],
      aggregate: async () => ({ _sum: { points: 0, amount: 0n } }),
    },
  } as unknown as PrismaService;

  const notifications = {
    notifyCustomer: async (params: Record<string, unknown>) => {
      notified.push(params);
    },
  } as unknown as NotificationService;

  return { service: new LoyaltyExpiryService(prisma, notifications), created, notified };
}

const NOW = new Date('2026-09-12T03:00:00Z');
/** 13 oy oldin — muddat allaqachon o'tgan. */
const LONG_AGO = new Date('2025-08-12T10:00:00Z');

describe('LoyaltyExpiryService — kuydirish', () => {
  it('muddati o‘tgan balans manfiy yozuv bilan nolga tushiriladi', async () => {
    const { service, created } = harness({
      candidates: [{ customerId: 'c1', balance: 120, lastActivityAt: LONG_AGO }],
      entries: { c1: [{ kind: 'EARN', points: 120, createdAt: LONG_AGO }] },
    });

    const res = await service.expireOverdue(NOW);

    expect(res).toEqual({ customers: 1, points: 120 });
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ customerId: 'c1', kind: 'EXPIRE', points: -120 });
    // Ball 100 so'mdan: 120 ball = 12 000 so'm = 1 200 000 tiyin.
    expect(created[0]!.amount).toBe(-1_200_000n);
  });

  it('ro‘yxat olingandan KEYIN ball ishlatilgan bo‘lsa — kuydirilmaydi', async () => {
    // Aynan shu poyga tufayli balans manfiyga tushib ketishi mumkin edi:
    // ro'yxatda 120 ball turibdi, mijoz esa oradan o'tgan vaqtda
    // buyurtma berib hammasini ishlatgan.
    const { service, created } = harness({
      candidates: [{ customerId: 'c1', balance: 120, lastActivityAt: LONG_AGO }],
      entries: {
        c1: [
          { kind: 'EARN', points: 120, createdAt: LONG_AGO },
          { kind: 'REDEEM', points: -120, createdAt: new Date('2026-09-11T10:00:00Z') },
        ],
      },
    });

    expect(await service.expireOverdue(NOW)).toEqual({ customers: 0, points: 0 });
    expect(created).toHaveLength(0);
  });

  it('oradan o‘tgan vaqtda yangi harakat bo‘lsa — muddat uzayadi va ball saqlanadi', async () => {
    const { service, created } = harness({
      candidates: [{ customerId: 'c1', balance: 120, lastActivityAt: LONG_AGO }],
      entries: {
        c1: [
          { kind: 'EARN', points: 120, createdAt: LONG_AGO },
          { kind: 'EARN', points: 30, createdAt: new Date('2026-09-01T10:00:00Z') },
        ],
      },
    });

    expect(await service.expireOverdue(NOW)).toEqual({ customers: 0, points: 0 });
    expect(created).toHaveLength(0);
  });

  it('EXPIRE yozuvining o‘zi muddatni UZAYTIRMAYDI', async () => {
    // Eng nozik joy. EXPIRE ni «faoliyat» deb hisoblasak, kuydirish
    // amali sanani o'zi yangilab qo'yardi va keyingi ballar hech qachon
    // kuymasdi — qoida bir marta ishlab, jimgina o'chib qolardi.
    const { service, created } = harness({
      candidates: [{ customerId: 'c1', balance: 50, lastActivityAt: LONG_AGO }],
      entries: {
        c1: [
          { kind: 'EARN', points: 200, createdAt: LONG_AGO },
          { kind: 'EXPIRE', points: -150, createdAt: new Date('2026-09-11T03:00:00Z') },
        ],
      },
    });

    const res = await service.expireOverdue(NOW);
    expect(res.points).toBe(50);
    expect(created[0]).toMatchObject({ kind: 'EXPIRE', points: -50 });
  });

  it('bitta mijozdagi xato qolganlarini to‘xtatmaydi', async () => {
    const { service, created } = harness({
      candidates: [
        { customerId: 'bad', balance: 10, lastActivityAt: LONG_AGO },
        { customerId: 'c2', balance: 20, lastActivityAt: LONG_AGO },
      ],
      entries: {
        c2: [{ kind: 'EARN', points: 20, createdAt: LONG_AGO }],
      },
    });
    // `bad` uchun yozuv yo'q → balans 0 → kuydirilmaydi, xato ham yo'q.
    const res = await service.expireOverdue(NOW);
    expect(res).toEqual({ customers: 1, points: 20 });
    expect(created).toHaveLength(1);
  });
});

describe('LoyaltyExpiryService — ogohlantirish', () => {
  /** 12 oyga 8 kun qolgan sana. */
  const SOON = new Date('2025-09-20T03:00:00Z');

  it('14 kun ichida kuyadiganga xabar ketadi', async () => {
    const { service, notified } = harness({
      candidates: [{ customerId: 'c1', balance: 75, lastActivityAt: SOON }],
      customers: [{ id: 'c1', phone: '+998901234567', locale: 'UZ' }],
    });

    expect(await service.warnExpiring(NOW)).toEqual({ warned: 1 });
    expect(notified[0]).toMatchObject({
      template: 'LOYALTY_EXPIRING',
      lang: 'uz',
      phone: '+998901234567',
    });
    expect(notified[0]!.vars).toMatchObject({ points: '75', amount: '7 500', date: '20.09.2026' });
  });

  it('kalit kuyish sanasiga bog‘lanadi — cron har kuni ishlasa ham SMS bitta', async () => {
    const { service, notified } = harness({
      candidates: [{ customerId: 'c1', balance: 75, lastActivityAt: SOON }],
      customers: [{ id: 'c1', phone: '+998901234567' }],
    });
    await service.warnExpiring(NOW);
    expect(notified[0]!.dedupeId).toBe('c1:2026-09-20');
  });

  it('ruscha mijozga ruscha xabar', async () => {
    const { service, notified } = harness({
      candidates: [{ customerId: 'c1', balance: 10, lastActivityAt: SOON }],
      customers: [{ id: 'c1', phone: '+998901234567', locale: 'RU' }],
    });
    await service.warnExpiring(NOW);
    expect(notified[0]!.lang).toBe('ru');
  });

  it('telefonsiz mijozga xabar yuborilmaydi', async () => {
    const { service, notified } = harness({
      candidates: [{ customerId: 'c1', balance: 10, lastActivityAt: SOON }],
      customers: [{ id: 'c1', phone: null }],
    });
    expect(await service.warnExpiring(NOW)).toEqual({ warned: 0 });
    expect(notified).toHaveLength(0);
  });

  it('muddati ALLAQACHON o‘tganga «tez orada kuyadi» deb yozilmaydi', async () => {
    // SQL oraliq bo'yicha tanlaydi; chegaradagi bir kunlik farq tufayli
    // ro'yxatga kuygan mijoz tushib qolishi mumkin. Xizmat uni AYNI
    // qoida bilan qayta tekshiradi.
    const { service, notified } = harness({
      candidates: [{ customerId: 'c1', balance: 10, lastActivityAt: LONG_AGO }],
      customers: [{ id: 'c1', phone: '+998901234567' }],
    });
    expect(await service.warnExpiring(NOW)).toEqual({ warned: 0 });
    expect(notified).toHaveLength(0);
  });
});
