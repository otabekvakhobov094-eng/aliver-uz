import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class StartPaymentDto {
  @ApiProperty({ description: 'Buyurtma id' })
  @IsUUID()
  orderId!: string;

  @ApiPropertyOptional({
    enum: ['CLICK', 'PAYME'],
    description: 'Ko‘rsatilmasa buyurtmadagi usul ishlatiladi',
  })
  @IsOptional()
  @IsIn(['CLICK', 'PAYME'])
  provider?: 'CLICK' | 'PAYME';
}

export class MockConfirmDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty({ enum: ['PAID', 'CANCELLED'] })
  @IsIn(['PAID', 'CANCELLED'])
  outcome!: 'PAID' | 'CANCELLED';
}

export class RefundDto {
  @ApiProperty({ description: 'Qaytariladigan summa, TIYINDA' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ example: 'Mijoz qaytarib berdi, tovar joyida' })
  @IsString()
  @Length(3, 500)
  reason!: string;
}

export class MarkCashPaidDto {
  @ApiPropertyOptional({ example: 'Kuryer topshirdi, kvitansiya №44' })
  @IsOptional()
  @IsString()
  @Length(1, 300)
  comment?: string;
}

export class AdminPaymentQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() provider?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() dateTo?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

export class ReconcileQueryDto {
  @ApiProperty({ example: '2026-09-01' })
  @IsString()
  dateFrom!: string;

  @ApiProperty({ example: '2026-09-10' })
  @IsString()
  dateTo!: string;

  @ApiPropertyOptional({ enum: ['CLICK', 'PAYME', 'CASH_ON_DELIVERY'] })
  @IsOptional()
  @IsIn(['CLICK', 'PAYME', 'CASH_ON_DELIVERY'])
  provider?: 'CLICK' | 'PAYME' | 'CASH_ON_DELIVERY';
}
