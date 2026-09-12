import { Body, Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Length, NotEquals } from 'class-validator';
import { Type } from 'class-transformer';
import { Audit, AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';
import { LoyaltyExpiryService } from './loyalty-expiry.service';
import { LoyaltyService } from './loyalty.service';

class AdjustDto {
  @Type(() => Number)
  @IsInt()
  @NotEquals(0, { message: 'Ball noldan farqli bo‘lishi kerak' })
  points!: number;

  @IsString()
  @Length(3, 300, { message: 'Izoh majburiy — bu pul bilan bog‘liq amal' })
  comment!: string;
}

/** Mijoz uchun: o'z balansi va tarixi. */
@ApiTags('loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyalty: LoyaltyService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Ball balansi va kurs' })
  balance(@CurrentUser() user?: AuthPrincipal) {
    if (user?.kind !== 'customer') throw new ForbiddenException('Kabinetga kiring');
    return this.loyalty.balance(user.sub);
  }

  @Get('history')
  @ApiOperation({ summary: 'Ball harakatlari tarixi' })
  history(@CurrentUser() user?: AuthPrincipal) {
    if (user?.kind !== 'customer') throw new ForbiddenException('Kabinetga kiring');
    return this.loyalty.history(user.sub);
  }

  /**
   * Checkout uchun: shu summada nechta ball ishlatish mumkin.
   *
   * Mijoz chegaraga urilganini SAQLASHDAN OLDIN bilishi kerak — aks
   * holda u ball kiritadi, buyurtma beradi va kutganidan kam chegirma
   * olganini faqat oxirida ko'radi.
   */
  @Get('quote')
  @ApiOperation({ summary: 'Shu buyurtmada nechta ball ishlatish mumkin' })
  async quote(
    @Query('subtotal') subtotal: string,
    @Query('points') points?: string,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    if (user?.kind !== 'customer') throw new ForbiddenException('Kabinetga kiring');
    let amount: bigint;
    try {
      amount = BigInt(subtotal || '0');
    } catch {
      amount = 0n;
    }
    const plan = await this.loyalty.quote(user.sub, amount, Number(points) || 0);
    return { ...plan, amount: plan.amount.toString() };
  }
}

/** Admin uchun: qo'lda tuzatish va mijoz tarixi. */
@ApiTags('admin-loyalty')
@Controller('admin/loyalty')
export class AdminLoyaltyController {
  constructor(
    private readonly loyalty: LoyaltyService,
    private readonly expiry: LoyaltyExpiryService,
  ) {}

  /**
   * Tez orada kuyadigan ballar.
   *
   * `:customerId` yo'liDAN OLDIN turishi shart: Nest yo'llarni e'lon
   * tartibida sinaydi va «kuyish» so'zi aks holda mijoz id si deb
   * o'qilib, ParseUUIDPipe da xato bergan bo'lardi.
   */
  @Get('expiring')
  @RequirePermissions('customers.view')
  @ApiOperation({
    summary: 'Tez orada kuyadigan ballar',
    description: 'Standart — keyingi 14 kun ichida kuyadiganlar.',
  })
  expiring(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.expiry.expiringSoon({
      days: days ? Number(days) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  /** Kuygan ballar hisoboti. */
  @Get('expired')
  @RequirePermissions('customers.view')
  @ApiOperation({ summary: 'Kuygan ballar hisoboti' })
  expired(@Query('from') from?: string, @Query('to') to?: string, @Query('limit') limit?: string) {
    return this.expiry.expiredReport({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':customerId')
  @RequirePermissions('customers.view')
  @ApiOperation({ summary: 'Mijozning ball balansi va tarixi' })
  async view(@Param('customerId', ParseUUIDPipe) customerId: string) {
    const [balance, history] = await Promise.all([
      this.loyalty.balance(customerId),
      this.loyalty.history(customerId, 100),
    ]);
    return { balance, history };
  }

  @Post(':customerId/adjust')
  @RequirePermissions('customers.update')
  @Audit('loyalty', 'adjust')
  @ApiOperation({
    summary: 'Ballni qo‘lda to‘g‘rilash',
    description: 'Izoh majburiy. Balans manfiy bo‘lib qolmaydi.',
  })
  adjust(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Body() dto: AdjustDto,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    return this.loyalty.adjust({
      customerId,
      points: dto.points,
      comment: dto.comment,
      adminId: user?.sub,
    });
  }
}
