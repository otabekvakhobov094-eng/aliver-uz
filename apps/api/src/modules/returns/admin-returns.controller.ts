import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Audit, AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';
import { ReturnService } from './return.service';
import { AdminReturnQueryDto, ChangeReturnStatusDto } from './dto/return.dto';
import { RETURN_TRANSITIONS } from './return-state';

type AuditRequest = Request & { auditBefore?: unknown; auditRecordId?: string };

@ApiTags('admin-returns')
@Controller('admin/returns')
export class AdminReturnsController {
  constructor(private readonly returns: ReturnService) {}

  @Get()
  @RequirePermissions('returns.view')
  @ApiOperation({ summary: 'Qaytarishlar ro‘yxati' })
  list(@Query() query: AdminReturnQueryDto) {
    return this.returns.list(query);
  }

  @Get('transitions')
  @RequirePermissions('returns.view')
  @ApiOperation({ summary: 'Ruxsat etilgan holat o‘tishlari' })
  transitions() {
    return RETURN_TRANSITIONS;
  }

  @Get(':id')
  @RequirePermissions('returns.view')
  @ApiOperation({ summary: 'Qaytarish kartochkasi' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.returns.view(id);
  }

  @Post(':id/status')
  @RequirePermissions('returns.update')
  @Audit('returns', 'status')
  @ApiOperation({
    summary: 'Holatni o‘zgartirish',
    description:
      'RECEIVED — pozitsiyalar holatiga qarab omborga qaytaradi. ' +
      'REFUNDED — pulni qaytaradi va qaytarish chekini navbatga qo‘yadi.',
  })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeReturnStatusDto,
    @Req() req: AuditRequest,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    req.auditRecordId = id;
    const before = await this.returns.view(id);
    req.auditBefore = { status: before.status, refundAmount: before.refundAmount };

    return this.returns.changeStatus({
      returnId: id,
      to: dto.status,
      comment: dto.comment,
      conditions: dto.conditions,
      adminId: user?.kind === 'admin' ? user.sub : undefined,
    });
  }
}
