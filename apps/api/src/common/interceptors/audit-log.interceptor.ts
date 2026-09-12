import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_KEY, AuthPrincipal } from '../decorators';
import { auditIp } from '../util/client-ip';

/**
 * TZ 75 — audit log. @Audit('products', 'update') bilan belgilangan
 * endpointlar bajarilgach yozuv qo'shiladi.
 *
 * Eslatma: "before" qiymatini xizmat qatlami taqdim etadi
 * (req.auditBefore), chunki faqat u eski holatni biladi.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<{ module: string; action: string } | undefined>(
      AUDIT_KEY,
      ctx.getHandler(),
    );
    if (!meta) return next.handle();

    const req = ctx
      .switchToHttp()
      .getRequest<
        Request & { user?: AuthPrincipal; auditBefore?: unknown; auditRecordId?: string }
      >();

    return next.handle().pipe(
      tap((result) => {
        const recordId =
          req.auditRecordId ??
          (result && typeof result === 'object' && 'id' in result
            ? String((result as { id: unknown }).id)
            : undefined);

        void this.prisma.auditLog
          .create({
            data: {
              adminId: req.user?.kind === 'admin' ? req.user.sub : null,
              module: meta.module,
              action: meta.action,
              recordId: recordId ?? null,
              before: (req.auditBefore ?? null) as never,
              after: (sanitize(result, 0, meta.module) ?? null) as never,
              ip: auditIp(req),
              userAgent: req.headers['user-agent'] ?? null,
            },
          })
          .catch((e: Error) => this.logger.error(`Audit log yozilmadi: ${e.message}`));
      }),
    );
  }
}

/**
 * Maxfiy maydonlar hech qachon logga tushmaydi.
 *
 * `code` shu ro'yxatda YO'Q edi va bu sovg'a sertifikatlari
 * modulining butun ma'nosini yo'qqa chiqarardi: kod bazada faqat
 * xesh holida saqlanadi, ochiq matni esa BIR MARTA, yaratish
 * javobida ko'rsatiladi. O'sha javob esa `@Audit('gift_cards',
 * 'issue')` orqali audit jurnaliga AYNAN O'SHANDAY yozilardi.
 * Natijada `audit.view` huquqiga ega har qanday xodim (masalan
 * moliyachi — u sertifikat bera olmaydi ham) berilgan barcha
 * kodlarni o'qib olardi. Jurnal esa ataylab o'chirilmaydi.
 */
const SECRET_KEYS = new Set([
  'password',
  'passwordHash',
  'codeHash',
  'plainCode',
  'refreshTokenHash',
  'twoFaSecret',
  'cardNumber',
  'pan',
  'cvv',
  'token',
  'secret',
  'apiKey',
]);

/**
 * Ba'zi maydon nomlari faqat MA'LUM MODULDA maxfiy.
 *
 * `code` — sovg'a sertifikatida pulga teng, chegirmada esa oddiy
 * promo-kod va jurnalda ko'rinishi kerak («qaysi kod tahrirlandi»
 * degan savolga javob beradi). Shuning uchun ro'yxat modulga bog'liq.
 */
const MODULE_SECRET_KEYS: Record<string, Set<string>> = {
  gift_cards: new Set(['code']),
};

export function sanitize(value: unknown, depth = 0, module?: string): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitize(v, depth + 1, module));
  const extra = module ? MODULE_SECRET_KEYS[module] : undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.has(k) || extra?.has(k)) continue;
    out[k] = typeof v === 'bigint' ? v.toString() : sanitize(v, depth + 1, module);
  }
  return out;
}
