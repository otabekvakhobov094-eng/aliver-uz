/**
 * Rasm variantlari.
 *
 * TZ 13: "Image compression avtomatik bajarilsin, WebP / AVIF".
 * Ekspertiza D-toifasida bu talab o'lchanadigan qilib aniqlashtirilgan:
 * yuklashda 4 o'lcham, WebP va AVIF, sifat 78, original saqlanadi.
 *
 * Qayta ishlash YUKLASH paytida bajariladi, so'rov paytida emas —
 * aks holda birinchi tashrifchi kutadi va CDN keshi to'lmaydi.
 */

export const IMAGE_WIDTHS = [320, 640, 1024, 1600] as const;
export const IMAGE_QUALITY = 78;

export type ImageFormat = 'webp' | 'avif' | 'jpeg';

export interface VariantSpec {
  width: number;
  format: ImageFormat;
  key: string;
}

export interface VariantPlan {
  dir: string;
  original: string;
  variants: VariantSpec[];
  widths: number[];
}

/** Fayl nomidan kengaytmani olib tashlaydi va xavfsiz asos qoldiradi. */
export function baseName(originalName: string): string {
  const withoutExt = originalName.replace(/\.[a-z0-9]+$/i, '');
  return (
    withoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'image'
  );
}

/**
 * Yuklanadigan fayllar ro'yxati. Asl rasm ham saqlanadi:
 * keyinchalik boshqa o'lchamlar kerak bo'lsa qayta yaratish uchun.
 */
export function planVariants(params: {
  prefix: string;
  originalName: string;
  sourceWidth: number;
  stamp?: string;
}): VariantPlan {
  const name = baseName(params.originalName);
  const stamp = params.stamp ?? Date.now().toString(36);
  const dir = `${params.prefix}/${stamp}-${name}`;

  const fitting = IMAGE_WIDTHS.filter((w) => w <= params.sourceWidth);
  // Manba juda kichik bo'lsa ham hech bo'lmasa bitta variant chiqadi.
  const widths: number[] =
    fitting.length > 0 ? [...fitting] : [Math.min(params.sourceWidth, IMAGE_WIDTHS[0])];

  const variants: VariantSpec[] = [];
  for (const width of widths) {
    variants.push({ width, format: 'webp', key: `${dir}/${width}.webp` });
    variants.push({ width, format: 'avif', key: `${dir}/${width}.avif` });
  }

  return { dir, original: `${dir}/original`, variants, widths };
}

/** Kartochkada va mahsulot sahifasida ishlatiladigan srcset satri. */
export function buildSrcSet(
  publicUrl: string,
  dir: string,
  format: ImageFormat,
  widths: number[],
): string {
  return widths.map((w) => `${publicUrl}/${dir}/${w}.${format} ${w}w`).join(', ');
}

export const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

export function assertUploadAllowed(file: { mimetype: string; size: number }): void {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    throw new Error(`Rasm formati qo‘llab-quvvatlanmaydi: ${file.mimetype}`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Fayl juda katta: ${(file.size / 1024 / 1024).toFixed(1)} MB (limit 15 MB)`);
  }
}
