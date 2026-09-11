import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthPrincipal } from '../../common/decorators';
import { TokensService, TokenPair } from '../auth/tokens.service';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
  ) {}

  /**
   * Admin kirishi: email + parol (+ 2FA yoqilgan bo'lsa TOTP).
   * Xato xabari qaysi maydon noto'g'ri ekanini oshkor qilmaydi.
   */
  async login(params: {
    email: string;
    password: string;
    totp?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{
    tokens: TokenPair;
    admin: { id: string; email: string; fullName: string; role: string };
  }> {
    const admin = await this.prisma.admin.findUnique({
      where: { email: params.email.toLowerCase().trim() },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    const invalid = new UnauthorizedException('Email yoki parol noto‘g‘ri');
    if (!admin || admin.deletedAt) throw invalid;
    if (admin.status !== 'ACTIVE') throw new UnauthorizedException('Hisob to‘xtatilgan');

    const ok = await argon2.verify(admin.passwordHash, params.password).catch(() => false);
    if (!ok) throw invalid;

    if (admin.twoFaEnabled) {
      if (!params.totp) throw new UnauthorizedException('2FA kodi talab qilinadi');
      if (!admin.twoFaSecret || !authenticator.check(params.totp, admin.twoFaSecret)) {
        throw new UnauthorizedException('2FA kodi noto‘g‘ri');
      }
    }

    const permissions = admin.role.permissions.map(
      (rp: { permission: { code: string } }) => rp.permission.code,
    );
    const principal: AuthPrincipal = {
      sub: admin.id,
      kind: 'admin',
      email: admin.email,
      roleCode: admin.role.code,
      permissions,
    };

    const pair = await this.tokens.issue(principal);
    await this.prisma.$transaction([
      this.prisma.adminSession.create({
        data: {
          adminId: admin.id,
          refreshTokenHash: this.tokens.hashRefresh(pair.refreshToken),
          ip: params.ip ?? null,
          userAgent: params.userAgent ?? null,
          expiresAt: new Date(Date.now() + pair.refreshTtl * 1000),
        },
      }),
      this.prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } }),
    ]);

    return {
      tokens: pair,
      admin: { id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role.code },
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.adminSession.updateMany({
      where: { refreshTokenHash: this.tokens.hashRefresh(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Barcha sessiyalarni majburiy yopish (parol o'zgarganda yoki xavfsizlik hodisasida). */
  async revokeAllSessions(adminId: string): Promise<void> {
    await this.prisma.adminSession.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async profile(adminId: string) {
    return this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        twoFaEnabled: true,
        lastLoginAt: true,
        role: { select: { code: true, name: true } },
      },
    });
  }
}
