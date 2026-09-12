import { AliverLogo } from '@aliver/ui';
import { LocaleSwitchLink } from './LocaleSwitchLink';
import Link from 'next/link';
import type { Locale } from '@/i18n/messages';
import { contentApi, type MenuNode } from '@/lib/content-api';
import { DEFAULT_HEADER_MENU } from '@/lib/default-menu';
import { CartBadge } from './CartBadge';
import styles from './SiteHeader.module.css';

/**
 * Sayt sarlavhasi — aliver.com joylashuvi, O'zbekiston uchun moslangan.
 *
 * Uchta qaror ataylab shunday:
 *
 *   1. Logotip MARKAZDA va kattaroq (44px). Brend do'konida u birinchi
 *      ko'riladigan narsa bo'lishi kerak.
 *   2. O'ng tomonda IKONKALAR, matn emas. «Savat», «Kabinet», «Kuzatuv»
 *      so'zlari o'ng ustunni kengaytirib, logotipni markazdan surardi.
 *   3. Menyu KODDA EMAS, bazada. Ilgari u shu fayldagi massiv edi va
 *      do'kon egasi o'z menyusini o'zgartira olmasdi — har bir yangi
 *      bo'lim uchun dasturchi va deploy kerak bo'lardi. Endi uni admin
 *      panelidan boshqarish mumkin, kodda esa faqat ZAXIRA qoladi:
 *      API javob bermasa, sayt sarlavhasiz qolmaydi.
 */

function label(item: MenuNode, locale: Locale) {
  return locale === 'ru' ? item.labelRu : item.labelUz;
}

function note(item: MenuNode, locale: Locale) {
  return locale === 'ru' ? item.noteRu : item.noteUz;
}

/** Ichki havolaga til prefiksi qo'yiladi, tashqisiga — yo'q. */
function hrefFor(item: MenuNode, locale: Locale) {
  return item.external ? item.href : `/${locale}${item.href}`;
}

export async function SiteHeader({ locale }: { locale: Locale }) {
  const other: Locale = locale === 'uz' ? 'ru' : 'uz';
  const fetched = await contentApi.menu('HEADER');
  const nav = fetched.length > 0 ? fetched : DEFAULT_HEADER_MENU;

  return (
    <header className={styles.header}>
      <div className={styles.announcement}>
        {locale === 'ru'
          ? 'Доставка по Узбекистану • 100% оригинал • Click, Payme, Uzum или наличные'
          : 'O‘zbekiston bo‘ylab yetkazib berish • 100% original • Click, Payme, Uzum yoki naqd'}
      </div>

      <div className={styles.bar}>
        <div className={`alv-page ${styles.inner}`}>
          <div className={styles.left}>
            <Link
              href={`/${locale}/qidiruv`}
              className="alv-icon-btn"
              aria-label={locale === 'ru' ? 'Поиск' : 'Qidiruv'}
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
                <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </Link>
          </div>

          <Link href={`/${locale}`} className={styles.logo} aria-label="ALIVER.UZ">
            <AliverLogo height={44} decorative />
          </Link>

          <div className={styles.right}>
            <LocaleSwitchLink locale={locale} other={other} className={styles.lang} />
            <Link
              href={`/${locale}/kabinet`}
              className="alv-icon-btn"
              aria-label={locale === 'ru' ? 'Личный кабинет' : 'Shaxsiy kabinet'}
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="8.5" r="3.8" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6S18.3 16.4 19.2 20"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
            <CartBadge locale={locale} />

            {/*
              Mobil menyu `details` ustiga qurilgan — JavaScript kerak
              emas, ya'ni u sahifa yuklanishidan OLDIN ham ishlaydi.
            */}
            <details className={styles.menu}>
              <summary aria-label={locale === 'ru' ? 'Меню' : 'Menyu'}>
                <span className={styles.burger} aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              </summary>
              <nav
                className={styles.mobileMenu}
                aria-label={locale === 'ru' ? 'Мобильная навигация' : 'Mobil navigatsiya'}
              >
                {nav.map((item) => (
                  <div key={item.id} className={styles.mobileGroup}>
                    <Link href={hrefFor(item, locale)}>{label(item, locale)}</Link>
                    {item.children.map((c) => (
                      <Link key={c.id} href={hrefFor(c, locale)} className={styles.mobileChild}>
                        {label(c, locale)}
                      </Link>
                    ))}
                  </div>
                ))}
                <Link href={`/${locale}/qidiruv`}>
                  {locale === 'ru' ? 'Поиск товаров' : 'Mahsulot qidirish'}
                </Link>
              </nav>
            </details>
          </div>
        </div>
      </div>

      {/*
        Navigatsiya logotip OSTIDA, markazlashgan — aliver.com dagidek.

        Ochiluvchi panellar `:hover` VA `:focus-within` bilan ochiladi.
        Faqat hover bo'lsa, klaviatura bilan ishlaydigan odam ichki
        bo'limlarga umuman yeta olmasdi — bu erishuvchanlik talabi,
        qulaylik emas.
      */}
      <div className={styles.navRow}>
        <nav
          className={`alv-page ${styles.desktopNav}`}
          aria-label={locale === 'ru' ? 'Основная навигация' : 'Asosiy navigatsiya'}
        >
          {nav.map((item) => (
            <div key={item.id} className={styles.navItem}>
              <Link
                href={hrefFor(item, locale)}
                className={`${styles.navLink}${item.highlighted ? ` ${styles.navHighlight}` : ''}`}
              >
                {label(item, locale)}
                {item.children.length > 0 ? (
                  <span className={styles.caret} aria-hidden>
                    ▾
                  </span>
                ) : null}
              </Link>

              {item.children.length > 0 ? (
                <div className={styles.panel} role="group">
                  <div className={styles.panelInner}>
                    {item.children.map((c) => (
                      <Link key={c.id} href={hrefFor(c, locale)} className={styles.panelLink}>
                        <strong>{label(c, locale)}</strong>
                        {note(c, locale) ? <span>{note(c, locale)}</span> : null}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}
