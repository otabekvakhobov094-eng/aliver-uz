import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { ImportController } from './import.controller';
import { ProductImportService } from './product-import.service';

@Module({
  imports: [CatalogModule],
  controllers: [ImportController],
  providers: [ProductImportService],
})
export class ImportModule {}
