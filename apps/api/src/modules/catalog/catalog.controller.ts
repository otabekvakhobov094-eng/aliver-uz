import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { ProductQueryDto, SearchSuggestDto } from './dto/catalog.dto';
import { CategoryService } from './category.service';
import { CollectionService } from './collection.service';
import { ProductService } from './product.service';

/**
 * Ommaviy katalog API. Autentifikatsiya talab qilinmaydi.
 * Prototipdagi "Katalog", "Mahsulot", "Qidiruv" va "Kategoriyalar" ekranlari
 * shu endpointlar bilan ishlaydi.
 */
@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly categories: CategoryService,
    private readonly collections: CollectionService,
    private readonly products: ProductService,
  ) {}

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Kategoriyalar daraxti (3 daraja)' })
  categoryTree() {
    return this.categories.tree();
  }

  @Public()
  @Get('categories/:slug')
  category(@Param('slug') slug: string) {
    return this.categories.bySlug(slug);
  }

  @Public()
  @Get('collections')
  collectionList() {
    return this.collections.list();
  }

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Katalog: filtr, saralash, sahifalash' })
  list(@Query() query: ProductQueryDto) {
    return this.products.publicList(query);
  }

  @Public()
  @Get('products/:slug')
  @ApiOperation({ summary: 'Mahsulot sahifasi' })
  detail(@Param('slug') slug: string) {
    return this.products.publicDetail(slug);
  }

  @Public()
  @Get('search/suggest')
  @ApiOperation({
    summary: 'Avtoto‘ldirish',
    description: 'Kirill va lotin yozuvi bir xil natija beradi ("шампун" = "shampun").',
  })
  suggest(@Query() dto: SearchSuggestDto) {
    return this.products.suggest(dto.q, dto.limit);
  }
}
