import { normalizeSearch } from './search.util';

/**
 * Slug yaratish. TZ 95: avtomatik yaratiladi, admin qo'lda tahrirlashi mumkin,
 * dublikat ruxsat etilmaydi.
 *
 * Kirill nomdan ham to'g'ri slug chiqadi: "Крем для лица" -> "krem-dlya-litsa".
 */
export function slugify(input: string, maxLength = 80): string {
  const base = normalizeSearch(input)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (base.length <= maxLength) return base;
  // So'z o'rtasidan kesmaymiz
  const cut = base.slice(0, maxLength);
  const lastDash = cut.lastIndexOf('-');
  return lastDash > maxLength * 0.6 ? cut.slice(0, lastDash) : cut;
}

/**
 * Band bo'lgan sluglar orasidan bo'shini topadi: `krem`, `krem-2`, `krem-3`...
 * `taken` — bazadan olingan mavjud sluglar to'plami.
 */
export function uniqueSlug(desired: string, taken: Set<string>, maxLength = 80): string {
  const base = slugify(desired, maxLength) || 'mahsulot';
  if (!taken.has(base)) return base;

  for (let i = 2; i < 1000; i++) {
    const suffix = `-${i}`;
    const candidate = base.slice(0, maxLength - suffix.length) + suffix;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, maxLength - 14)}-${Date.now().toString(36)}`;
}

/**
 * Soft delete paytida slugni bo'shatish (ekspertiza B-6).
 *
 * Prisma da qisman unikal indeks yo'q, shuning uchun o'chirilgan yozuvning
 * slugiga suffiks qo'shamiz — shunda o'sha slug yana ishlatilishi mumkin.
 * Migratsiyada bundan tashqari `WHERE "deletedAt" IS NULL` bo'yicha
 * qisman unikal indeks ham qo'shiladi.
 */
export function archivedSlug(slug: string, at: Date = new Date()): string {
  return `${slug}--deleted-${at.getTime().toString(36)}`;
}

export function isArchivedSlug(slug: string): boolean {
  return /--deleted-[a-z0-9]+$/.test(slug);
}
