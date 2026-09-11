import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthPrincipal, CurrentUser, Public, RequirePermissions } from '../../common/decorators';
import { AdminLoginDto } from '../auth/dto/auth.dto';
import { TokensService } from '../auth/tokens.service';
import { AdminAuthService } from './admin-auth.service';
import { PrismaService } from '../../prisma/prisma.service';

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
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    this.tokens.setAuthCookies(res, result.tokens);
    return { admin: result.admin };
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
  @Get('permissions')
  permissions(@CurrentUser() user?: AuthPrincipal) {
    if (!user || user.kind !== 'admin') throw new UnauthorizedException();
    return { role: user.roleCode, permissions: user.permissions ?? [] };
  }

  @Get('audit-logs')
  @RequirePermissions('audit.view')
  auditLogs() {
    return this.prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { admin: { select: { id: true, fullName: true, email: true } } },
    });
  }
}
