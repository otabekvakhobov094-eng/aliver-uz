import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CancelOrderDto {
  @ApiPropertyOptional({ example: 'Fikrimdan qaytdim' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  comment?: string;
}
