import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthPrincipal, CurrentUser, Public } from '../../common/decorators';
import { AuthService } from './auth.service';
import { RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { TokensService } from './tokens.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
  ) {}

  @Public()
  @Post('otp/request')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Telefon raqamiga SMS-kod yuborish' })
  requestOtp(@Body() dto: RequestOtpDto, @Req() req: Request) {
    return this.auth.requestOtp(dto.phone, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Post('otp/verify')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Kodni tasdiqlash va kirish' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verifyOtpAndLogin({
      phone: dto.phone,
      code: dto.code,
      firstName: dto.firstName,
      lastName: dto.lastName,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    this.tokens.setAuthCookies(res, result.tokens);
    return { customer: result.customer, isNew: result.isNew };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[
      'refresh_token'
    ];
    if (!token) throw new UnauthorizedException('Refresh token topilmadi');
    const pair = await this.auth.refresh(token);
    this.tokens.setAuthCookies(res, pair);
    return { ok: true };
  }

  @Public()
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[
      'refresh_token'
    ];
    await this.auth.logout(token);
    this.tokens.clearAuthCookies(res);
    return { ok: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Joriy mijoz profili' })
  me(@CurrentUser() user?: AuthPrincipal) {
    if (!user || user.kind !== 'customer') throw new UnauthorizedException();
    return this.auth.me(user.sub);
  }
}
