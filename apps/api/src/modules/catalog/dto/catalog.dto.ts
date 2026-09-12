import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/* ============================ Umumiy ============================ */

export enum SortOption {
  POPULAR = 'popular',
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  RATING = 'rating',
  BEST_SELLING = 'best_selling',
}

const toBool = () => Transform(({ value }) => value === true || value === 'true' || value === '1');

const toStringArray = () =>
  Transform(({ value }): string[] =>
    Array.isArray(value)
      ? (value as string[])
      : typeof value === 'string' && value.length > 0
        ? value.split(',')
        : [],
  );

/** TZ 24–25: filtr va saralash. Barcha qiymatlar URL da saqlanadi (TZ 102). */
export class ProductQueryDto {
  @ApiPropertyOptional({ example: 'soch-parvarishi', description: 'Kategoriya slug' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'best-sellers' })
  @IsOptional()
  @IsString()
  collection?: string;

  @ApiPropertyOptional({ example: 'shampun' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  q?: string;

  @ApiPropertyOptional({ description: 'Eng past narx, so‘mda' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Eng yuqori narx, so‘mda' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Faqat sotuvda borlar' })
  @IsOptional()
  @toBool()
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ description: 'Faqat aksiyadagilar' })
  @IsOptional()
  @toBool()
  @IsBoolean()
  onSale?: boolean;

  @ApiPropertyOptional({ example: 4, description: 'Minimal reyting' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ example: ['30 ml', '60 ml'], description: 'Variant hajmi' })
  @IsOptional()
  @toStringArray()
  @IsArray()
  @ArrayMaxSize(20)
  volume?: string[];

  @ApiPropertyOptional({ example: ['Rose Nude', 'Coral'], description: 'Variant rangi' })
  @IsOptional()
  @toStringArray()
  @IsArray()
  @ArrayMaxSize(30)
  color?: string[];

  @ApiPropertyOptional({ example: ['soch-tokilishi'], description: 'Teglar (muammo)' })
  @IsOptional()
  @toStringArray()
  @IsArray()
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({ enum: SortOption, default: SortOption.POPULAR })
  @IsOptional()
  @IsEnum(SortOption)
  sort?: SortOption;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 24, maximum: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  perPage?: number;
}

export class SearchSuggestDto {
  @ApiProperty({ example: 'шампун' })
  @IsString()
  @Length(1, 120)
  q!: string;

  @ApiPropertyOptional({ default: 8, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

/* ============================ Kategoriya ============================ */

export class UpsertCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ description: 'Bo‘sh bo‘lsa nomdan avtomatik yasaladi' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug faqat lotin harflari, raqam va tiredan iborat' })
  @Length(1, 80)
  slug?: string;

  @ApiProperty({ example: 'Soch parvarishi' })
  @IsString()
  @Length(1, 120)
  nameUz!: string;

  @ApiProperty({ example: 'Уход за волосами' })
  @IsString()
  @Length(1, 120)
  nameRu!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() descUz?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descRu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() iconUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seoTitleUz?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seoTitleRu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seoDescUz?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seoDescRu?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @toBool()
  @IsBoolean()
  isActive?: boolean;
}

/* ============================== Brend ============================== */

export class UpsertBrandDto {
  @ApiPropertyOptional({ description: 'Bo‘sh bo‘lsa nomdan avtomatik yasaladi' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug faqat lotin harflari, raqam va tiredan iborat' })
  @Length(1, 80)
  slug?: string;

  @ApiProperty({ example: 'ALIVER' })
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiPropertyOptional({ example: 'https://cdn.aliver.uz/brands/aliver.svg' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  logoUrl?: string;
}

/* ============================ Kolleksiya ============================ */

export class UpsertCollectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @Length(1, 80)
  slug?: string;

  @ApiProperty() @IsString() @Length(1, 120) nameUz!: string;
  @ApiProperty() @IsString() @Length(1, 120) nameRu!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descUz?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descRu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @toBool()
  @IsBoolean()
  isActive?: boolean;
}

/* ============================ Variant ============================ */

export class UpsertVariantDto {
  @ApiPropertyOptional({ description: 'Mavjud variantni yangilash uchun' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 'ALV-RSM-060' })
  @IsString()
  @Length(1, 60)
  sku!: string;

  @ApiPropertyOptional({ example: '4780012345678' })
  @IsOptional()
  @IsString()
  @Length(6, 40)
  barcode?: string;

  @ApiPropertyOptional({ example: { size: '60 ml' }, description: 'Variant o‘lchamlari' })
  @IsOptional()
  options?: Record<string, string>;

  @ApiProperty({ example: 189000, description: 'Narx SO‘MDA. Bazada tiyinga o‘giriladi.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 249000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  oldPrice?: number;

  @ApiPropertyOptional({ example: 120000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() saleStartsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() saleEndsAt?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) weightGrams?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) volumeMl?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @toBool()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

/* ============================ Mahsulot ============================ */

/**
 * Bitta "asosiy tarkib" — TZ-3, 2.3.
 *
 * Nomi va vazifasi ALOHIDA maydon, bitta matn emas. Sababi: mijoz INCI
 * ro'yxatini baholay olmaydi, unga «Pantenol — teri to'sig'ini
 * mustahkamlaydi» kerak. Ikkita maydon bo'lgani uchun frontend nomni
 * qalin, vazifasini oddiy shrift bilan chiza oladi va keyinchalik
 * tarkib bo'yicha filtr qilish ham mumkin bo'ladi.
 */
export class KeyIngredientDto {
  @ApiProperty({ example: 'Pantenol' })
  @IsString()
  @Length(1, 120)
  nameUz!: string;

  @ApiProperty({ example: 'Пантенол' })
  @IsString()
  @Length(1, 120)
  nameRu!: string;

  @ApiProperty({ example: 'teri to‘sig‘ini mustahkamlaydi' })
  @IsString()
  @Length(1, 240)
  roleUz!: string;

  @ApiProperty({ example: 'укрепляет барьер кожи' })
  @IsString()
  @Length(1, 240)
  roleRu!: string;
}

export class UpsertProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @Length(1, 100)
  slug?: string;

  @ApiProperty() @IsString() @Length(2, 200) nameUz!: string;
  @ApiProperty() @IsString() @Length(2, 200) nameRu!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nameEn?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID() brandId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() shortDescUz?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() shortDescRu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descUz?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descRu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() benefitsUz?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() benefitsRu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() howToUseUz?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() howToUseRu?: string;

  /**
   * Tarkib va ogohlantirish kosmetika uchun majburiy: bu marketing matni emas,
   * mas'uliyat masalasi (ekspertiza A-4).
   */
  @ApiProperty({ description: 'Tarkib (INCI) — majburiy' })
  @IsString()
  @Length(2, 4000)
  ingredientsUz!: string;

  @ApiProperty({ description: 'Состав (INCI) — majburiy' })
  @IsString()
  @Length(2, 4000)
  ingredientsRu!: string;

  /**
   * Uchtadan ko'p bo'lsa "asosiy" degani ma'nosini yo'qotadi va oddiy
   * ro'yxatga aylanadi — shuning uchun cheklov DTO darajasida, frontendda
   * `.slice()` bilan yashirib qo'yishga tashlab qo'yilmagan.
   */
  @ApiPropertyOptional({ type: [KeyIngredientDto], maxItems: 3 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3, { message: 'Ko‘pi bilan 3 ta asosiy tarkib kiritiladi' })
  @ValidateNested({ each: true })
  @Type(() => KeyIngredientDto)
  keyIngredients?: KeyIngredientDto[];

  /** Isbot yoki tadqiqot natijasi: «100% quruqlik kamayganini tasdiqladi». */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 300)
  claimUz?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 300)
  claimRu?: string;

  @ApiProperty({ description: 'Ogohlantirishlar — majburiy' })
  @IsString()
  @Length(2, 2000)
  warningsUz!: string;

  @ApiProperty({ description: 'Предупреждения — majburiy' })
  @IsString()
  @Length(2, 2000)
  warningsRu!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() countryOfOrigin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shelfLifeMonths?: number;

  /** Fiskal chek uchun majburiy — ekspertiza A-1. */
  @ApiProperty({ example: '03302001001000000', description: 'IKPU (MXIK) kodi — majburiy' })
  @IsString()
  @Matches(/^\d{6,20}$/, { message: 'IKPU kodi 6–20 raqamdan iborat bo‘lishi kerak' })
  ikpuCode!: string;

  @ApiPropertyOptional({ example: 12, description: 'QQS stavkasi, foizda' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  vatRate?: number;

  @ApiPropertyOptional({ example: '1', description: 'O‘lchov birligi kodi' })
  @IsOptional()
  @IsString()
  unitCode?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'HIDDEN', 'OUT_OF_STOCK', 'ARCHIVED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @toBool()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsString() seoTitleUz?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seoTitleRu?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seoDescUz?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() seoDescRu?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  collectionIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagSlugs?: string[];

  @ApiProperty({ type: [UpsertVariantDto], description: 'Kamida bitta variant' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertVariantDto)
  variants!: UpsertVariantDto[];
}

export class AdminProductQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 30, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number;
}
