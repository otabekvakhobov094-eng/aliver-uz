import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { RequirePermissions } from '../../common/decorators';
import { AuditService } from './audit.service';

class AuditQueryDto {
  @IsOptional() @IsString() module?: string;
  @IsOptional() @IsString() action?: string;
  @IsOptional() @IsString() adminId?: string;
  @IsOptional() @IsString() recordId?: string;
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
  @IsOptional() @IsString() page?: string;
}

/**
 * Audit log FAQAT o'qish uchun ochilgan: tahrirlash yoki o'chirish
 * endpointi ataylab yo'q.
 */
@ApiTags('admin-audit')
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'Audit log: kim, nima qildi' })
  list(@Query() query: AuditQueryDto) {
    return this.audit.list({
      module: query.module,
      action: query.action,
      adminId: query.adminId,
      recordId: query.recordId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page ? Number(query.page) : 1,
    });
  }

  @Get('facets')
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'Filtr uchun modul va harakatlar ro‘yxati' })
  facets() {
    return this.audit.facets();
  }

  @Get('record/:recordId')
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'Bitta yozuv bo‘yicha butun tarix' })
  forRecord(@Param('recordId') recordId: string) {
    return this.audit.forRecord(recordId);
  }

  @Get(':id')
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'Audit yozuvi: oldingi va keyingi holat farqi' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.audit.get(id);
  }
}
