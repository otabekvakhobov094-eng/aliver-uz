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

  /**
   * Autentifikatsiya cookie sining parametrlari.
   *
   * Bu yerda ikkita xato admin panelini butunlay ochilmaydigan qilib
   * qo'ygan edi — ikkalasi ham JIMGINA ishlaydi: brauzer cookie ni rad
   * etadi, lekin hech qanday xato ko'rsatmaydi.
   *
   *  1. `domain: 'localhost'` STANDART QIYMAT sifatida turardi.
   *     `aliver-uz-api-stage.onrender.com` dan kelgan javobda
   *     `Domain=localhost` bo'lsa, brauzer cookie ni butunlay tashlaydi:
   *     domen javob bergan xostga mos kelmaydi.
   *
   *     Endi domen FAQAT aniq ko'rsatilganda qo'yiladi. Ko'rsatilmasa
   *     host-only cookie bo'ladi — bu aksariyat holat uchun to'g'ri
   *     xatti-harakat.
   *
   *  2. `sameSite: 'lax'` qat'iy yozilgan edi. Admin va API turli
   *     domenlarda bo'lganda bu ham cookie ni rad etadi.
   *
   *     Endi u sozlanadi, lekin ASOSIY yechim boshqa: admin va web
   *     API ga o'z domenidagi `/api` proxy orqali murojaat qiladi
   *     (`apps/admin/src/lib/api-base.ts`), ya'ni so'rov umuman
   *     cross-site bo'lmaydi va `lax` yetarli.
   */
  cookieOptions(maxAgeSeconds: number): CookieOptions {
    const secure = this.config.get<boolean>('COOKIE_SECURE', false);
    const sameSite = this.config.get<'lax' | 'strict' | 'none'>('COOKIE_SAMESITE', 'lax');
    const domain = this.config.get<string>('COOKIE_DOMAIN', '').trim();

    return {
      httpOnly: true,
      sameSite,
      secure,
      // "localhost" qiymati ataylab e'tiborsiz qoldiriladi: u faqat
      // lokal mashinada to'g'ri va boshqa hamma joyda cookie ni yo'q
      // qiladi. Lokalda esa domensiz cookie baribir ishlaydi.
      ...(domain && domain !== 'localhost' ? { domain } : {}),
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
