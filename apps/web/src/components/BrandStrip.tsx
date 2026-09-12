import Link from 'next/link';
import type { Locale } from '@/i18n/messages';
import styles from './BrandStrip.module.css';

/**
 * Sotuvdagi brendlar qatori.
 *
 * ALIVER dan tashqari ELAIMEI, SEFUDUN va ONE1X ham sotiladi, lekin
 * saytda bu hech qayerda ko'rinmasdi: bu brendlarni bilgan mijoz
 * ularni bizda topa olmasdi.
 *
 * Ro'yxat KODDA EMAS — u katalogdagi haqiqiy brendlardan keladi.
 * Shuning uchun yangi brend import qilingan zahoti bu yerda paydo
 * bo'ladi va uni qo'shishni hech kim unutmaydi.
 *
 * Logotip fayllari yo'q, shuning uchun brend nomi TIPOGRAFIK tarzda
 * yoziladi — ingichka, keng oraliqli bosh harflar. Taxminiy logotip
 * chizishdan ko'ra bu halolroq va brend qoidalarini ham buzmaydi.
 * `logoUrl` to'ldirilgan bo'lsa, o'rniga rasm chiqadi.
 */
export interface BrandItem {
  slug: string;
  name: string;
  count: number;
  logoUrl?: string | null;
}

export function BrandStrip({ brands, locale }: { brands: BrandItem[]; locale: Locale }) {
  // Bitta brend — qator emas. Tanlov bo'lmasa ko'rsatishning ma'nosi yo'q.
  if (brands.length < 2) return null;

  return (
    <div className={styles.strip}>
      <p className={styles.title}>
        {locale === 'ru' ? 'Бренды в продаже' : 'Sotuvdagi brendlar'}
      </p>
      <ul className={styles.list}>
        {brands.map((b) => (
          <li key={b.slug}>
            <Link href={`/${locale}/katalog?brand=${encodeURIComponent(b.slug)}`} className={styles.item}>
              {b.logoUrl ? (
                <img src={b.logoUrl} alt={b.name} height={24} loading="lazy" decoding="async" />
              ) : (
                <span className={styles.word}>{b.name}</span>
              )}
              <span className={styles.count}>
                {b.count} {locale === 'ru' ? 'товаров' : 'ta mahsulot'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
