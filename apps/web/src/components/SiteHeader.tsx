import { AliverLogo } from '@aliver/ui';
import Link from 'next/link';
import { t, type Locale } from '@/i18n/messages';
import { CartBadge } from './CartBadge';
import styles from './SiteHeader.module.css';

const NAV: Array<{
  href: string;
  key: 'nav.catalog' | 'nav.new' | 'nav.top' | 'nav.sale' | 'nav.sets';
}> = [
  { href: '/katalog', key: 'nav.catalog' },
  { href: '/katalog?collection=yangi-kelganlar', key: 'nav.new' },
  { href: '/katalog?collection=best-sellers', key: 'nav.top' },
  { href: '/katalog?onSale=true', key: 'nav.sale' },
  { href: '/katalog?collection=sovga-toplamlari', key: 'nav.sets' },
];

export function SiteHeader({ locale }: { locale: Locale }) {
  const other: Locale = locale === 'uz' ? 'ru' : 'uz';

  return (
    <header className={styles.header}>
      <div className={styles.announcement}>
        {locale === 'ru'
          ? 'Доставка по Узбекистану • 100% оригинал • Click, Payme или наличные'
          : 'O‘zbekiston bo‘ylab yetkazib berish • 100% original • Click, Payme yoki naqd to‘lov'}
      </div>

      <div className={styles.bar}>
        <div className={`alv-page ${styles.inner}`}>
          <Link href={`/${locale}`} className={styles.logo} aria-label="ALIVER.UZ">
            {/*
              Sarlavhadagi logo ANIMATSIYASIZ: u ekranda doim turadi va
              doimiy harakat o'qishga xalaqit beradi. Animatsion variant
              faqat bosh sahifaning hero qismida ishlatiladi.
            */}
            <AliverLogo height={24} animated={false} />
          </Link>

          <nav
            className={styles.desktopNav}
            aria-label={locale === 'ru' ? 'Основная навигация' : 'Asosiy navigatsiya'}
          >
            {NAV.map((item) => (
              <Link key={item.key} href={`/${locale}${item.href}`} className={styles.navLink}>
                {t(locale, item.key)}
              </Link>
            ))}
          </nav>

          <Link href={`/${locale}/qidiruv`} className={`${styles.search} alv-chip`}>
            {locale === 'ru' ? 'Поиск товаров…' : 'Mahsulot qidirish…'}
          </Link>

          <div className={styles.desktopActions}>
            <Link href={`/${other}`} className="alv-chip">
              {other.toUpperCase()}
            </Link>

            <Link href={`/${locale}/kuzatuv`} className="alv-chip">
              {locale === 'ru' ? 'Отследить' : 'Kuzatuv'}
            </Link>

            <Link href={`/${locale}/kabinet`} className="alv-chip">
              {locale === 'ru' ? 'Кабинет' : 'Kabinet'}
            </Link>

            <CartBadge locale={locale} />
          </div>

          <div className={styles.mobileActions}>
            <Link
              href={`/${locale}/qidiruv`}
              className={styles.iconLink}
              aria-label={locale === 'ru' ? 'Поиск' : 'Qidiruv'}
            >
              ⌕
            </Link>
            <CartBadge locale={locale} />
            <details className={styles.menu}>
              <summary aria-label={locale === 'ru' ? 'Открыть меню' : 'Menyuni ochish'}>
                <span aria-hidden>☰</span>
              </summary>
              <nav
                className={styles.mobileMenu}
                aria-label={locale === 'ru' ? 'Мобильная навигация' : 'Mobil navigatsiya'}
              >
                {NAV.map((item) => (
                  <Link key={item.key} href={`/${locale}${item.href}`}>
                    {t(locale, item.key)}
                  </Link>
                ))}
                <Link href={`/${locale}/kuzatuv`}>
                  {locale === 'ru' ? 'Отследить заказ' : 'Buyurtmani kuzatish'}
                </Link>
                <Link href={`/${locale}/kabinet`}>
                  {locale === 'ru' ? 'Личный кабинет' : 'Shaxsiy kabinet'}
                </Link>
                <Link href={`/${other}`}>{other.toUpperCase()}</Link>
              </nav>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
