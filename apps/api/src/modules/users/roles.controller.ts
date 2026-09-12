import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit, CurrentUser, RequirePermissions, type AuthPrincipal } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIONS, ALL_PERMISSIONS, MODULES } from '../rbac/permissions.constants';

/**
 * Rollar va huquqlar — TZ 73, 74; TZ-2 4.11.
 *
 * Huquq kodlari `<modul>.<harakat>` ko'rinishida va ro'yxati kodda
 * belgilangan. Panel orqali yangi huquq kodi o'ylab topib bo'lmaydi:
 * kod uni hech qachon tekshirmaydi, ya'ni "berilgan" huquq aslida
 * hech narsani ochmaydi — bu eng chalkashtiradigan holat.
 */

interface RoleBody {
  code?: string;
  name: string;
  description?: string | null;
  permissions?: string[];
}

/** Modul va harakatlarning o'zbekcha nomlari — matritsa shular bilan chiziladi. */
const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Buyurtmalar',
  products: 'Mahsulotlar',
  categories: 'Kategoriyalar',
  collections: 'Kolleksiyalar',
  inventory: 'Ombor',
  customers: 'Mijozlar',
  reviews: 'Sharhlar',
  discounts: 'Chegirmalar',
  banners: 'Bannerlar',
  content: 'Kontent',
  blog: 'Blog',
  b2b: 'B2B',
  reports: 'Hisobotlar',
  returns: 'Qaytarishlar',
  fiscal: 'Fiskal cheklar',
  payments: 'To‘lovlar',
  users: 'Adminlar',
  roles: 'Rollar',
  settings: 'Sozlamalar',
  audit: 'Audit log',
};

const ACTION_LABELS: Record<string, string> = {
  view: 'Ko‘rish',
  create: 'Yaratish',
  update: 'Tahrirlash',
  delete: 'O‘chirish',
  export: 'Eksport',
  approve: 'Tasdiqlash',
};

@Controller('admin/roles')
export class RolesController {
  constructor(private readonly prisma: PrismaService) {}

  private async withPermissions(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: { select: { code: true } } } },
        _count: { select: { admins: true } },
      },
    });
    if (!role) return null;
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      adminCount: role._count.admins,
      permissions: role.permissions.map(
        (rp: { permission: { code: string } }) => rp.permission.code,
      ),
    };
  }

  /** Matritsani chizish uchun kerakli hamma narsa bitta javobda. */
  @Get('matrix')
  @RequirePermissions('roles.view')
  matrix() {
    return {
      modules: MODULES.map((m) => ({ key: m, label: MODULE_LABELS[m] ?? m })),
      actions: ACTIONS.map((a) => ({ key: a, label: ACTION_LABELS[a] ?? a })),
      permissions: ALL_PERMISSIONS,
    };
  }

  @Get()
  @RequirePermissions('roles.view')
  async list() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: { select: { code: true } } } },
        _count: { select: { admins: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
    return roles.map(
      (role: {
        id: string;
        code: string;
        name: string;
        description: string | null;
        isSystem: boolean;
        _count: { admins: number };
        permissions: Array<{ permission: { code: string } }>;
      }) => ({
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        adminCount: role._count.admins,
        permissions: role.permissions.map((rp) => rp.permission.code),
      }),
    );
  }

  @Post()
  @RequirePermissions('roles.create')
  @Audit('roles', 'create')
  async create(@Body() body: RoleBody, @CurrentUser() user: AuthPrincipal | undefined) {
    /*
     * HUQUQ BERISH — FAQAT SUPER ADMIN.
     *
     * Tahrirlashda (`PUT`) bu shart bor edi, YARATISHDA esa yo'q.
     * Ya'ni `roles.create` huquqiga ega xodim yangi rol ochib, unga
     * TIZIMDAGI BARCHA huquqlarni bog'lay olardi — keyin o'sha rolni
     * o'ziga yoki yangi hisobga berib, super-admin darajasiga
     * chiqardi. `users.controller.ts` faqat `SUPER_ADMIN` KODLI rolni
     * berishni to'sardi, huquqlari aynan o'shanday bo'lgan boshqa
     * kodli rolni esa bemalol o'tkazardi.
     *
     * Huquqsiz rol yaratishga ruxsat qoladi: nomi va tavsifi bor
     * bo'sh rol zararsiz, huquqlarni esa super-admin beradi.
     */
    if ((body.permissions?.length ?? 0) > 0 && user?.roleCode !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Rolga huquq berishni faqat Super Admin qila oladi');
    }

    const name = String(body?.name ?? '').trim();
    if (!name) throw new BadRequestException('Rol nomi majburiy');

    const code = (body.code ?? name)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!code) throw new BadRequestException('Rol kodi noto‘g‘ri');

    const exists = await this.prisma.role.findUnique({ where: { code } });
    if (exists) throw new BadRequestException('Bu kodli rol allaqachon bor');

    const codes = this.assertPermissions(body.permissions ?? []);
    const permissions = await this.prisma.permission.findMany({ where: { code: { in: codes } } });

    const role = await this.prisma.role.create({
      data: {
        code,
        name,
        description: body.description?.trim() || null,
        isSystem: false,
        permissions: {
          create: permissions.map((p: { id: string }) => ({ permissionId: p.id })),
        },
      },
    });
    return this.withPermissions(role.id);
  }

  @Put(':id')
  @RequirePermissions('roles.update')
  @Audit('roles', 'update')
  async update(
    @Param('id') id: string,
    @Body() body: RoleBody,
    @CurrentUser() user: AuthPrincipal | undefined,
    @Req() req: Request & { auditBefore?: unknown },
  ) {
    const before = await this.withPermissions(id);
    if (!before) throw new NotFoundException('Rol topilmadi');
    req.auditBefore = before;

    // SUPER_ADMIN huquqlari kodda `*` sifatida belgilangan — bazadagi
    // ro'yxatni tahrirlash hech narsani o'zgartirmaydi, lekin xodim
    // o'zgartirdim deb o'ylaydi. Shuning uchun ochiq rad etamiz.
    if (before.code === 'SUPER_ADMIN' && body.permissions) {
      throw new BadRequestException('Super Admin huquqlari har doim to‘liq va tahrirlanmaydi');
    }
    if (before.isSystem && body.code && body.code !== before.code) {
      throw new BadRequestException('Tizim rolining kodi o‘zgartirilmaydi');
    }
    if (body.permissions && user?.roleCode !== 'SUPER_ADMIN') {
      // Huquq berish — huquq oshirish vositasi. Faqat super-admin.
      throw new ForbiddenException('Huquqlarni faqat Super Admin o‘zgartira oladi');
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.description !== undefined) data.description = body.description?.trim() || null;

    if (body.permissions) {
      const codes = this.assertPermissions(body.permissions);
      const permissions = await this.prisma.permission.findMany({ where: { code: { in: codes } } });
      // Almashtirish bitta tranzaksiyada: eski ro'yxat o'chib, yangisi
      // yozilmay qolsa rol huquqsiz qoladi va xodimlar ishlay olmaydi.
      await this.prisma.$transaction([
        this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
        this.prisma.rolePermission.createMany({
          data: permissions.map((p: { id: string }) => ({ roleId: id, permissionId: p.id })),
        }),
        this.prisma.role.update({ where: { id }, data }),
      ]);
    } else if (Object.keys(data).length > 0) {
      await this.prisma.role.update({ where: { id }, data });
    }

    return this.withPermissions(id);
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  @Audit('roles', 'delete')
  async remove(@Param('id') id: string) {
    const role = await this.withPermissions(id);
    if (!role) throw new NotFoundException('Rol topilmadi');
    if (role.isSystem) throw new BadRequestException('Tizim rolini o‘chirib bo‘lmaydi');
    if (role.adminCount > 0) {
      throw new BadRequestException(
        `Bu rolda ${role.adminCount} ta admin bor — avval ularni boshqa rolga o‘tkazing`,
      );
    }
    await this.prisma.role.delete({ where: { id } });
    return { ok: true };
  }

  /** Faqat kodda mavjud huquqlar qabul qilinadi. */
  private assertPermissions(codes: unknown): string[] {
    if (!Array.isArray(codes) || codes.some((c) => typeof c !== 'string')) {
      throw new BadRequestException('Huquqlar ro‘yxati noto‘g‘ri');
    }
    const known = new Set<string>(ALL_PERMISSIONS);
    const unknown = (codes as string[]).filter((c) => !known.has(c));
    if (unknown.length > 0) {
      throw new BadRequestException(`Noma’lum huquqlar: ${unknown.join(', ')}`);
    }
    return [...new Set(codes as string[])];
  }
}
