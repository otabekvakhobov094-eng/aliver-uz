import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class OrderOtpDto {
  @ApiProperty({ example: '+998 90 123 45 67' })
  @IsString()
  @Length(9, 20)
  phone!: string;
}
