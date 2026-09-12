import { Global, Module } from '@nestjs/common';
import { MetaCapiService } from './meta-capi.service';

/**
 * Global: hodisalar buyurtma, to'lov va B2B modullaridan yuboriladi,
 * va har biriga import qo'shib yurish shart emas.
 */
@Global()
@Module({
  providers: [MetaCapiService],
  exports: [MetaCapiService],
})
export class MarketingModule {}
