import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { MENU_LOCATIONS, MENU_TARGET_TYPES } from '../menu-target';

export class UpsertMenuItemDto {
  @IsIn(MENU_LOCATIONS as unknown as string[]) location!: string;
  @IsOptional() @IsUUID() parentId?: string | null;

  @IsString() @MaxLength(60) labelUz!: string;
  @IsString() @MaxLength(60) labelRu!: string;
  @IsOptional() @IsString() @MaxLength(120) noteUz?: string | null;
  @IsOptional() @IsString() @MaxLength(120) noteRu?: string | null;

  @IsIn(MENU_TARGET_TYPES as unknown as string[]) targetType!: string;
  @IsOptional() @IsString() @MaxLength(300) targetValue?: string | null;

  @IsOptional() @IsInt() @Min(0) @Max(999) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isHighlighted?: boolean;
}

export class ReorderMenuDto {
  /** `id` lar yangi tartibda. Bitta ota ichidagi bandlar. */
  @IsUUID('4', { each: true }) ids!: string[];
}
