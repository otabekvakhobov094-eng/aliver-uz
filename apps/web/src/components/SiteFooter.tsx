import Link from 'next/link';
import { AliverLogo } from '@aliver/ui';
import type { Locale } from '@/i18n/messages';
import { contentApi } from '@/lib/content-api';
import { DEFAULT_FOOTER_MENU } from '@/lib/default-menu';
import { PaymentBadges } from './PaymentBadges';
import styles from './SiteFooter.module.css';

/**
 * Footer havolalari ham bazadan keladi.
 *
 * Ilgari bu yerda `/sahifa/return-policy`, `/sahifa/public-offer` va
 * `/sahifa/privacy-policy` qattiq yozilgan edi. Uchalasi ham seed'da
 * NASHR QILINMAGAN holatda turadi — matnini yurist beradi. Ya'ni
 * footerda uchta havola bor edi va uchalasi ham 404 berardi, buni esa
 * hech narsa ko'rsatmasdi.
 *
 * Endi menyu serverdan keladi va server nashr qilinmagan sahifaga
 * ishora qiladigan bandni javobdan chiqarib tashlaydi: yurist matni
 * kelib, admin sahifani nashr qilgan kuni havola O'ZI paydo bo'ladi.
 */
export async function SiteFooter({ locale }: { locale: Locale }) {
  const fetched = await contentApi.menu('FOOTER');
  const links = fetched.length > 0 ? fetched : DEFAULT_FOOTER_MENU;

  return (
    <footer className={styles.footer}>
      <div className="alv-page">
        <div className={styles.logo}>
          <AliverLogo height={24} />
        </div>
        <p className={styles.description}>
          {locale === 'ru'
            ? 'Официальный интернет-магазин продукции ALIVER в Узбекистане. Вся продукция оригинальная и сертифицированная.'
            : 'ALIVER mahsulotlarining O‘zbekistondagi rasmiy onlayn do‘koni. Barcha mahsulotlar original va sertifikatlangan.'}
        </p>

        <nav className={styles.links}>
          {links.map((item) => (
            <Link
              key={item.id}
              href={item.external ? item.href : `/${locale}${item.href}`}
              {...(item.external ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
            >
              {locale === 'ru' ? item.labelRu : item.labelUz}
            </Link>
          ))}
        </nav>

        <PaymentBadges locale={locale} />

        <div className={styles.line} />
        <div className={styles.copyright}>
          © 2026 ALIVER.UZ •{' '}
          {locale === 'ru' ? 'Официальный магазин в Узбекистане' : 'O‘zbekistondagi rasmiy do‘kon'}
        </div>
      </div>
    </footer>
  );
}
