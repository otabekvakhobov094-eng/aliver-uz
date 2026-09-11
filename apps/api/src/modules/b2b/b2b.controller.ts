import { Body, Controller, Post } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { B2bService } from './b2b.service';

class CreateB2bLeadDto {
  @IsString() @MinLength(2) @MaxLength(160) company!: string;
  @IsString() @MinLength(2) @MaxLength(120) contactPerson!: string;
  @IsString() @MinLength(9) @MaxLength(30) phone!: string;
  @IsOptional() @IsString() @MaxLength(80) telegram?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) businessType?: string;
  @IsOptional() @IsString() @MaxLength(100) monthlyVolume?: string;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}

@Public()
@ApiTags('b2b')
@Controller('b2b')
export class B2bController {
  constructor(private readonly service: B2bService) {}
  @Post('leads') create(@Body() dto: CreateB2bLeadDto) { return this.service.create(dto); }
}
