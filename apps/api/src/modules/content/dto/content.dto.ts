import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpsertPageDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @IsString() @MaxLength(160) titleUz!: string;
  @IsString() @MaxLength(160) titleRu!: string;
  @IsOptional() @IsString() bodyUz?: string;
  @IsOptional() @IsString() bodyRu?: string;
  @IsOptional() @IsString() @MaxLength(70) seoTitleUz?: string;
  @IsOptional() @IsString() @MaxLength(70) seoTitleRu?: string;
  @IsOptional() @IsString() @MaxLength(170) seoDescUz?: string;
  @IsOptional() @IsString() @MaxLength(170) seoDescRu?: string;
  @IsOptional() @IsString() @MaxLength(40) version?: string;
  @IsBoolean() isPublished!: boolean;
}

export class UpsertBlogPostDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @IsString() @MaxLength(180) titleUz!: string;
  @IsString() @MaxLength(180) titleRu!: string;
  @IsOptional() @IsString() @MaxLength(320) excerptUz?: string;
  @IsOptional() @IsString() @MaxLength(320) excerptRu?: string;
  @IsOptional() @IsString() bodyUz?: string;
  @IsOptional() @IsString() bodyRu?: string;
  @IsOptional() @IsUrl({ require_tld: false }) coverUrl?: string;
  @IsOptional() @IsString() @MaxLength(100) author?: string;
  @IsBoolean() isPublished!: boolean;
  @IsOptional() @IsDateString() publishedAt?: string;
}

export class UpsertBannerDto {
  @IsIn(['HERO', 'CATEGORY', 'PROMO', 'POPUP', 'MOBILE']) placement!: string;
  @IsOptional() @IsString() @MaxLength(180) titleUz?: string;
  @IsOptional() @IsString() @MaxLength(180) titleRu?: string;
  @IsOptional() @IsString() @MaxLength(320) subtitleUz?: string;
  @IsOptional() @IsString() @MaxLength(320) subtitleRu?: string;
  @IsOptional() @IsUrl({ require_tld: false }) imageUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false }) imageMobileUrl?: string;
  @IsOptional() @IsUrl({ require_tld: false }) videoUrl?: string;
  @IsOptional() @IsString() @MaxLength(80) ctaLabelUz?: string;
  @IsOptional() @IsString() @MaxLength(80) ctaLabelRu?: string;
  @IsOptional() @IsString() @MaxLength(500) ctaUrl?: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(10_000) sortOrder!: number;
  @IsBoolean() isActive!: boolean;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
}

export class UpsertFaqDto {
  @IsOptional() @IsString() @MaxLength(80) category?: string;
  @IsString() @MaxLength(300) questionUz!: string;
  @IsString() @MaxLength(300) questionRu!: string;
  @IsString() answerUz!: string;
  @IsString() answerRu!: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(10_000) sortOrder!: number;
  @IsBoolean() isActive!: boolean;
}

export class UpsertRedirectDto {
  @Matches(/^\/(?!\/).*/) fromPath!: string;
  @Matches(/^\/(?!\/).*/) toPath!: string;
  @Type(() => Number) @IsIn([301, 302, 307, 308]) code!: number;
  @IsBoolean() isActive!: boolean;
}
