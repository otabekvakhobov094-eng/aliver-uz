import Link from 'next/link';
import type { Locale } from '@/i18n/messages';
import styles from './SiteFooter.module.css';

/**
 * Footer havolalari. `/sahifa/delivery` va `/sahifa/payment` o'rniga
 * bitta `/yetkazish` sahifasi qo'yildi: mijoz "qachon keladi va qanday
 * to'layman" degan savolni doim birga so'raydi, ikkita sahifa esa uni
 * ikki marta qidirishga majbur qilardi.
 */
const LINKS: Array<[string, string, string]> = [
  ['/biz-haqimizda', 'Biz haqimizda', 'О нас'],
  ['/yetkazish', 'Yetkazish va to‘lov', 'Доставка и оплата'],
  ['/aloqa', 'Aloqa', 'Контакты'],
  ['/kategoriyalar', 'Kategoriyalar', 'Категории'],
  ['/savollar', 'Ko‘p so‘raladigan savollar', 'Частые вопросы'],
  ['/sahifa/return-policy', 'Qaytarish shartlari', 'Условия возврата'],
  ['/sahifa/public-offer', 'Ommaviy oferta', 'Публичная оферта'],
  ['/sahifa/privacy-policy', 'Maxfiylik siyosati', 'Политика конфиденциальности'],
  ['/blog', 'Blog', 'Блог'],
  ['/hamkorlik', 'Hamkorlik', 'Партнёрство'],
];

export function SiteFooter({ locale }: { locale: Locale }) {
  return (
    <footer className={styles.footer}>
      <div className="alv-page">
        <div className={styles.logo}>
          ALIVER<span style={{ color: 'var(--alv-brand)' }}>.UZ</span>
        </div>
        <p className={styles.description}>
          {locale === 'ru'
            ? 'Официальный интернет-магазин продукции ALIVER в Узбекистане. Вся продукция оригинальная и сертифицированная.'
            : 'ALIVER mahsulotlarining O‘zbekistondagi rasmiy onlayn do‘koni. Barcha mahsulotlar original va sertifikatlangan.'}
        </p>

        <nav className={styles.links}>
          {LINKS.map(([href, uz, ru]) => (
            <Link key={href} href={`/${locale}${href}`}>
              {locale === 'ru' ? ru : uz}
            </Link>
          ))}
        </nav>

        <div className={styles.line} />
        <div className={styles.copyright}>
          © 2026 ALIVER.UZ •{' '}
          {locale === 'ru' ? 'Официальный магазин в Узбекистане' : 'O‘zbekistondagi rasmiy do‘kon'}
        </div>
      </div>
    </footer>
  );
}
