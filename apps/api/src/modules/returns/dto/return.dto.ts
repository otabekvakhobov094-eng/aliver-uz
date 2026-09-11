import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

const REASONS = ['WRONG_ITEM', 'NOT_SUITABLE', 'DAMAGED', 'QUALITY', 'OTHER'];

export class ReturnLineDto {
  @ApiProperty() @IsUUID() orderItemId!: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateReturnDto {
  @ApiProperty() @IsUUID() orderId!: string;

  @ApiPropertyOptional({ description: 'Mehmon uchun: buyurtmadagi telefon' })
  @IsOptional()
  @IsString()
  @Length(9, 20)
  phone?: string;

  @ApiProperty({ enum: REASONS })
  @IsIn(REASONS)
  reasonCode!: 'WRONG_ITEM' | 'NOT_SUITABLE' | 'DAMAGED' | 'QUALITY' | 'OTHER';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  comment?: string;

  @ApiProperty({ type: [ReturnLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ReturnLineDto)
  items!: ReturnLineDto[];

  @ApiPropertyOptional({ description: 'Qadoq ochilganmi' })
  @IsOptional()
  @IsBoolean()
  opened?: boolean;
}

export class ReturnConditionDto {
  @ApiProperty() @IsUUID() returnItemId!: string;

  @ApiProperty({ enum: ['RESELLABLE', 'DAMAGED', 'OPENED'] })
  @IsIn(['RESELLABLE', 'DAMAGED', 'OPENED'])
  condition!: 'RESELLABLE' | 'DAMAGED' | 'OPENED';
}

export class ChangeReturnStatusDto {
  @ApiProperty({
    enum: ['APPROVED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED', 'REFUNDED', 'CANCELLED'],
  })
  @IsIn(['APPROVED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED', 'REFUNDED', 'CANCELLED'])
  status!: 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'REFUNDED' | 'CANCELLED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  comment?: string;

  @ApiPropertyOptional({
    type: [ReturnConditionDto],
    description: 'RECEIVED uchun: pozitsiyalar qanday holatda kelgani',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnConditionDto)
  conditions?: ReturnConditionDto[];
}

export class AdminReturnQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}
