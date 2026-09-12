import { UnauthorizedException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type { TokensService } from '../auth/tokens.service';
import { AdminAuthService } from './admin-auth.service';

/**
 * Sessiyani uzaytirish.
 *
 * Bu yo'l umuman yo'q edi: refresh tokeni login paytida berilardi,
 * bazaga yozilardi va hech qachon ishlatilmasdi. Natijada admin 15
 * daqiqada tashqariga chiqib ketardi. Shuning uchun testlar avvalo
 * «kim kira olmasligi» ni qo'riqlaydi — bekor qilingan, muddati
 * o'tgan va to'xtatilgan hisob.
 */

const HOUR = 60 * 60 * 1000;

function harness(session: Record<string, unknown> | null) {
  const writes: Array<{ op: string; args: Record<string, unknown> }> = [];

  const prisma = {
    adminSession: {
      findUnique: async () => session,
      update: (args: Record<string, unknown>) => {
        writes.push({ op: 'revoke', args });
        return args;
      },
      create: (args: Record<string, unknown>) => {
        writes.push({ op: 'create', args });
        return args;
      },
    },
    $transaction: async (ops: unknown[]) => ops,
  } as unknown as PrismaService;

  const tokens = {
    hashRefresh: (t: string) => `hash:${t}`,
    issue: async (principal: Record<string, unknown>) => ({
      accessToken: 'access',
      refreshToken: 'new-refresh',
      accessTtl: 900,
      refreshTtl: 2_592_000,
      principal,
    }),
  } as unknown as TokensService;

  return { service: new AdminAuthService(prisma, tokens), writes };
}

const admin = (over: Record<string, unknown> = {}) => ({
  id: 'a1',
  email: 'admin@aliver.uz',
  status: 'ACTIVE',
  deletedAt: null,
  role: { code: 'SUPER_ADMIN', permissions: [{ permission: { code: 'catalog.view' } }] },
  ...over,
});

const live = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  adminId: 'a1',
  revokedAt: null,
  expiresAt: new Date(Date.now() + HOUR),
  ip: '1.2.3.4',
  userAgent: 'Chrome',
  admin: admin(),
  ...over,
});

describe('AdminAuthService.refresh', () => {
  it('yaroqli sessiyani uzaytiradi va eskisini bekor qiladi', async () => {
    const { service, writes } = harness(live());
    const pair = await service.refresh('old-refresh');

    expect(pair.accessToken).toBe('access');
    expect(writes.map((w) => w.op)).toEqual(['revoke', 'create']);
    expect(writes[0]!.args).toMatchObject({ where: { id: 's1' } });
    expect(writes[1]!.args).toMatchObject({
      data: { adminId: 'a1', refreshTokenHash: 'hash:new-refresh', ip: '1.2.3.4' },
    });
  });

  it('topilmagan token rad etiladi', async () => {
    const { service } = harness(null);
    await expect(service.refresh('x')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('bekor qilingan sessiya rad etiladi — chiqqan admin qaytib kira olmaydi', async () => {
    const { service, writes } = harness(live({ revokedAt: new Date() }));
    await expect(service.refresh('x')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(writes).toHaveLength(0);
  });

  it('muddati o‘tgan sessiya rad etiladi', async () => {
    const { service } = harness(live({ expiresAt: new Date(Date.now() - HOUR) }));
    await expect(service.refresh('x')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('to‘xtatilgan yoki o‘chirilgan hisob uzaytirilmaydi', async () => {
    const stopped = harness(live({ admin: admin({ status: 'SUSPENDED' }) }));
    await expect(stopped.service.refresh('x')).rejects.toBeInstanceOf(UnauthorizedException);

    const deleted = harness(live({ admin: admin({ deletedAt: new Date() }) }));
    await expect(deleted.service.refresh('x')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('huquqlar yangi tokenga HOZIRGI roldan olinadi', async () => {
    const { service } = harness(
      live({
        admin: admin({
          role: { code: 'MANAGER', permissions: [{ permission: { code: 'orders.view' } }] },
        }),
      }),
    );
    const pair = (await service.refresh('x')) as unknown as { principal: Record<string, unknown> };
    expect(pair.principal).toMatchObject({
      sub: 'a1',
      kind: 'admin',
      roleCode: 'MANAGER',
      permissions: ['orders.view'],
    });
  });
});
