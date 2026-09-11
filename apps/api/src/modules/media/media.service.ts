import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { PrismaService } from '../../prisma/prisma.service';
import { IMAGE_QUALITY, assertUploadAllowed, buildSrcSet, planVariants } from './image-variants';

export interface UploadedImage {
  url: string;
  urlWebp: string;
  urlAvif: string;
  srcSetWebp: string;
  width: number;
  height: number;
}

/**
 * Rasm yuklash va qayta ishlash.
 *
 * Diqqat (ekspertiza A-3): bu bucket mahsulot rasmlari uchun. Shaxsiy
 * ma'lumot (masalan, mijoz yuklagan sharh fotosi) saqlanadigan joy
 * alohida hal qilinadi — hosting hududi bo'yicha yurist xulosasi kerak.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.bucket = config.get<string>('S3_BUCKET', 'aliver-media');
    this.publicUrl = config.get<string>('S3_PUBLIC_URL', 'http://localhost:9000/aliver-media');
    this.s3 = new S3Client({
      region: config.get<string>('S3_REGION', 'us-east-1'),
      endpoint: config.get<string>('S3_ENDPOINT'),
      forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') !== 'false',
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY', ''),
        secretAccessKey: config.get<string>('S3_SECRET_KEY', ''),
      },
    });
  }

  /**
   * Faylni qayta ishlaydi va S3 ga yuklaydi.
   * Qaytadi: asosiy URL lar va srcset — frontend shularni ishlatadi.
   */
  async upload(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    prefix = 'products',
  ): Promise<UploadedImage> {
    try {
      assertUploadAllowed(file);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    const image = sharp(file.buffer, { failOn: 'none' }).rotate(); // EXIF burchagini to'g'rilaydi
    const meta = await image.metadata();
    const sourceWidth = meta.width ?? 0;
    if (sourceWidth === 0) throw new BadRequestException('Rasmni o‘qib bo‘lmadi');

    const plan = planVariants({ prefix, originalName: file.originalname, sourceWidth });

    // Original — o'zgartirilmagan holda (keyinchalik qayta yaratish uchun)
    await this.put(plan.original, file.buffer, file.mimetype);

    for (const variant of plan.variants) {
      const pipeline = sharp(file.buffer, { failOn: 'none' })
        .rotate()
        .resize({ width: variant.width, withoutEnlargement: true });

      const buffer =
        variant.format === 'webp'
          ? await pipeline.webp({ quality: IMAGE_QUALITY }).toBuffer()
          : await pipeline.avif({ quality: IMAGE_QUALITY }).toBuffer();

      await this.put(variant.key, buffer, `image/${variant.format}`);
    }

    const largest = plan.widths[plan.widths.length - 1]!;
    return {
      url: `${this.publicUrl}/${plan.original}`,
      urlWebp: `${this.publicUrl}/${plan.dir}/${largest}.webp`,
      urlAvif: `${this.publicUrl}/${plan.dir}/${largest}.avif`,
      srcSetWebp: buildSrcSet(this.publicUrl, plan.dir, 'webp', plan.widths),
      width: Math.min(sourceWidth, largest),
      height: meta.height ?? 0,
    };
  }

  /** Yuklangan rasmni mahsulotga biriktiradi. Alt matn majburiy (erishuvchanlik). */
  async attachToProduct(params: {
    productId: string;
    variantId?: string | null;
    kind?: string;
    image: UploadedImage;
    altUz: string;
    altRu: string;
  }) {
    const last = await this.prisma.productImage.findFirst({
      where: { productId: params.productId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return this.prisma.productImage.create({
      data: {
        productId: params.productId,
        variantId: params.variantId ?? null,
        kind: (params.kind ?? 'GALLERY') as never,
        url: params.image.url,
        urlWebp: params.image.urlWebp,
        urlAvif: params.image.urlAvif,
        width: params.image.width,
        height: params.image.height,
        altUz: params.altUz,
        altRu: params.altRu,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }

  /** Rasmlar tartibini o'zgartirish (admin panelda drag-and-drop). */
  async reorder(productId: string, imageIds: string[]) {
    await this.prisma.$transaction(
      imageIds.map((id, index) =>
        this.prisma.productImage.updateMany({
          where: { id, productId },
          data: { sortOrder: index },
        }),
      ),
    );
    return { count: imageIds.length };
  }

  /** Asosiy rasmni belgilash: bittasi MAIN, qolganlari GALLERY. */
  async setMain(productId: string, imageId: string) {
    await this.prisma.$transaction([
      this.prisma.productImage.updateMany({
        where: { productId, kind: 'MAIN' },
        data: { kind: 'GALLERY' },
      }),
      this.prisma.productImage.updateMany({
        where: { id: imageId, productId },
        data: { kind: 'MAIN', sortOrder: -1 },
      }),
    ]);
    return { ok: true };
  }

  async remove(productId: string, imageId: string) {
    // S3 dagi obyekt qoldiriladi: eski buyurtma hujjatlarida havola bo'lishi mumkin.
    // Yetim fayllarni tozalash alohida fon vazifasi bilan hal qilinadi.
    return this.prisma.productImage.deleteMany({ where: { id: imageId, productId } });
  }

  private async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    this.logger.debug(`Yuklandi: ${key} (${(body.length / 1024).toFixed(0)} KB)`);
  }
}
