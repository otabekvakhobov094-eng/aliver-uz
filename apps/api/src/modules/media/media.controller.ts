import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit, RequirePermissions } from '../../common/decorators';
import { MAX_UPLOAD_BYTES } from './image-variants';
import { MediaService } from './media.service';

interface UploadedFileType {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@ApiTags('admin-media')
@Controller('admin/media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('products/:productId')
  @RequirePermissions('products.update')
  @Audit('products', 'add_image')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Mahsulotga rasm yuklash',
    description:
      'Yuklashda 4 o‘lcham (320/640/1024/1600), WebP va AVIF yaratiladi. Alt matn majburiy.',
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async uploadProductImage(
    @Param('productId', ParseUUIDPipe) productId: string,
    @UploadedFile() file: UploadedFileType | undefined,
    @Body() body: { altUz?: string; altRu?: string; kind?: string; variantId?: string },
  ) {
    if (!file) throw new BadRequestException('Fayl yuborilmadi');
    if (!body.altUz || !body.altRu) {
      throw new BadRequestException(
        'Alt matn ikkala tilda majburiy — bu SEO va erishuvchanlik uchun kerak',
      );
    }

    const image = await this.media.upload(file, `products/${productId}`);
    return this.media.attachToProduct({
      productId,
      variantId: body.variantId ?? null,
      kind: body.kind,
      image,
      altUz: body.altUz,
      altRu: body.altRu,
    });
  }

  @Put('products/:productId/reorder')
  @RequirePermissions('products.update')
  @Audit('products', 'reorder_images')
  reorder(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: { imageIds: string[] },
  ) {
    return this.media.reorder(productId, body.imageIds ?? []);
  }

  @Put('products/:productId/main/:imageId')
  @RequirePermissions('products.update')
  @Audit('products', 'set_main_image')
  setMain(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.media.setMain(productId, imageId);
  }

  @Delete('products/:productId/:imageId')
  @RequirePermissions('products.update')
  @Audit('products', 'remove_image')
  remove(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.media.remove(productId, imageId);
  }
}
