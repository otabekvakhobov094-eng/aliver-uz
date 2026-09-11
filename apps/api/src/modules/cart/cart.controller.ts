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
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthPrincipal, CurrentUser, Public } from '../../common/decorators';
import { CartService } from './cart.service';
import { AddToCartDto, ApplyCouponDto, UpdateCartItemDto } from './dto/cart.dto';

const CART_COOKIE = 'cart_token';
const COOKIE_MAX_AGE = 30 * 24 * 3600 * 1000;

/**
 * Savat mehmon uchun ham ishlaydi: `cart_token` cookie orqali.
 * Mijoz kirganda mehmon savati uning savatiga birlashtiriladi.
 */
@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  private token(req: Request): string | undefined {
    return (req as Request & { cookies?: Record<string, string> }).cookies?.[CART_COOKIE];
  }

  private async resolve(req: Request, res: Response, user?: AuthPrincipal) {
    const customerId = user?.kind === 'customer' ? user.sub : undefined;
    const cart = await this.cart.getOrCreate(this.token(req), customerId);

    if (this.token(req) !== cart.token) {
      res.cookie(CART_COOKIE, cart.token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
      });
    }
    return cart;
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Savat tarkibi va summalar' })
  async view(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    const cart = await this.resolve(req, res, user);
    return this.cart.view(cart.id, user?.phone);
  }

  @Public()
  @Post('items')
  @ApiOperation({ summary: 'Savatga qo‘shish' })
  async add(
    @Body() dto: AddToCartDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    const cart = await this.resolve(req, res, user);
    await this.cart.addItem(cart.id, dto.variantId, dto.quantity ?? 1);
    return this.cart.view(cart.id, user?.phone);
  }

  @Public()
  @Put('items/:itemId')
  async update(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    const cart = await this.resolve(req, res, user);
    await this.cart.updateItem(cart.id, itemId, dto.quantity);
    return this.cart.view(cart.id, user?.phone);
  }

  @Public()
  @Delete('items/:itemId')
  async remove(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    const cart = await this.resolve(req, res, user);
    await this.cart.removeItem(cart.id, itemId);
    return this.cart.view(cart.id, user?.phone);
  }

  @Public()
  @Post('coupon')
  @ApiOperation({
    summary: 'Promo-kod qo‘llash',
    description: 'Kod yaroqsiz bo‘lsa savat buzilmaydi — sabab `couponError` da qaytadi.',
  })
  async applyCoupon(
    @Body() dto: ApplyCouponDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    const cart = await this.resolve(req, res, user);
    await this.cart.setCoupon(cart.id, dto.code);
    return this.cart.view(cart.id, user?.phone);
  }

  @Public()
  @Delete('coupon')
  async removeCoupon(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    const cart = await this.resolve(req, res, user);
    await this.cart.setCoupon(cart.id, null);
    return this.cart.view(cart.id, user?.phone);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Kirgandan keyin mehmon savatini birlashtirish' })
  async merge(@Req() req: Request, @CurrentUser() user?: AuthPrincipal) {
    const token = this.token(req);
    if (token && user?.kind === 'customer') {
      await this.cart.mergeGuestCart(token, user.sub);
    }
    const cart = await this.cart.getOrCreate(undefined, user?.sub);
    return this.cart.view(cart.id, user?.phone);
  }
}
