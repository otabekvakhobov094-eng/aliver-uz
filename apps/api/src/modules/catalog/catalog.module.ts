import { Module } from '@nestjs/common';
import { AdminCatalogController } from './admin-catalog.controller';
import { CatalogController } from './catalog.controller';
import { CategoryService } from './category.service';
import { CollectionService } from './collection.service';
import { ProductService } from './product.service';

@Module({
  controllers: [CatalogController, AdminCatalogController],
  providers: [CategoryService, CollectionService, ProductService],
  exports: [CategoryService, CollectionService, ProductService],
})
export class CatalogModule {}
