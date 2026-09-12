import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: '+998 90 123 45 67' })
  @IsString()
  @Length(9, 20)
  phone!: string;

  @ApiProperty({ example: 'Nilufar' })
  @IsString()
  @Length(2, 60)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Abdullayeva' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  lastName?: string;

  @ApiProperty({ description: 'Viloyat id' })
  @IsUUID()
  regionId!: string;

  @ApiPropertyOptional({ description: 'Tuman id' })
  @IsOptional()
  @IsUUID()
  districtId?: string;

  @ApiProperty({ example: 'Amir Temur ko‘chasi 84-uy, 12-xonadon' })
  @IsString()
  @Length(5, 300)
  addressLine!: string;

  @ApiPropertyOptional({ example: 'Metro yonida' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  landmark?: string;

  @ApiProperty({ example: 'COURIER', description: 'Yetkazib berish usuli kodi' })
  @IsString()
  @Length(2, 40)
  deliveryMethodCode!: string;

  @ApiProperty({ enum: ['CLICK', 'PAYME', 'UZUM', 'CASH_ON_DELIVERY'] })
  @IsIn(['CLICK', 'PAYME', 'UZUM', 'CASH_ON_DELIVERY'])
  paymentProvider!: 'CLICK' | 'PAYME' | 'UZUM' | 'CASH_ON_DELIVERY';

  @ApiPropertyOptional({ description: 'Naqd to‘lov uchun SMS-kod (sozlamaga qarab majburiy)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4,6}$/)
  otpCode?: string;

  @ApiPropertyOptional({ example: 'Yetkazishdan oldin qo‘ng‘iroq qiling' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  comment?: string;

  @ApiProperty({ description: 'Ommaviy oferta shartlariga rozilik — majburiy' })
  @IsBoolean()
  acceptOffer!: boolean;

  /**
   * Tugmani ikki marta bosishdan himoya. Frontend har checkout uchun
   * bitta tasodifiy kalit yuboradi (ekspertiza A-7).
   */
  @ApiPropertyOptional({ description: 'Idempotentlik kaliti' })
  @IsOptional()
  @IsString()
  @Length(8, 100)
  idempotencyKey?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() utmSource?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmMedium?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmCampaign?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmContent?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() utmTerm?: string;
}

export class TrackOrderDto {
  @ApiProperty({ example: 'ALV-260910-4821' })
  @IsString()
  @Length(6, 40)
  number!: string;

  @ApiProperty({ example: '+998 90 123 45 67' })
  @IsString()
  @Length(9, 20)
  phone!: string;
}

export class ChangeOrderStatusDto {
  @ApiProperty({
    enum: [
      'NEW',
      'CONFIRMED',
      'PROCESSING',
      'PACKING',
      'READY',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'RETURN_REQUESTED',
      'RETURNED',
      'REFUNDED',
    ],
  })
  @IsString()
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  comment?: string;
}

export class AdminOrderQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 30, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number;
}

export class BulkOrderStatusDto {
  @ApiProperty({ type: [String], description: 'Buyurtma id lari (100 tagacha)' })
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  orderIds!: string[];

  @ApiProperty({ example: 'PROCESSING' })
  @IsString()
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  comment?: string;
}
