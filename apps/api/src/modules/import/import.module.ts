import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ImportController } from './import.controller';
import { ProductImportService } from './product-import.service';
import { ShopifyImportService } from './shopify-import.service';

@Module({
  imports: [CatalogModule],
  controllers: [ImportController],
  providers: [ProductImportService, ShopifyImportService],
})
export class ImportModule {}
