import { BadRequestException } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';

/**
 * Bir vaqtda kelgan ikkita buyurtma bitta ballni ikki marta sarflay
 * olmasligi kerak.
 *
 * Ilgari balans faqat `quote` da tekshirilardi — u tranzaksiyadan
 * TASHQARIDA chaqiriladi. Ikkita varaq bir vaqtda buyurtma bersa,
 * ikkalasi ham o'sha 100 ballni ko'rardi va ikkalasi ham chiqim
 * yozardi: mijoz 200 ball sarflar, balansi −100 bo'lardi.
 */
function txStub(balance: number) {
  const created: unknown[] = [];
  const queries: string[] = [];
  return {
    created,
    queries,
    tx: {
      loyaltyEntry: {
        create: async (args: unknown) => {
          created.push(args);
          return args;
        },
      },
      $queryRaw: async (parts: TemplateStringsArray) => {
        const sql = parts.join('?');
        queries.push(sql);
        if (sql.includes('FOR UPDATE')) return [];
        return [{ balance }];
      },
    },
  };
}

const service = () => new LoyaltyService({} as never);

describe('LoyaltyService.redeem', () => {
  it('balans yetsa — chiqim yoziladi', async () => {
    const { tx, created } = txStub(100);
    await service().redeem(tx as never, {
      customerId: 'c1',
      orderId: 'o1',
      points: 100,
      amount: 1_000_000n,
    });
    expect(created).toHaveLength(1);
    expect((created[0] as { data: { points: number } }).data.points).toBe(-100);
  });

  it('balans yetmasa — xato, hech narsa yozilmaydi', async () => {
    const { tx, created } = txStub(40);
    await expect(
      service().redeem(tx as never, {
        customerId: 'c1',
        orderId: 'o2',
        points: 100,
        amount: 1_000_000n,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(created).toHaveLength(0);
  });

  it('qatorlar AVVAL qulflanadi, keyin yig‘indi olinadi', async () => {
    const { tx, queries } = txStub(100);
    await service().redeem(tx as never, {
      customerId: 'c1',
      orderId: 'o3',
      points: 10,
      amount: 100_000n,
    });
    expect(queries[0]).toContain('FOR UPDATE');
    expect(queries[1]).toContain('SUM(points)');
    // PostgreSQL `FOR UPDATE` ni agregat bilan qo'shib ishlatmaydi —
    // shuning uchun ular ikki alohida so'rov.
    expect(queries[0]).not.toContain('SUM(points)');
  });

  it('nol yoki manfiy ball — umuman tegilmaydi', async () => {
    const { tx, created, queries } = txStub(0);
    await service().redeem(tx as never, {
      customerId: 'c1',
      orderId: 'o4',
      points: 0,
      amount: 0n,
    });
    expect(created).toHaveLength(0);
    expect(queries).toHaveLength(0);
  });
});
