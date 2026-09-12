import type { Locale } from '@/i18n/messages';
import styles from './PaymentBadges.module.css';

/**
 * Footerdagi to'lov va yetkazib berish belgilari.
 *
 * NEGA LOGOTIP EMAS, NOM.
 *
 * Click, Payme, Uzum, EMU, BTS — bularning har biri himoyalangan brend
 * belgisi. Ularni taxminan chizish ikki tomondan noto'g'ri: birinchidan
 * natija rasmiysiga o'xshamaydi, ikkinchidan har bir to'lov tizimining
 * brend qoidalari logotipni faqat O'ZI bergan fayl bilan ishlatishni
 * talab qiladi. Shartnoma imzolanganda brend-kit ham beriladi.
 *
 * Shuning uchun blok shunday qurilgan: rasmiy fayl BO'LSA logotip
 * chiqadi, bo'lmasa toza nom belgisi chiqadi. Fayllarni
 * `apps/web/public/logos/` ga quyidagi nomlar bilan tashlash kifoya —
 * kodga tegish shart emas:
 *
 *   click.svg  payme.svg  uzum.svg  emu.svg  express-post.svg  bts.svg
 *
 * `LOGO_FILES` ro'yxatiga nomni qo'shish — logotipni yoqish degani.
 */

/** Rasmiy fayli `public/logos/` ga qo'yilgan belgilar. */
const LOGO_FILES = new Set<string>([
  // Fayl qo'shilgach, uning slugini shu yerga yozing. Masalan:
  // 'click', 'payme', 'uzum',
]);

interface Badge {
  slug: string;
  name: string;
}

const PAYMENTS: Badge[] = [
  { slug: 'click', name: 'Click' },
  { slug: 'payme', name: 'Payme' },
  { slug: 'uzum', name: 'Uzum' },
];

const CARRIERS: Badge[] = [
  { slug: 'emu', name: 'EMU' },
  { slug: 'express-post', name: 'Express Pochta' },
  { slug: 'bts', name: 'BTS' },
];

function Row({ title, items }: { title: string; items: Badge[] }) {
  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>{title}</div>
      <ul className={styles.list}>
        {items.map((b) => (
          <li key={b.slug} className={styles.badge}>
            {LOGO_FILES.has(b.slug) ? (
              // Balandlik qat'iy, kenglik erkin: har xil nisbatdagi
              // logotiplar bir qatorda bir xil «og'irlikda» ko'rinadi.
              <img src={`/logos/${b.slug}.svg`} alt={b.name} height={20} loading="lazy" />
            ) : (
              <span>{b.name}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PaymentBadges({ locale }: { locale: Locale }) {
  const ru = locale === 'ru';
  return (
    <div className={styles.wrap}>
      <Row title={ru ? 'Оплата' : 'To‘lov'} items={PAYMENTS} />
      <Row title={ru ? 'Доставка' : 'Yetkazib berish'} items={CARRIERS} />
    </div>
  );
}
