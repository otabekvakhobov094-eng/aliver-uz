import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

/** Summalar admin paneldan TIYINDA keladi — front so'mni tiyinga o'giradi. */
const TIYIN = { description: 'Summa TIYINDA (1 so‘m = 100 tiyin)' };

export class UpsertRegionDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() id?: string;

  @ApiProperty({ example: 'toshkent-shahri' })
  @IsString()
  @Length(2, 60)
  @Matches(/^[a-z0-9-]+$/, { message: 'Kod faqat lotin harflari, raqam va tire' })
  code!: string;

  @ApiProperty() @IsString() @Length(2, 100) nameUz!: string;
  @ApiProperty() @IsString() @Length(2, 100) nameRu!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertDistrictDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() id?: string;
  @ApiProperty() @IsUUID() regionId!: string;

  @ApiProperty({ example: 'chilonzor' })
  @IsString()
  @Length(2, 60)
  @Matches(/^[a-z0-9-]+$/)
  code!: string;

  @ApiProperty() @IsString() @Length(2, 100) nameUz!: string;
  @ApiProperty() @IsString() @Length(2, 100) nameRu!: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpsertDeliveryMethodDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() id?: string;

  @ApiProperty({ example: 'COURIER' })
  @IsString()
  @Length(2, 40)
  @Matches(/^[A-Z0-9_]+$/, { message: 'Kod katta lotin harflari va pastki chiziq' })
  code!: string;

  @ApiProperty({ enum: ['COURIER', 'EXPRESS', 'PICKUP'] })
  @IsIn(['COURIER', 'EXPRESS', 'PICKUP'])
  type!: 'COURIER' | 'EXPRESS' | 'PICKUP';

  @ApiProperty() @IsString() @Length(2, 100) nameUz!: string;
  @ApiProperty() @IsString() @Length(2, 100) nameRu!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 300) descUz?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 300) descRu?: string;

  @ApiProperty(TIYIN)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  basePrice!: number;

  @ApiPropertyOptional({ ...TIYIN, description: 'Bepul yetkazish chegarasi. Bo‘sh — bepul yo‘q.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeThreshold?: number | null;

  @ApiPropertyOptional(TIYIN)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderAmount?: number | null;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimatedDaysMin!: number;

  @ApiProperty({ default: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimatedDaysMax!: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number;
}

export class MethodRegionRowDto {
  @ApiProperty() @IsUUID() regionId!: string;

  @ApiProperty(TIYIN)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional(TIYIN)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeThreshold?: number | null;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) daysMin?: number | null;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) daysMax?: number | null;

  @ApiProperty({ description: 'Shu hududda usul mavjudmi' })
  @IsBoolean()
  isAvailable!: boolean;
}

export class SaveMethodRegionsDto {
  @ApiProperty({ type: [MethodRegionRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MethodRegionRowDto)
  rows!: MethodRegionRowDto[];
}
