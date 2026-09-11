import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthPrincipal, CurrentUser } from '../../common/decorators';
import { AccountService } from './account.service';
import { ConsentDto, UpdateProfileDto, UpsertAddressDto, WishlistDto } from './dto/account.dto';

/**
 * Mijoz kabineti.
 *
 * Hamma endpointlar kirishni talab qiladi (`@Public` yo'q): global
 * `JwtAuthGuard` ularni himoyalaydi, bu yerda esa qo'shimcha tekshiruv
 * — token ADMIN niki bo'lmasligi kerak.
 */
@ApiTags('account')
@Controller('account')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  private me(user?: AuthPrincipal): string {
    if (user?.kind !== 'customer') throw new UnauthorizedException('Kabinetga kiring');
    return user.sub;
  }

  private ip(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0)
      return forwarded.split(',')[0]!.trim();
    return req.ip;
  }

  /* -------------------------------- Profil -------------------------------- */

  @Get()
  @ApiOperation({ summary: 'Profil va ko‘rsatkichlar' })
  profile(@CurrentUser() user?: AuthPrincipal) {
    return this.account.profile(this.me(user));
  }

  @Put()
  @ApiOperation({
    summary: 'Profilni tahrirlash',
    description: 'Telefon raqami bu yerda o‘zgarmaydi — u asosiy identifikator.',
  })
  updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user?: AuthPrincipal) {
    return this.account.updateProfile(this.me(user), dto);
  }

  /* ------------------------------- Manzillar ------------------------------- */

  @Get('addresses')
  @ApiOperation({ summary: 'Saqlangan manzillar' })
  addresses(@CurrentUser() user?: AuthPrincipal) {
    return this.account.addresses(this.me(user));
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Manzil qo‘shish yoki tahrirlash' })
  upsertAddress(@Body() dto: UpsertAddressDto, @CurrentUser() user?: AuthPrincipal) {
    return this.account.upsertAddress(this.me(user), dto);
  }

  @Put('addresses/:id/default')
  @ApiOperation({ summary: 'Standart manzil qilish' })
  setDefault(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthPrincipal) {
    return this.account.setDefaultAddress(this.me(user), id);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Manzilni o‘chirish' })
  deleteAddress(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthPrincipal) {
    return this.account.deleteAddress(this.me(user), id);
  }

  /* ------------------------------- Sevimlilar ------------------------------- */

  @Get('wishlist')
  @ApiOperation({ summary: 'Sevimlilar ro‘yxati' })
  wishlist(@CurrentUser() user?: AuthPrincipal) {
    return this.account.wishlist(this.me(user));
  }

  @Post('wishlist')
  @ApiOperation({ summary: 'Sevimlilarga qo‘shish' })
  addWishlist(@Body() dto: WishlistDto, @CurrentUser() user?: AuthPrincipal) {
    return this.account.addToWishlist(this.me(user), dto.variantId);
  }

  @Delete('wishlist/:variantId')
  @ApiOperation({ summary: 'Sevimlilardan olib tashlash' })
  removeWishlist(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    return this.account.removeFromWishlist(this.me(user), variantId);
  }

  /* -------------------------------- Rozilik -------------------------------- */

  @Get('consents')
  @ApiOperation({
    summary: 'Roziliklar: joriy holat va tarix',
    description: 'Tarix o‘chirilmaydi — nizoda "qachon rozilik berilgan" savoliga javob kerak.',
  })
  consents(@CurrentUser() user?: AuthPrincipal) {
    return this.account.consents(this.me(user));
  }

  @Post('consents')
  @ApiOperation({ summary: 'Rozilikni berish yoki bekor qilish' })
  setConsent(@Body() dto: ConsentDto, @Req() req: Request, @CurrentUser() user?: AuthPrincipal) {
    return this.account.setConsent(this.me(user), dto, this.ip(req), req.headers['user-agent']);
  }

  /* ------------------------------ Ma'lumotlar ------------------------------ */

  @Get('export')
  @ApiOperation({
    summary: 'Mening ma’lumotlarim (JSON)',
    description: 'Shaxsiy ma’lumotlar to‘g‘risidagi qonun talabi.',
  })
  exportData(@CurrentUser() user?: AuthPrincipal) {
    return this.account.exportData(this.me(user));
  }
}
