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
  Query,
  Req,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { Request } from 'express';
import { Audit, CurrentUser, RequirePermissions, type AuthPrincipal } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Admin foydalanuvchilari — TZ 72, TZ-2 4.11.
 *
 * Bu modulning asosiy vazifasi CRUD emas, **o'zini qulflab qo'yishdan
 * himoya**. Oxirgi super-adminni o'chirish yoki bloklash — qaytarib
 * bo'lmaydigan xato: paneldan hech kim kira olmaydi va faqat bazaga
 * to'g'ridan-to'g'ri SQL bilan tuzatiladi.
 */

interface CreateBody {
  fullName: string;
  email: string;
  phone?: string;
  roleId: string;
  password: string;
}

interface UpdateBody {
  fullName?: string;
  phone?: string | null;
  roleId?: string;
  status?: 'ACTIVE' | 'BLOCKED';
}

const MIN_PASSWORD = 10;

function assertPassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new BadRequestException(`Parol kamida ${MIN_PASSWORD} ta belgidan iborat bo‘lsin`);
  }
  // Uzunlik yagona mezon emas: "1234567890" ham 10 ta belgi.
  if (/^\d+$/.test(password)) {
    throw new BadRequestException('Parol faqat raqamlardan iborat bo‘lmasin');
  }
  return password;
}

@Controller('admin/users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  private readonly listSelect = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    status: true,
    lastLoginAt: true,
    twoFaEnabled: true,
    createdAt: true,
    role: { select: { id: true, code: true, name: true } },
  };

  /** Faol super-adminlar soni — o'chirish va bloklashdan oldin tekshiriladi. */
  private async activeSuperAdmins(excludeId?: string): Promise<number> {
    return this.prisma.admin.count({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        role: { code: 'SUPER_ADMIN' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  @Get()
  @RequirePermissions('users.view')
  async list(@Query('q') q?: string, @Query('status') status?: string) {
    return this.prisma.admin.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' as const } },
                { email: { contains: q, mode: 'insensitive' as const } },
                { phone: { contains: q } },
              ],
            }
          : {}),
      },
      select: this.listSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  @RequirePermissions('users.create')
  @Audit('users', 'create')
  async create(@Body() body: CreateBody, @CurrentUser() user: AuthPrincipal | undefined) {
    const password = assertPassword(body?.password);
    const email = String(body?.email ?? '').trim().toLowerCase();
    const fullName = String(body?.fullName ?? '').trim();
    if (!email || !fullName) throw new BadRequestException('Ism va e-pochta majburiy');

    const role = await this.prisma.role.findUnique({ where: { id: body.roleId } });
    if (!role) throw new BadRequestException('Rol topilmadi');

    // Super-adminni faqat super-admin yaratadi. Aks holda `users.create`
    // huquqi bo'lgan har qanday xodim o'ziga to'liq huquq bera oladi.
    if (role.code === 'SUPER_ADMIN' && user?.roleCode !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Super Admin yaratishga faqat Super Admin haqli');
    }

    const exists = await this.prisma.admin.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('Bu e-pochta band');

    return this.prisma.admin.create({
      data: {
        fullName,
        email,
        phone: body.phone?.trim() || null,
        roleId: role.id,
        passwordHash: await argon2.hash(password),
      },
      select: this.listSelect,
    });
  }

  @Put(':id')
  @RequirePermissions('users.update')
  @Audit('users', 'update')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateBody,
    @CurrentUser() user: AuthPrincipal | undefined,
    @Req() req: Request & { auditBefore?: unknown },
  ) {
    const target = await this.prisma.admin.findFirst({
      where: { id, deletedAt: null },
      select: { ...this.listSelect, roleId: true },
    });
    if (!target) throw new NotFoundException('Admin topilmadi');
    req.auditBefore = target;

    const isSelf = user?.sub === id;

    // O'z rolini o'zgartirish — huquq oshirishning eng oddiy yo'li.
    if (body.roleId && body.roleId !== target.roleId && isSelf) {
      throw new ForbiddenException('O‘z rolingizni o‘zgartira olmaysiz');
    }

    if (body.roleId && body.roleId !== target.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: body.roleId } });
      if (!role) throw new BadRequestException('Rol topilmadi');
      if (role.code === 'SUPER_ADMIN' && user?.roleCode !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Super Admin roli berishga faqat Super Admin haqli');
      }
      // Oxirgi super-adminni boshqa rolga o'tkazib bo'lmaydi.
      if (target.role.code === 'SUPER_ADMIN' && (await this.activeSuperAdmins(id)) === 0) {
        throw new BadRequestException('Bu yagona faol Super Admin — rolini o‘zgartirib bo‘lmaydi');
      }
    }

    if (body.status === 'BLOCKED') {
      if (isSelf) throw new BadRequestException('O‘zingizni bloklay olmaysiz');
      if (target.role.code === 'SUPER_ADMIN' && (await this.activeSuperAdmins(id)) === 0) {
        throw new BadRequestException('Bu yagona faol Super Admin — bloklab bo‘lmaydi');
      }
    }

    return this.prisma.admin.update({
      where: { id },
      data: {
        ...(body.fullName !== undefined ? { fullName: body.fullName.trim() } : {}),
        ...(body.phone !== undefined ? { phone: body.phone?.trim() || null } : {}),
        ...(body.roleId !== undefined ? { roleId: body.roleId } : {}),
        ...(body.status !== undefined ? { status: body.status as never } : {}),
      },
      select: this.listSelect,
    });
  }

  /**
   * Parolni tiklash. Eski parol so'ralmaydi — bu boshqa xodimning
   * parolini almashtirish, o'zinikini emas. Shuning uchun huquq
   * `users.update` va harakat audit logga tushadi.
   */
  @Post(':id/password')
  @RequirePermissions('users.update')
  @Audit('users', 'password-reset')
  async resetPassword(@Param('id') id: string, @Body() body: { password: string }) {
    const password = assertPassword(body?.password);
    const target = await this.prisma.admin.findFirst({ where: { id, deletedAt: null } });
    if (!target) throw new NotFoundException('Admin topilmadi');

    await this.prisma.admin.update({
      where: { id },
      data: { passwordHash: await argon2.hash(password) },
    });
    // Eski sessiyalar yopiladi: parol o'zgargach, avvalgi qurilmalar
    // kirish huquqini saqlab qolmasligi kerak.
    await this.prisma.adminSession.deleteMany({ where: { adminId: id } });
    return { ok: true, sessionsRevoked: true };
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  @Audit('users', 'delete')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthPrincipal | undefined) {
    if (user?.sub === id) throw new BadRequestException('O‘zingizni o‘chira olmaysiz');

    const target = await this.prisma.admin.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, role: { select: { code: true } } },
    });
    if (!target) throw new NotFoundException('Admin topilmadi');

    if (target.role.code === 'SUPER_ADMIN' && (await this.activeSuperAdmins(id)) === 0) {
      throw new BadRequestException('Bu yagona faol Super Admin — o‘chirib bo‘lmaydi');
    }

    // Yumshoq o'chirish: audit log va buyurtma tarixi bu adminga
    // havola qiladi, yozuvni butunlay olib tashlash ularni buzadi.
    await this.prisma.admin.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.prisma.adminSession.deleteMany({ where: { adminId: id } });
    return { ok: true };
  }
}
