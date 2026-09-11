import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthPrincipal, CurrentUser, Public } from '../../common/decorators';
import { CartService } from '../cart/cart.service';
import { OrderService } from './order.service';
import { CreateOrderDto, TrackOrderDto } from './dto/order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderOtpDto } from './dto/order-otp.dto';

const CART_COOKIE = 'cart_token';

/**
 * Ommaviy buyurtma endpointlari.
 *
 * Checkout mehmon uchun ham ishlaydi (TZ 33): mijoz ro'yxatdan o'tmasa
 * ham buyurtma bera oladi, telefon esa naqd to'lovda SMS bilan
 * tasdiqlanadi.
 */
@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrderService,
    private readonly cart: CartService,
  ) {}

  private cartToken(req: Request): string | undefined {
    return (req as Request & { cookies?: Record<string, string> }).cookies?.[CART_COOKIE];
  }

  private ip(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0)
      return forwarded.split(',')[0]!.trim();
    return req.ip;
  }

  @Public()
  @Post()
  // Bitta IP dan soatiga 10 ta buyurtma — bot bilan savdo qilishning oldini
  // oladi (ekspertiza B-15). Haqiqiy mijozga bu chegara sezilmaydi.
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @ApiOperation({
    summary: 'Savatdan buyurtma yaratish',
    description:
      'Narx, chegirma, QQS va IKPU buyurtmaga NUSXA qilinadi. Ombor rezervi ' +
      'buyurtma bilan bitta tranzaksiyada bajariladi; qoldiq yetmasa 409 qaytadi. ' +
      '`idempotencyKey` bir xil bo‘lsa yangi buyurtma yaratilmaydi.',
  })
  async create(
    @Body() dto: CreateOrderDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    const customerId = user?.kind === 'customer' ? user.sub : undefined;
    const cart = await this.cart.getOrCreate(this.cartToken(req), customerId);

    const order = await this.orders.createFromCart({
      cartId: cart.id,
      dto,
      customerId,
      ip: this.ip(req),
    });

    // Savat bo'shatilgani uchun cookie ni ham tozalaymiz: keyingi tashrifda
    // yangi savat ochiladi.
    res.clearCookie(CART_COOKIE, { path: '/' });
    return order;
  }

  @Public()
  @Post('otp')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({
    summary: 'Naqd to‘lov uchun tasdiqlash kodini yuborish',
    description: 'Bu kod bilan tizimga kirib bo‘lmaydi — u faqat buyurtmani tasdiqlash uchun.',
  })
  requestOtp(@Body() dto: OrderOtpDto, @Req() req: Request) {
    return this.orders.requestOrderOtp(dto.phone, this.ip(req), req.headers['user-agent']);
  }

  @Public()
  @Post('track')
  @ApiOperation({
    summary: 'Buyurtmani raqam va telefon orqali kuzatish',
    description: 'So‘rovlar soni IP va telefon bo‘yicha cheklangan.',
  })
  track(@Body() dto: TrackOrderDto, @Req() req: Request) {
    return this.orders.track(dto.number, dto.phone, this.ip(req));
  }

  @Public()
  @Get(':id/public')
  @ApiOperation({
    summary: 'Buyurtma sahifasi (rahmat sahifasi uchun)',
    description: 'Telefon raqami maskalangan holda qaytadi.',
  })
  publicView(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.publicView(id);
  }

  @Get('my')
  @ApiOperation({ summary: 'Mening buyurtmalarim' })
  my(@CurrentUser() user?: AuthPrincipal) {
    if (user?.kind !== 'customer') throw new UnauthorizedException('Kabinetga kiring');
    return this.orders.myOrders(user.sub);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Buyurtmani bekor qilish',
    description: 'Faqat tasdiqlanmagan buyurtma saytdan bekor qilinadi.',
  })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    if (user?.kind !== 'customer') throw new UnauthorizedException('Kabinetga kiring');
    return this.orders.cancelByCustomer(id, user.sub, dto.comment);
  }
}
