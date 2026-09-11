import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthPrincipal, CurrentUser, Public } from '../../common/decorators';
import { normalizePhone } from '../../common/phone';
import { ReturnService } from './return.service';
import { CreateReturnDto } from './dto/return.dto';
import { REASON_LABEL } from './return-policy';
import { RETURN_STATUS_LABEL } from './return-state';

/**
 * Mijoz uchun qaytarish endpointlari.
 *
 * Mehmon ham qaytara oladi: buyurtmadagi telefon bilan tasdiqlanadi.
 * Aks holda ro'yxatdan o'tmagan mijoz tovarni qaytarolmay qolardi.
 */
@ApiTags('returns')
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returns: ReturnService) {}

  @Public()
  @Get('reasons')
  @ApiOperation({ summary: 'Qaytarish sabablari va holat nomlari' })
  reasons() {
    return {
      reasons: Object.entries(REASON_LABEL).map(([code, label]) => ({ code, ...label })),
      statuses: Object.entries(RETURN_STATUS_LABEL).map(([code, label]) => ({ code, ...label })),
    };
  }

  @Public()
  @Get('eligibility/:orderId')
  @ApiOperation({
    summary: 'Buyurtmani qaytarish mumkinmi',
    description:
      'Tugma ko‘rsatilishidan OLDIN so‘raladi: sabab tushunarli bo‘lsin va ' +
      'bosilgach 400 chiqmasin.',
  })
  eligibility(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Query('phone') phone?: string,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    return this.returns.eligibility(
      orderId,
      user?.kind === 'customer' ? user.sub : undefined,
      phone ? normalizePhone(phone) : undefined,
    );
  }

  @Public()
  @Post()
  @Throttle({ default: { ttl: 3_600_000, limit: 10 } })
  @ApiOperation({ summary: 'Qaytarish so‘rovini yuborish' })
  create(@Body() dto: CreateReturnDto, @CurrentUser() user?: AuthPrincipal) {
    const customerId = user?.kind === 'customer' ? user.sub : undefined;
    return this.returns.create({
      orderId: dto.orderId,
      customerId,
      phone: dto.phone ? normalizePhone(dto.phone) : undefined,
      reasonCode: dto.reasonCode,
      comment: dto.comment,
      items: dto.items,
      opened: dto.opened,
    });
  }

  @Get('my')
  @ApiOperation({ summary: 'Mening qaytarishlarim' })
  my(@CurrentUser() user?: AuthPrincipal) {
    if (user?.kind !== 'customer') throw new UnauthorizedException('Kabinetga kiring');
    return this.returns.myReturns(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Qaytarish tafsiloti' })
  async get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthPrincipal) {
    if (user?.kind !== 'customer') throw new UnauthorizedException('Kabinetga kiring');
    const mine = await this.returns.myReturns(user.sub);
    if (!mine.some((r) => r.id === id)) {
      throw new UnauthorizedException('Bu qaytarish sizga tegishli emas');
    }
    return this.returns.view(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'So‘rovni bekor qilish' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: AuthPrincipal) {
    if (user?.kind !== 'customer') throw new UnauthorizedException('Kabinetga kiring');
    return this.returns.cancelByCustomer(id, user.sub);
  }
}
