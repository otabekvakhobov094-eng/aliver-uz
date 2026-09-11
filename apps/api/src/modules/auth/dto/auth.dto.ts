import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '+998 90 123 45 67' })
  @IsString()
  @Length(9, 20)
  phone!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+998 90 123 45 67' })
  @IsString()
  @Length(9, 20)
  phone!: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'Kod 4–6 raqamdan iborat bo‘lishi kerak' })
  code!: string;

  @ApiPropertyOptional({ example: 'Nilufar' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Abdullayeva' })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  lastName?: string;
}

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@aliver.uz' })
  @IsEmail({}, { message: 'Email noto‘g‘ri' })
  email!: string;

  @ApiProperty({ example: 'Admin12345!' })
  @IsString()
  @Length(8, 128)
  password!: string;

  @ApiPropertyOptional({ example: '123456', description: '2FA yoqilgan bo‘lsa majburiy' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  totp?: string;
}
