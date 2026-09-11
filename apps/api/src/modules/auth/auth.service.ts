import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthPrincipal } from '../../common/decorators';
import { OtpService, normalizePhone } from './otp.service';
import { TokensService, TokenPair } from './tokens.service';

export interface CustomerAuthResult {
  tokens: TokenPair;
  customer: { id: string; phone: string; firstName: string | null; lastName: string | null };
  isNew: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly tokens: TokensService,
  ) {}

  requestOtp(phone: string, ip?: string, userAgent?: string) {
    return this.otp.request({ phone, ip, userAgent, purpose: OtpPurpose.LOGIN });
  }

  /**
   * Telefon + OTP orqali kirish. Mijoz bo'lmasa — shu yerda yaratiladi
   * (TZ 43: alohida ro'yxatdan o'tish qadami yo'q).
   */
  async verifyOtpAndLogin(params: {
    phone: string;
    code: string;
    firstName?: string;
    lastName?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<CustomerAuthResult> {
    const phone = normalizePhone(params.phone);
    await this.otp.verify(phone, params.code, OtpPurpose.LOGIN);

    const existing = await this.prisma.customer.findUnique({ where: { phone } });
    const customer =
      existing ??
      (await this.prisma.customer.create({
        data: {
          phone,
          firstName: params.firstName ?? null,
          lastName: params.lastName ?? null,
        },
      }));

    if (customer.status === 'BLOCKED') {
      throw new UnauthorizedException('Hisob bloklangan. Qo‘llab-quvvatlash bilan bog‘laning.');
    }

    const principal: AuthPrincipal = { sub: customer.id, kind: 'customer', phone: customer.phone };
    const tokens = await this.tokens.issue(principal);

    await this.prisma.customerSession.create({
      data: {
        customerId: customer.id,
        refreshTokenHash: this.tokens.hashRefresh(tokens.refreshToken),
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
        expiresAt: new Date(Date.now() + tokens.refreshTtl * 1000),
      },
    });

    return {
      tokens,
      customer: {
        id: customer.id,
        phone: customer.phone,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
      isNew: !existing,
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const hash = this.tokens.hashRefresh(refreshToken);
    const session = await this.prisma.customerSession.findUnique({
      where: { refreshTokenHash: hash },
      include: { customer: true },
    });
    if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Sessiya yaroqsiz. Qaytadan kiring.');
    }

    const pair = await this.tokens.issue({
      sub: session.customerId,
      kind: 'customer',
      phone: session.customer.phone,
    });

    // Rotatsiya: eski refresh bekor qilinadi, yangisi yoziladi.
    await this.prisma.$transaction([
      this.prisma.customerSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.customerSession.create({
        data: {
          customerId: session.customerId,
          refreshTokenHash: this.tokens.hashRefresh(pair.refreshToken),
          ip: session.ip,
          userAgent: session.userAgent,
          expiresAt: new Date(Date.now() + pair.refreshTtl * 1000),
        },
      }),
    ]);

    return pair;
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.customerSession.updateMany({
      where: { refreshTokenHash: this.tokens.hashRefresh(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(customerId: string) {
    return this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        locale: true,
        ordersCount: true,
        createdAt: true,
      },
    });
  }
}
