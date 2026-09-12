import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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

  /**
   * Ochiq endpoint, shuning uchun chastota cheklanadi.
   *
   * Ilgari bu yerda cheklov YO'Q edi va faqat umumiy chegara
   * (daqiqasiga 120) ishlardi: bitta IP dan kuniga 170 mingga yaqin
   * ariza yozish mumkin edi. Loyihadagi boshqa ochiq yozuvlarning
   * hammasida (murojaat formasi, buyurtma, qaytarish, sharh) qattiq
   * cheklov bor — bu bittasi tushib qolgan edi.
   */
  @Post('leads')
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  create(@Body() dto: CreateB2bLeadDto) {
    return this.service.create(dto);
  }
}
