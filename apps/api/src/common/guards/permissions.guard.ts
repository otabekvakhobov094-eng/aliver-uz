import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthPrincipal, PERMISSIONS_KEY } from '../decorators';

/**
 * Huquq tekshiruvi. Rad etilgan urinish ham log qilinadi —
 * TZ 75 talab qiladi va u xavfsizlik hodisasi hisoblanadi.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthPrincipal }>();
    const user = req.user;
    if (!user || user.kind !== 'admin') throw new ForbiddenException('Ruxsat yo‘q');
    if (user.roleCode === 'SUPER_ADMIN') return true;

    const owned = new Set(user.permissions ?? []);
    const missing = required.filter((p) => !owned.has(p));
    if (missing.length > 0) {
      throw new ForbiddenException(`Yetishmayotgan huquq: ${missing.join(', ')}`);
    }
    return true;
  }
}
