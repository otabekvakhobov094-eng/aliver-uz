import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthPrincipal, IS_PUBLIC_KEY } from '../decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthPrincipal }>();
    const token = extractToken(req);

    // Ochiq marshrutda token BO'LSA ham uni o'qiymiz.
    //
    // Ilgari `isPublic` bo'lsa darrov `true` qaytarilar va `req.user`
    // hech qachon to'ldirilmasdi. Natijada `@Public` + `@CurrentUser`
    // birikmasi (savat, buyurtmalar, qaytarish) har doim "mehmon" deb
    // hisoblanardi: mijoz o'z buyurtmasini qaytara olmas, egalik
    // tekshiruvi esa umuman ishlamasdi.
    if (isPublic) {
      if (token) {
        try {
          req.user = await this.jwt.verifyAsync<AuthPrincipal>(token, {
            secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          });
        } catch {
          // Ochiq marshrutda yaroqsiz token — xato emas, shunchaki mehmon.
          req.user = undefined;
        }
      }
      return true;
    }

    if (!token) throw new UnauthorizedException('Avtorizatsiya talab qilinadi');

    try {
      req.user = await this.jwt.verifyAsync<AuthPrincipal>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      return true;
    } catch {
      throw new UnauthorizedException('Token yaroqsiz yoki muddati tugagan');
    }
  }
}

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.['access_token'];
}
