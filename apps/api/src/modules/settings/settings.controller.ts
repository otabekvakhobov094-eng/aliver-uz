import { BadRequestException, Body, Controller, Get, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Audit, CurrentUser, RequirePermissions, type AuthPrincipal } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SETTING_DEFS,
  SETTING_DEF_BY_KEY,
  SETTING_GROUPS,
  validateSetting,
} from './settings.definitions';

interface UpdateBody {
  /** Faqat o'zgargan kalitlar yuboriladi. */
  changes: Record<string, unknown>;
}

@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ta'riflar va joriy qiymatlar birga qaytariladi, chunki UI ikkalasisiz
   * to'g'ri boshqaruv elementini chiza olmaydi.
   */
  @Get()
  @RequirePermissions('settings.view')
  async list() {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: SETTING_DEFS.map((d) => d.key) } },
    });
    const byKey = new Map(rows.map((r: { key: string; value: unknown }) => [r.key, r.value]));

    return {
      groups: SETTING_GROUPS,
      settings: SETTING_DEFS.map((def) => ({
        ...def,
        value: byKey.get(def.key) ?? null,
        // Bazada yo'q kalit — seed ishlamagan yoki yangi qo'shilgan.
        // UI buni ko'rsatadi, jimgina `null` ko'rsatib qo'ymaydi.
        missing: !byKey.has(def.key),
      })),
    };
  }

  /**
   * Ommaviy saqlash. Hammasi BITTA tranzaksiyada: yarmi saqlanib, yarmi
   * saqlanmasligi sozlamalarni bir-biriga zid holatga olib keladi
   * (masalan `quietFrom` yangilanib, `quietTo` eski qolsa).
   */
  @Put()
  @RequirePermissions('settings.update')
  @Audit('settings', 'update')
  async update(
    @Body() body: UpdateBody,
    @CurrentUser() user: AuthPrincipal | undefined,
    @Req() req: Request & { auditBefore?: unknown },
  ) {
    const changes = body?.changes;
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
      throw new BadRequestException('`changes` obyekt bo‘lishi kerak');
    }

    const entries = Object.entries(changes);
    if (entries.length === 0) throw new BadRequestException('O‘zgarish yo‘q');

    const errors: Record<string, string> = {};
    const valid: Array<{ key: string; value: unknown }> = [];

    for (const [key, raw] of entries) {
      const def = SETTING_DEF_BY_KEY.get(key);
      if (!def) {
        // Ro'yxatda yo'q kalitni yozishga ruxsat bermaymiz: aks holda
        // admin panel orqali ixtiyoriy kalit yaratilib, kod uni hech
        // qachon o'qimaydi va sozlama "ishlamayapti" deb hisoblanadi.
        errors[key] = 'Noma’lum sozlama';
        continue;
      }
      if (def.sensitive && user?.roleCode !== 'SUPER_ADMIN') {
        errors[key] = 'Bu sozlamani faqat Super Admin o‘zgartira oladi';
        continue;
      }
      const result = validateSetting(def, raw);
      if (!result.ok) {
        errors[key] = result.error;
        continue;
      }
      valid.push({ key, value: result.value });
    }

    if (Object.keys(errors).length > 0) {
      // Hech narsa saqlanmaydi — qisman saqlash eng chalkashtiradigan holat.
      throw new BadRequestException({ message: 'Sozlamalarda xato bor', errors });
    }

    // Audit uchun eski qiymatlar. Interceptor `before` ni shu yerdan oladi.
    const previous = await this.prisma.setting.findMany({
      where: { key: { in: valid.map((v) => v.key) } },
    });
    req.auditBefore = Object.fromEntries(
      previous.map((r: { key: string; value: unknown }) => [r.key, r.value]),
    );

    await this.prisma.$transaction(
      valid.map((v) =>
        this.prisma.setting.upsert({
          where: { key: v.key },
          update: { value: v.value as never },
          create: { key: v.key, value: v.value as never },
        }),
      ),
    );

    return {
      saved: valid.length,
      values: Object.fromEntries(valid.map((v) => [v.key, v.value])),
    };
  }
}
