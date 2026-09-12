import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ShopifyPreviewDto {
  @Matches(/^https:\/\/[^\s]+$/i, { message: 'Manzil https:// bilan boshlanishi kerak' })
  @MaxLength(300)
  sourceUrl!: string;

  /**
   * 1 USD necha so'm.
   *
   * Ko'rib chiqishda ham majburiy: narxsiz ro'yxatning ma'nosi yo'q —
   * admin aynan narxlar to'g'ri chiqqanini tekshirish uchun qaraydi.
   */
  @Type(() => Number)
  @IsInt({ message: 'Kurs butun son bo‘lishi kerak' })
  @Min(1)
  @Max(1_000_000)
  usdToUzs!: number;
}

export class ShopifyImportDto extends ShopifyPreviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  warehouseCode?: string;

  /** Yagona IKPU kod. Har bir mahsulotga alohida kod keyin beriladi. */
  @IsOptional()
  @Matches(/^\d{17}$/, { message: 'IKPU 17 xonali bo‘lishi kerak' })
  defaultIkpu?: string;
}
