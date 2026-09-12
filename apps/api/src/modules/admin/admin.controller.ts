import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthPrincipal, CurrentUser, Public, RequirePermissions } from '../../common/decorators';
import { AdminLoginDto } from '../auth/dto/auth.dto';
import { TokensService } from '../auth/tokens.service';
import { AdminAuthService } from './admin-auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { auditIp } from '../../common/util/client-ip';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminAuth: AdminAuthService,
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('auth/login')
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @ApiOperation({ summary: 'Admin kirishi (email + parol + 2FA)' })
  async login(
    @Body() dto: AdminLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminAuth.login({
      email: dto.email,
      password: dto.password,
      totp: dto.totp,
      ip: auditIp(req) ?? undefined,
      userAgent: req.headers['user-agent'],
    });
    this.tokens.setAuthCookies(res, result.tokens);
    return { admin: result.admin };
  }

  /**
   * Kirish tokenini uzaytirish. Cookie dagi refresh token bilan
   * ishlaydi — tanada hech narsa yuborilmaydi.
   */
  @Public()
  @Post('auth/refresh')
  @Throttle({ default: { limit: 60, ttl: 300_000 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[
      'refresh_token'
    ];
    if (!token) throw new UnauthorizedException('Sessiya topilmadi. Qaytadan kiring.');
    const pair = await this.adminAuth.refresh(token);
    this.tokens.setAuthCookies(res, pair);
    return { ok: true };
  }

  @Public()
  @Post('auth/logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[
      'refresh_token'
    ];
    await this.adminAuth.logout(token);
    this.tokens.clearAuthCookies(res);
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user?: AuthPrincipal) {
    if (!user || user.kind !== 'admin') throw new UnauthorizedException();
    return this.adminAuth.profile(user.sub);
  }

  /** Frontend sidebar shu ro'yxat asosida quriladi. */
  /**
   * Kim kirgan va nima qila oladi.
   *
   * Ism va e-pochta ham qaytariladi: panelning yuqori qatorida kim
   * ishlayotgani ko'rinib turishi kerak. Bu bezak emas — bitta
   * kompyuterda bir necha xodim ishlaydigan do'konda «kim o'zgartirdi»
   * degan savol audit logdan oldin shu yerda hal bo'ladi.
   */
  @Get('permissions')
  async permissions(@CurrentUser() user?: AuthPrincipal) {
    if (!user || user.kind !== 'admin') throw new UnauthorizedException();

    const admin = await this.prisma.admin.findUnique({
      where: { id: user.sub },
      select: { fullName: true, email: true },
    });

    return {
      role: user.roleCode,
      permissions: user.permissions ?? [],
      // Admin o'chirilgan bo'lsa ham token amal qilishi mumkin —
      // shunda hech bo'lmasa e-pochta ko'rsatiladi.
      fullName: admin?.fullName ?? null,
      email: admin?.email ?? user.email ?? null,
    };
  }

  /*
   * `GET /admin/audit-logs` OLIB TASHLANDI.
   *
   * U `admin/audit` moduli yozilgunga qadar qilingan vaqtinchalik yo'l
   * edi: filtri ham, sahifalashi ham yo'q, oxirgi 100 ta yozuvni
   * qaytarardi. Adminka uni hech qachon chaqirmagan — ya'ni ikkinchi,
   * qo'riqlanmagan eshik bo'lib turgan. Audit jurnali `admin/audit`
   * da: `?` filtrlari, sahifalash va yozuv bo'yicha tarix bilan.
   */
}
