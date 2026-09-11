import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import type { PermissionCode } from '../../modules/rbac/permissions.constants';

export const IS_PUBLIC_KEY = 'isPublic';
/** Endpoint autentifikatsiyasiz ochiq. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = 'permissions';
/** Endpoint uchun talab qilinadigan huquqlar (hammasi kerak). */
export const RequirePermissions = (...perms: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);

export const AUDIT_KEY = 'audit';
/** Harakatni audit logga yozish. */
export const Audit = (module: string, action: string) => SetMetadata(AUDIT_KEY, { module, action });

export interface AuthPrincipal {
  sub: string;
  kind: 'admin' | 'customer';
  roleCode?: string;
  permissions?: string[];
  phone?: string;
  email?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal | undefined =>
    ctx.switchToHttp().getRequest<{ user?: AuthPrincipal }>().user,
);
