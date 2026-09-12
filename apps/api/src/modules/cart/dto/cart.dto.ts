import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty()
  @IsUUID()
  variantId!: string;

  @ApiPropertyOptional({ default: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  quantity?: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ minimum: 0, maximum: 50, description: '0 — pozitsiyani o‘chiradi' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  quantity!: number;
}

export class ApplyCouponDto {
  @ApiProperty({ example: 'ALIVER10' })
  @IsString()
  @Length(2, 40)
  code!: string;
}


/**
 * Namunani tanlash.
 *
 * `variantId` bo'sh (null) bo'lsa tanlov BEKOR qilinadi — alohida
 * DELETE endpoint yasashdan ko'ra shu oddiyroq va interfeysda ham
 * «tanlovni olib tashlash» bitta so'rov bo'lib qoladi.
 */
export class ChooseSampleDto {
  @ApiPropertyOptional({ description: 'Bo‘sh bo‘lsa tanlov bekor qilinadi' })
  @IsOptional()
  @IsUUID()
  variantId?: string | null;
}
