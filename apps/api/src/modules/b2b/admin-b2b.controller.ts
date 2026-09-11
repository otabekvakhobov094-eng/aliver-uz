import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { B2BLeadStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Audit, RequirePermissions } from '../../common/decorators';
import { B2bService } from './b2b.service';

class UpdateLeadDto {
  @IsOptional() @IsEnum(B2BLeadStatus) status?: B2BLeadStatus;
  @IsOptional() @IsUUID() assignedTo?: string;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}

@Controller('admin/b2b')
export class AdminB2bController {
  constructor(private readonly service: B2bService) {}
  @Get() @RequirePermissions('b2b.view') list(@Query('status') status?: B2BLeadStatus) { return this.service.list(status); }
  @Put(':id') @RequirePermissions('b2b.update') @Audit('b2b', 'update') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLeadDto) { return this.service.update(id, dto); }
}
