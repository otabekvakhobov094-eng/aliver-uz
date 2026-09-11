import { Module } from '@nestjs/common';
import { FiscalController } from './fiscal.controller';
import { FiscalService } from './fiscal.service';
import { FiscalScheduler } from './fiscal.scheduler';
import { OfdProvider } from './ofd.provider';

/**
 * Fiskal cheklar. To'lov moduli bunga bog'liq, teskarisi emas —
 * shuning uchun bu yerda aylanma bog'liqlik yo'q.
 */
@Module({
  controllers: [FiscalController],
  providers: [FiscalService, FiscalScheduler, OfdProvider],
  exports: [FiscalService],
})
export class FiscalModule {}
