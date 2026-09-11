import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { ClickGateway } from './providers/click.gateway';
import type { ClickRequest } from './providers/click.util';

/**
 * Click webhook'lari.
 *
 * Uch qoida:
 *  1. Har doim HTTP 200 — xato `error` maydonida qaytariladi.
 *  2. Kirish ochiq (`@Public`), himoya IMZO orqali.
 *  3. DTO validatsiyasi yo'q: Click qo'shimcha maydonlar yuborishi
 *     mumkin, `forbidNonWhitelisted` esa ularni rad etib, integratsiyani
 *     buzib qo'yardi.
 */
@ApiTags('payments')
@Controller('payments/click')
export class ClickController {
  constructor(private readonly click: ClickGateway) {}

  @Public()
  @Post('prepare')
  @HttpCode(200)
  @ApiOperation({ summary: 'Click: Prepare' })
  @ApiExcludeEndpoint()
  prepare(@Body() body: ClickRequest) {
    return this.click.handle('prepare', body);
  }

  @Public()
  @Post('complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Click: Complete' })
  @ApiExcludeEndpoint()
  complete(@Body() body: ClickRequest) {
    return this.click.handle('complete', body);
  }
}
