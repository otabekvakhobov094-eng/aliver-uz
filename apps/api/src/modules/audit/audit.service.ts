import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Audit log — kim, nima qildi.
 *
 * Yozuv `AuditLogInterceptor` orqali avtomatik tushadi (1-etap). Bu
 * servis faqat O'QISH uchun: audit logni tahrirlash yoki o'chirish
 * IMKONI YO'Q, aks holda uning ma'nosi qolmasdi.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: {
    module?: string;
    action?: string;
    adminId?: string;
    recordId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    perPage?: number;
  }) {
    const page = query.page ?? 1;
    const perPage = Math.min(query.perPage ?? 50, 200);

    const where: Record<string, unknown> = {};
    if (query.module) where.module = query.module;
    if (query.action) where.action = query.action;
    if (query.adminId) where.adminId = query.adminId;
    if (query.recordId) where.recordId = query.recordId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59`) } : {}),
      };
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where: where as never }),
      this.prisma.auditLog.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { admin: { select: { fullName: true, email: true } } },
      }),
    ]);

    return {
      items: rows.map((r: AuditRow) => ({
        id: r.id,
        module: r.module,
        action: r.action,
        recordId: r.recordId,
        adminName: r.admin?.fullName ?? null,
        adminEmail: r.admin?.email ?? null,
        ip: r.ip,
        createdAt: r.createdAt,
        /** Ro'yxatda faqat o'zgargan maydonlar nomi ko'rinadi. */
        changedFields: diffFields(r.before, r.after),
      })),
      total,
      page,
      perPage,
    };
  }

  async get(id: string) {
    const row = await this.prisma.auditLog.findUnique({
      where: { id },
      include: { admin: { select: { fullName: true, email: true } } },
    });
    if (!row) throw new NotFoundException('Audit yozuvi topilmadi');

    return {
      id: row.id,
      module: row.module,
      action: row.action,
      recordId: row.recordId,
      adminName: row.admin?.fullName ?? null,
      adminEmail: row.admin?.email ?? null,
      ip: row.ip,
      userAgent: row.userAgent,
      createdAt: row.createdAt,
      before: row.before,
      after: row.after,
      diff: buildDiff(row.before, row.after),
    };
  }

  /** Filtrlar uchun mavjud modul va harakatlar. */
  async facets() {
    /*
     * `groupBy`, `distinct` + `take` EMAS.
     *
     * `findMany({ distinct, take: 100 })` avval 100 ta QATOR oladi va
     * shundan keyin takrorlarini tashlaydi. Audit jurnali kattalashsa
     * o'sha 100 qator bitta-ikkita moduldan iborat bo'lib qoladi va
     * filtr ro'yxatidan qolgan modullar JIMGINA yo'qoladi: xodim
     * «bunday yozuv yo'q ekan» deb o'ylaydi, aslida u bor.
     *
     * `groupBy` esa bazaning o'zida guruhlaydi — ro'yxat har doim
     * to'liq.
     */
    const [modules, actions] = await Promise.all([
      this.prisma.auditLog.groupBy({ by: ['module'] }),
      this.prisma.auditLog.groupBy({ by: ['action'] }),
    ]);
    return {
      modules: modules.map((m: { module: string }) => m.module).sort(),
      actions: actions.map((a: { action: string }) => a.action).sort(),
    };
  }

  /** Bitta yozuv bo'yicha butun tarix — "bu buyurtmani kim o'zgartirgan". */
  async forRecord(recordId: string) {
    const rows = await this.prisma.auditLog.findMany({
      where: { recordId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { admin: { select: { fullName: true } } },
    });
    return rows.map((r: AuditRow) => ({
      id: r.id,
      module: r.module,
      action: r.action,
      adminName: r.admin?.fullName ?? null,
      createdAt: r.createdAt,
      diff: buildDiff(r.before, r.after),
    }));
  }
}

interface AuditRow {
  id: string;
  module: string;
  action: string;
  recordId: string | null;
  admin?: { fullName: string; email?: string } | null;
  ip: string | null;
  userAgent?: string | null;
  before: unknown;
  after: unknown;
  createdAt: Date;
}

export interface DiffEntry {
  field: string;
  before: unknown;
  after: unknown;
}

/**
 * `before` va `after` orasidagi farq.
 *
 * Butun JSON ni yonma-yon ko'rsatish foydasiz: admin 40 ta maydondan
 * qaysi biri o'zgarganini qidirib o'tirmasligi kerak.
 */
export function buildDiff(before: unknown, after: unknown): DiffEntry[] {
  // Ba'zi modullar audit ga MASSIV yozadi (masalan narx matritsasi
  // qatorlari). Ilgari bunday yozuv "hech narsa o'zgarmagan" bo'lib
  // ko'rinardi, chunki massiv obyekt sifatida qabul qilinmasdi.
  if (Array.isArray(before) || Array.isArray(after)) {
    return sameValue(before, after)
      ? []
      : [{ field: '(ro‘yxat)', before: before ?? null, after: after ?? null }];
  }

  const a = asRecord(before);
  const b = asRecord(after);
  if (!a && !b) return [];

  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  const out: DiffEntry[] = [];

  for (const key of keys) {
    const prev = a?.[key];
    const next = b?.[key];
    if (!sameValue(prev, next)) out.push({ field: key, before: prev ?? null, after: next ?? null });
  }
  return out.sort((x, y) => x.field.localeCompare(y.field));
}

export function diffFields(before: unknown, after: unknown): string[] {
  return buildDiff(before, after).map((d) => d.field);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/** Chuqur solishtirish — ichma-ich obyektlar ham to'g'ri taqqoslanadi. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // `null` va "maydon umuman yo'q" — bir xil ma'no. Ilgari ular farq
  // deb qabul qilinar va ro'yxatda "— dan — ga" degan bo'sh qator
  // chiqib turardi.
  const aEmpty = a === null || a === undefined;
  const bEmpty = b === null || b === undefined;
  if (aEmpty && bEmpty) return true;
  if (aEmpty || bEmpty) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}
