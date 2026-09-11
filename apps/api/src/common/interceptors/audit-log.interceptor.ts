import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_KEY, AuthPrincipal } from '../decorators';

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
              after: (sanitize(result) ?? null) as never,
              ip: req.ip ?? null,
              userAgent: req.headers['user-agent'] ?? null,
            },
          })
          .catch((e: Error) => this.logger.error(`Audit log yozilmadi: ${e.message}`));
      }),
    );
  }
}

/** Maxfiy maydonlar hech qachon logga tushmaydi. */
const SECRET_KEYS = new Set([
  'password',
  'passwordHash',
  'codeHash',
  'refreshTokenHash',
  'twoFaSecret',
  'cardNumber',
  'pan',
  'cvv',
  'token',
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitize(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEYS.has(k)) continue;
    out[k] = typeof v === 'bigint' ? v.toString() : sanitize(v, depth + 1);
  }
  return out;
}
