import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 60) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 60) lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Email noto‘g‘ri' })
  email?: string;

  @ApiPropertyOptional({ enum: ['UZ', 'RU'] })
  @IsOptional()
  @IsIn(['UZ', 'RU'])
  locale?: 'UZ' | 'RU';
}

export class UpsertAddressDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() id?: string;

  @ApiPropertyOptional({ example: 'Uy' })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  label?: string;

  @ApiProperty() @IsString() @Length(2, 80) recipient!: string;
  @ApiProperty() @IsString() @Length(9, 20) phone!: string;

  @ApiProperty() @IsUUID() regionId!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() districtId?: string;

  @ApiProperty() @IsString() @Length(5, 300) street!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 200) landmark?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class ConsentDto {
  @ApiProperty({
    enum: ['MARKETING_SMS', 'MARKETING_TELEGRAM', 'COOKIE_ANALYTICS', 'COOKIE_MARKETING'],
    description: 'Ommaviy oferta va maxfiylik siyosatidan voz kechib bo‘lmaydi',
  })
  @IsIn(['MARKETING_SMS', 'MARKETING_TELEGRAM', 'COOKIE_ANALYTICS', 'COOKIE_MARKETING'])
  type!: 'MARKETING_SMS' | 'MARKETING_TELEGRAM' | 'COOKIE_ANALYTICS' | 'COOKIE_MARKETING';

  @ApiProperty()
  @IsBoolean()
  granted!: boolean;
}

export class WishlistDto {
  @ApiProperty() @IsUUID() variantId!: string;
}
