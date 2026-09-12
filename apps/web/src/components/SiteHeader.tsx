import { AliverLogo } from '@aliver/ui';
import Link from 'next/link';
import type { Locale } from '@/i18n/messages';
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
 *   3. Bo'limlar to'liq — aliver.com dagi hammasi. Ilgari beshtasi bor
 *      edi, ya'ni «Yordam», «Blog», «Hamkorlik» kabi butun bo'limlarga
 *      sarlavhadan yo'l yo'q edi.
 */

interface NavChild {
  href: string;
  uz: string;
  ru: string;
  /** Qisqa izoh — mega-menyuda bo'lim nima ekanini aytadi. */
  noteUz?: string;
  noteRu?: string;
}

interface NavItem {
  href: string;
  uz: string;
  ru: string;
  children?: NavChild[];
}

const NAV: NavItem[] = [
  { href: '', uz: 'Bosh sahifa', ru: 'Главная' },
  {
    href: '/katalog',
    uz: 'Do‘kon',
    ru: 'Магазин',
    children: [
      {
        href: '/katalog?category=soch-parvarishi',
        uz: 'Soch parvarishi',
        ru: 'Уход за волосами',
        noteUz: 'Moylar, shampunlar, niqoblar',
        noteRu: 'Масла, шампуни, маски',
      },
      {
        href: '/katalog?category=yuz-parvarishi',
        uz: 'Yuz parvarishi',
        ru: 'Уход за лицом',
        noteUz: 'Tozalash, namlash, serumlar',
        noteRu: 'Очищение, увлажнение, сыворотки',
      },
      {
        href: '/katalog?category=tana-parvarishi',
        uz: 'Tana parvarishi',
        ru: 'Уход за телом',
        noteUz: 'Kremlar, skrablar, moylar',
        noteRu: 'Кремы, скрабы, масла',
      },
      {
        href: '/katalog?category=tirnoq',
        uz: 'Tirnoq',
        ru: 'Ногти',
        noteUz: 'Gel laklar va vositalar',
        noteRu: 'Гель-лаки и средства',
      },
      {
        href: '/tanlagich',
        uz: 'Vosita tanlagich',
        ru: 'Подбор средства',
        noteUz: 'Uchta savol — tayyor tanlov',
        noteRu: 'Три вопроса — готовая подборка',
      },
      {
        href: '/kategoriyalar',
        uz: 'Barcha kategoriyalar',
        ru: 'Все категории',
      },
    ],
  },
  { href: '/katalog?collection=yangi-kelganlar', uz: 'Yangi kelganlar', ru: 'Новинки' },
  { href: '/katalog?collection=best-sellers', uz: 'TOP sotuvlar', ru: 'Хиты продаж' },
  { href: '/katalog?collection=sovga-toplamlari', uz: 'Sovg‘a to‘plamlari', ru: 'Наборы в подарок' },
  {
    href: '/savollar',
    uz: 'Yordam',
    ru: 'Помощь',
    children: [
      {
        href: '/yetkazish',
        uz: 'Yetkazib berish',
        ru: 'Доставка',
        noteUz: 'Muddat va narxlar',
        noteRu: 'Сроки и цены',
      },
      {
        href: '/kuzatuv',
        uz: 'Buyurtmani kuzatish',
        ru: 'Отследить заказ',
        noteUz: 'Raqam va telefon bo‘yicha',
        noteRu: 'По номеру и телефону',
      },
      {
        href: '/savollar',
        uz: 'Savol-javob',
        ru: 'Вопросы и ответы',
      },
      {
        href: '/aloqa',
        uz: 'Aloqa',
        ru: 'Контакты',
      },
    ],
  },
  { href: '/blog', uz: 'Blog', ru: 'Блог' },
  {
    href: '/biz-haqimizda',
    uz: 'ALIVER haqida',
    ru: 'Об ALIVER',
    children: [
      {
        href: '/biz-haqimizda',
        uz: 'Brend haqida',
        ru: 'О бренде',
      },
      {
        href: '/sahifa/originallik',
        uz: 'Originallik kafolati',
        ru: 'Гарантия оригинала',
        noteUz: 'Rasmiy diler — chek bilan',
        noteRu: 'Официальный дилер — с чеком',
      },
      {
        href: '/kabinet/ballar',
        uz: 'Bonus ballar',
        ru: 'Бонусные баллы',
        noteUz: 'Har 1 000 so‘mga 1 ball',
        noteRu: 'За каждые 1 000 сум — 1 балл',
      },
    ],
  },
  { href: '/hamkorlik', uz: 'Hamkor bo‘ling', ru: 'Стать партнёром' },
];

function label(item: { uz: string; ru: string }, locale: Locale) {
  return locale === 'ru' ? item.ru : item.uz;
}

export function SiteHeader({ locale }: { locale: Locale }) {
  const other: Locale = locale === 'uz' ? 'ru' : 'uz';

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
            <Link href={`/${other}`} className={styles.lang} aria-label={other.toUpperCase()}>
              {other.toUpperCase()}
            </Link>
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
                {NAV.map((item) => (
                  <div key={item.uz} className={styles.mobileGroup}>
                    <Link href={`/${locale}${item.href}`}>{label(item, locale)}</Link>
                    {item.children?.map((c) => (
                      <Link key={c.uz} href={`/${locale}${c.href}`} className={styles.mobileChild}>
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
          {NAV.map((item) => (
            <div key={item.uz} className={styles.navItem}>
              <Link href={`/${locale}${item.href}`} className={styles.navLink}>
                {label(item, locale)}
                {item.children ? (
                  <span className={styles.caret} aria-hidden>
                    ▾
                  </span>
                ) : null}
              </Link>

              {item.children ? (
                <div className={styles.panel} role="group">
                  <div className={styles.panelInner}>
                    {item.children.map((c) => (
                      <Link key={c.uz} href={`/${locale}${c.href}`} className={styles.panelLink}>
                        <strong>{label(c, locale)}</strong>
                        {c.noteUz ? (
                          <span>{locale === 'ru' ? c.noteRu : c.noteUz}</span>
                        ) : null}
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
