import { PaymentService } from './payment.service';

/**
 * Ishlov berayotgan jarayon o'lsa NIMA BO'LADI.
 *
 * Ilgari hech nima: `webhook_events` qatori `processedAt = null`
 * bo'lib qolardi va uni tozalaydigan narsa yo'q edi. Click yoki
 * Payme ning har bir keyingi urinishi «hozir ishlanmoqda» javobini
 * olardi, to'lov esa abadiy `WAITING` da qolardi — mijozdan pul
 * yechilgan, buyurtma to'lanmagan.
 */
const P2002 = Object.assign(new Error('unique'), { code: 'P2002' });

function serviceWith(existing: {
  id: string;
  processedAt: Date | null;
  claimedAt: Date;
  response?: unknown;
}) {
  const updates: unknown[] = [];
  const prisma = {
    webhookEvent: {
      create: () => Promise.reject(P2002),
      findUnique: async () => existing,
      updateMany: async (args: { where: { claimedAt?: { lt: Date } } }) => {
        updates.push(args);
        // Shartli yangilash: ijara muhlati o‘tgan bo'lsa g'olib chiqadi.
        const cutoff = args.where.claimedAt?.lt;
        return { count: cutoff && existing.claimedAt < cutoff ? 1 : 0 };
      },
    },
  };
  // Bog'liqliklarning qolgani bu yo'lda umuman ishlatilmaydi.
  const service = Object.create(PaymentService.prototype) as PaymentService;
  Object.assign(service, { prisma, logger: { warn: () => undefined } });
  return { service, updates };
}

const claim = (service: PaymentService) =>
  service.claimWebhook({
    provider: 'click',
    externalId: '987654',
    method: 'complete',
    payload: {},
    signatureOk: true,
  });

describe('claimWebhook', () => {
  it('yangi ishlov ketayotgan bo‘lsa — ikkinchisi kutadi', async () => {
    const { service } = serviceWith({
      id: 'w1',
      processedAt: null,
      claimedAt: new Date(Date.now() - 5_000),
    });
    await expect(claim(service)).resolves.toMatchObject({ status: 'in_flight', id: 'w1' });
  });

  it('ijara muhlati o‘tgan bo‘lsa — qayta egallanadi', async () => {
    const { service, updates } = serviceWith({
      id: 'w1',
      processedAt: null,
      claimedAt: new Date(Date.now() - 10 * 60_000),
    });
    await expect(claim(service)).resolves.toMatchObject({ status: 'fresh', id: 'w1' });
    // Egallash SHARTLI: ikkita urinish bir vaqtda kelsa bittasi yutadi.
    expect(updates).toHaveLength(1);
  });

  it('allaqachon ishlangan bo‘lsa — eski javob qaytariladi', async () => {
    const { service } = serviceWith({
      id: 'w1',
      processedAt: new Date(),
      claimedAt: new Date(Date.now() - 10 * 60_000),
      response: { ok: true },
    });
    await expect(claim(service)).resolves.toMatchObject({
      status: 'done',
      previousResponse: { ok: true },
    });
  });
});
