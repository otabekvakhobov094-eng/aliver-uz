import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';

/**
 * Bu testlar CRUD ni emas, **o'zini qulflab qo'yishdan himoyani**
 * tekshiradi. Ular buzilsa oqibat qaytarib bo'lmaydi: panelga hech kim
 * kira olmaydi va faqat bazaga SQL bilan tuzatiladi.
 */

type AdminRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  roleId: string;
  role: { id: string; code: string; name: string };
  lastLoginAt: null;
  twoFaEnabled: boolean;
  createdAt: Date;
};

function admin(id: string, roleCode: string, status = 'ACTIVE'): AdminRow {
  return {
    id,
    fullName: `Admin ${id}`,
    email: `${id}@aliver.uz`,
    phone: null,
    status,
    roleId: `role-${roleCode}`,
    role: { id: `role-${roleCode}`, code: roleCode, name: roleCode },
    lastLoginAt: null,
    twoFaEnabled: false,
    createdAt: new Date(),
  };
}

/** Kerakli metodlarni beradigan soxta Prisma. */
function makePrisma(opts: {
  admins: AdminRow[];
  roles?: Array<{ id: string; code: string }>;
}) {
  const roles = opts.roles ?? [
    { id: 'role-SUPER_ADMIN', code: 'SUPER_ADMIN' },
    { id: 'role-OPERATOR', code: 'OPERATOR' },
  ];
  return {
    admin: {
      count: ({ where }: { where: { id?: { not: string }; role?: { code: string } } }) =>
        Promise.resolve(
          opts.admins.filter(
            (a) =>
              a.status === 'ACTIVE' &&
              a.role.code === where.role?.code &&
              (where.id?.not ? a.id !== where.id.not : true),
          ).length,
        ),
      findFirst: ({ where }: { where: { id: string } }) =>
        Promise.resolve(opts.admins.find((a) => a.id === where.id) ?? null),
      findUnique: ({ where }: { where: { email?: string } }) =>
        Promise.resolve(opts.admins.find((a) => a.email === where.email) ?? null),
      update: ({ where }: { where: { id: string } }) =>
        Promise.resolve(opts.admins.find((a) => a.id === where.id)),
      create: ({ data }: { data: Record<string, unknown> }) => Promise.resolve(data),
    },
    role: {
      findUnique: ({ where }: { where: { id: string } }) =>
        Promise.resolve(roles.find((r) => r.id === where.id) ?? null),
    },
    adminSession: { deleteMany: () => Promise.resolve({ count: 0 }) },
  } as never;
}

const req = () => ({}) as never;

describe('UsersController — qulflanishdan himoya', () => {
  it('yagona faol Super Adminni o‘chirib bo‘lmaydi', async () => {
    const rows = [admin('a1', 'SUPER_ADMIN'), admin('a2', 'OPERATOR')];
    const c = new UsersController(makePrisma({ admins: rows }));
    await expect(c.remove('a1', { sub: 'a2', kind: 'admin', roleCode: 'SUPER_ADMIN' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('ikkinchi Super Admin bo‘lsa o‘chirishga ruxsat beradi', async () => {
    const rows = [admin('a1', 'SUPER_ADMIN'), admin('a2', 'SUPER_ADMIN')];
    const c = new UsersController(makePrisma({ admins: rows }));
    await expect(
      c.remove('a1', { sub: 'a2', kind: 'admin', roleCode: 'SUPER_ADMIN' }),
    ).resolves.toEqual({ ok: true });
  });

  it('bloklangan Super Admin hisobga olinmaydi', async () => {
    // a2 bloklangan — demak a1 aslida yagona faol super-admin.
    const rows = [admin('a1', 'SUPER_ADMIN'), admin('a2', 'SUPER_ADMIN', 'BLOCKED')];
    const c = new UsersController(makePrisma({ admins: rows }));
    await expect(c.remove('a1', { sub: 'a2', kind: 'admin', roleCode: 'SUPER_ADMIN' })).rejects.toThrow(
      /yagona faol Super Admin/,
    );
  });

  it('o‘zini o‘chira olmaydi', async () => {
    const rows = [admin('a1', 'SUPER_ADMIN'), admin('a2', 'SUPER_ADMIN')];
    const c = new UsersController(makePrisma({ admins: rows }));
    await expect(c.remove('a1', { sub: 'a1', kind: 'admin', roleCode: 'SUPER_ADMIN' })).rejects.toThrow(
      /O‘zingizni o‘chira olmaysiz/,
    );
  });

  it('o‘zini bloklay olmaydi', async () => {
    const rows = [admin('a1', 'SUPER_ADMIN'), admin('a2', 'SUPER_ADMIN')];
    const c = new UsersController(makePrisma({ admins: rows }));
    await expect(
      c.update('a1', { status: 'BLOCKED' }, { sub: 'a1', kind: 'admin', roleCode: 'SUPER_ADMIN' }, req()),
    ).rejects.toThrow(/O‘zingizni bloklay olmaysiz/);
  });

  it('yagona faol Super Adminni bloklab bo‘lmaydi', async () => {
    const rows = [admin('a1', 'SUPER_ADMIN'), admin('a2', 'OPERATOR')];
    const c = new UsersController(makePrisma({ admins: rows }));
    await expect(
      c.update('a1', { status: 'BLOCKED' }, { sub: 'a2', kind: 'admin', roleCode: 'SUPER_ADMIN' }, req()),
    ).rejects.toThrow(/yagona faol Super Admin/);
  });

  it('o‘z rolini o‘zgartira olmaydi', async () => {
    const rows = [admin('a1', 'SUPER_ADMIN'), admin('a2', 'SUPER_ADMIN')];
    const c = new UsersController(makePrisma({ admins: rows }));
    await expect(
      c.update(
        'a1',
        { roleId: 'role-OPERATOR' },
        { sub: 'a1', kind: 'admin', roleCode: 'SUPER_ADMIN' },
        req(),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Super Admin bo‘lmagan xodim Super Admin yarata olmaydi', async () => {
    const c = new UsersController(makePrisma({ admins: [admin('a1', 'SUPER_ADMIN')] }));
    await expect(
      c.create(
        {
          fullName: 'Yangi',
          email: 'yangi@aliver.uz',
          roleId: 'role-SUPER_ADMIN',
          password: 'juda-kuchli-parol',
        },
        { sub: 'a9', kind: 'admin', roleCode: 'ADMINISTRATOR' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('zaif parolni rad etadi', async () => {
    const c = new UsersController(makePrisma({ admins: [] }));
    const base = { fullName: 'Yangi', email: 'y@aliver.uz', roleId: 'role-OPERATOR' };
    const user = { sub: 'a1', kind: 'admin' as const, roleCode: 'SUPER_ADMIN' };
    // Qisqa
    await expect(c.create({ ...base, password: 'qisqa' }, user)).rejects.toThrow(/kamida 10/);
    // Uzun, lekin faqat raqam — uzunlik yagona mezon emas
    await expect(c.create({ ...base, password: '1234567890' }, user)).rejects.toThrow(
      /faqat raqamlardan/,
    );
  });
});
