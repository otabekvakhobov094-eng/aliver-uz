import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Audit, AuthPrincipal, CurrentUser, Public, RequirePermissions } from '../../common/decorators';
import { GiftCardExpiryService } from './giftcard-expiry.service';
import { GiftCardService } from './giftcard.service';

class CheckDto {
  @IsString()
  @Length(4, 40)
  code!: string;
}

/**
 * ALOHIDA SINF, kesishma tip (`CheckDto & { … }`) EMAS.
 *
 * Kesishma tip uchun TypeScript `design:paramtypes` ga `Object` deb
 * yozadi, `ValidationPipe` esa `Object` tipli tanani UMUMAN
 * tekshirmaydi. Ya'ni `@IsString()` va `@Length()` bu yo'lda hech
 * qachon ishlamagan: `{"code": 12345}` yuborilsa, kod satr emas son
 * bo'lib o'tib ketardi va `normaliseCode` da `trim is not a function`
 * xatosi bilan 500 qaytarardi. Notanish maydonlar ham kesib
 * tashlanmasdi.
 */
class QuoteDto extends CheckDto {
  @IsOptional()
  @IsString()
  orderTotal?: string;
}

class IssueDto {
  /** So'mda kiritiladi, bazada tiyinda. */
  @Type(() => Number)
  @IsInt()
  @Min(10_000, { message: 'Eng kam nominal 10 000 so‘m' })
  amountSum!: number;

  @IsOptional() @IsString() @Length(1, 120) recipientName?: string;
  @IsOptional() @IsString() @Length(6, 30) recipientPhone?: string;
  @IsOptional() @IsString() @Length(1, 500) message?: string;
  @IsOptional() @IsString() expiresAt?: string;
}

class CancelDto {
  @IsString()
  @Length(3, 300)
  reason!: string;
}

/** Mijoz uchun: kodni tekshirish. */
@ApiTags('gift-cards')
@Controller('gift-cards')
export class GiftCardController {
  constructor(private readonly cards: GiftCardService) {}

  /**
   * Kodni tekshirish.
   *
   * Chastota qattiq cheklangan: kod 16 belgili bo'lsa ham, cheklovsiz
   * uni saralab topishga urinish mumkin. Bu pul bilan bog'liq.
   */
  @Public()
  @Post('check')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Sertifikat kodini tekshirish' })
  check(@Body() dto: CheckDto) {
    return this.cards.check(dto.code);
  }

  @Public()
  @Post('quote')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Shu buyurtmada qancha qoplanadi' })
  quote(@Body() dto: QuoteDto) {
    let total: bigint;
    try {
      total = BigInt(dto.orderTotal ?? '0');
    } catch {
      total = 0n;
    }
    return this.cards.quote(dto.code, total);
  }
}

/** Admin uchun: chiqarish, ro'yxat, bekor qilish. */
@ApiTags('admin-gift-cards')
@Controller('admin/gift-cards')
export class AdminGiftCardController {
  constructor(
    private readonly cards: GiftCardService,
    private readonly expiry: GiftCardExpiryService,
  ) {}

  /**
   * Tez orada muddati tugaydigan sertifikatlar.
   *
   * Bu pul: muddati tugagan kartada qolgan summa mijoz uchun yo'qoladi,
   * va u buni faqat kassada bilardi. Admin ro'yxatni oldindan ko'rib,
   * kerak bo'lsa muddatni uzaytirishi mumkin.
   */
  @Get('expiring')
  @RequirePermissions('discounts.view')
  @ApiOperation({ summary: 'Muddati tugayotgan sertifikatlar' })
  expiring(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.expiry.expiringSoon({
      days: days ? Number(days) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get()
  @RequirePermissions('discounts.view')
  @ApiOperation({
    summary: 'Sertifikatlar ro‘yxati',
    description: 'Ochiq kod ko‘rsatilmaydi — faqat oxirgi 4 belgi.',
  })
  list(@Query('tail') tail?: string, @Query('page') page?: string) {
    return this.cards.list({ tail, page: Number(page) || 1 });
  }

  @Post()
  @RequirePermissions('discounts.create')
  @Audit('gift_cards', 'issue')
  @ApiOperation({
    summary: 'Sertifikat chiqarish',
    description: 'Ochiq kod FAQAT shu javobda qaytariladi va boshqa ko‘rsatilmaydi.',
  })
  issue(@Body() dto: IssueDto, @CurrentUser() user?: AuthPrincipal) {
    return this.cards.issue({
      // So'mdan tiyinga o'girish bitta joyda.
      initialAmount: BigInt(dto.amountSum) * 100n,
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      message: dto.message,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      purchasedById: undefined,
    });
  }

  @Post(':id/cancel')
  @RequirePermissions('discounts.update')
  @Audit('gift_cards', 'cancel')
  @ApiOperation({ summary: 'Sertifikatni bekor qilish' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelDto,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    return this.cards.cancel(id, dto.reason, user?.sub);
  }
}
