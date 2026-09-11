import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';
import { Audit, AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';
import { CustomerAdminService } from './customer-admin.service';
import { SEGMENT_LABEL } from './segment';

class CustomerQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() segment?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() page?: string;
}

class NoteDto {
  @IsString()
  @Length(2, 2000)
  body!: string;
}

class StatusDto {
  @IsIn(['ACTIVE', 'BLOCKED'])
  status!: 'ACTIVE' | 'BLOCKED';
}

@ApiTags('admin-customers')
@Controller('admin/customers')
export class CustomersController {
  constructor(private readonly customers: CustomerAdminService) {}

  @Get()
  @RequirePermissions('customers.view')
  @ApiOperation({ summary: 'Mijozlar ro‘yxati va segmentlar' })
  list(@Query() query: CustomerQueryDto) {
    return this.customers.list({
      q: query.q,
      segment: query.segment,
      status: query.status,
      page: query.page ? Number(query.page) : 1,
    });
  }

  @Get('segments')
  @RequirePermissions('customers.view')
  @ApiOperation({ summary: 'Segment nomlari va chegaralari' })
  segments() {
    return Object.entries(SEGMENT_LABEL).map(([code, label]) => ({ code, ...label }));
  }

  @Get('by-phone')
  @RequirePermissions('customers.view')
  @ApiOperation({
    summary: 'Telefon bo‘yicha qidiruv',
    description: 'Ro‘yxatdan o‘tmagan mijozning buyurtmalari ham topiladi.',
  })
  byPhone(@Query('phone') phone: string) {
    return this.customers.findByPhone(phone);
  }

  @Get(':id')
  @RequirePermissions('customers.view')
  @ApiOperation({ summary: 'Mijoz kartochkasi' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.get(id);
  }

  @Post(':id/notes')
  @RequirePermissions('customers.update')
  @Audit('customers', 'note')
  @ApiOperation({ summary: 'Ichki izoh qo‘shish' })
  addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: NoteDto,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    return this.customers.addNote(id, user?.sub ?? '', dto.body);
  }

  @Put(':id/status')
  @RequirePermissions('customers.update')
  @Audit('customers', 'status')
  @ApiOperation({
    summary: 'Mijozni bloklash yoki ochish',
    description: 'Bloklanganda barcha sessiyalari yopiladi. Yozuv o‘chirilmaydi.',
  })
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StatusDto) {
    return this.customers.setStatus(id, dto.status);
  }
}
