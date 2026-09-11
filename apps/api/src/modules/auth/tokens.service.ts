import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions, Response } from 'express';
import { AuthPrincipal } from '../../common/decorators';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTtl: number;
  refreshTtl: number;
}

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async issue(principal: AuthPrincipal): Promise<TokenPair> {
    const accessTtl = this.config.get<number>('JWT_ACCESS_TTL', 900);
    const refreshTtl = this.config.get<number>('JWT_REFRESH_TTL', 2592000);

    const accessToken = await this.jwt.signAsync(principal, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessTtl,
    });

    // Refresh token — tasodifiy satr, bazada faqat hash saqlanadi.
    const refreshToken = randomBytes(48).toString('base64url');
    return { accessToken, refreshToken, accessTtl, refreshTtl };
  }

  hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  cookieOptions(maxAgeSeconds: number): CookieOptions {
    const secure = this.config.get<boolean>('COOKIE_SECURE', false);
    const configuredDomain = this.config.get<string>('COOKIE_DOMAIN')?.trim();

    return {
      httpOnly: true,
      sameSite: secure ? 'none' : 'lax',
      secure,
      // Domain berilmasa host-only cookie ishlaydi. `localhost` domeni Render'da
      // brauzer tomonidan rad qilinib, adminni yana login sahifasiga qaytarardi.
      ...(configuredDomain ? { domain: configuredDomain } : {}),
      path: '/',
      maxAge: maxAgeSeconds * 1000,
    };
  }

  setAuthCookies(res: Response, pair: TokenPair): void {
    res.cookie('access_token', pair.accessToken, this.cookieOptions(pair.accessTtl));
    res.cookie('refresh_token', pair.refreshToken, this.cookieOptions(pair.refreshTtl));
  }

  clearAuthCookies(res: Response): void {
    const opts = { ...this.cookieOptions(0), maxAge: 0 };
    res.clearCookie('access_token', opts);
    res.clearCookie('refresh_token', opts);
  }
}
