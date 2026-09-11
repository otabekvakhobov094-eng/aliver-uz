import Link from 'next/link';
import { t, type Locale } from '@/i18n/messages';
import { CartBadge } from './CartBadge';

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
    <header>
      <div
        style={{
          background: 'var(--alv-ink)',
          color: '#fff',
          fontSize: 12.5,
          fontWeight: 600,
          textAlign: 'center',
          padding: '10px 16px',
        }}
      >
        {locale === 'ru'
          ? 'Доставка по Узбекистану • 100% оригинал • Click, Payme или наличные'
          : 'O‘zbekiston bo‘ylab yetkazib berish • 100% original • Click, Payme yoki naqd to‘lov'}
      </div>

      <div style={{ background: 'var(--alv-surface)', borderBottom: '1px solid var(--alv-line)' }}>
        <div
          className="alv-page"
          style={{ display: 'flex', alignItems: 'center', gap: 24, height: 70, flexWrap: 'wrap' }}
        >
          <Link
            href={`/${locale}`}
            style={{
              fontFamily: 'var(--alv-font-display)',
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: '-0.04em',
              color: 'var(--alv-ink)',
            }}
          >
            ALIVER<span style={{ color: 'var(--alv-brand)' }}>.UZ</span>
          </Link>

          <nav style={{ display: 'flex', gap: 20, flexGrow: 1, fontSize: 14, fontWeight: 600 }}>
            {NAV.map((item) => (
              <Link
                key={item.key}
                href={`/${locale}${item.href}`}
                style={{ color: 'var(--alv-ink)', whiteSpace: 'nowrap' }}
              >
                {t(locale, item.key)}
              </Link>
            ))}
          </nav>

          <Link
            href={`/${locale}/qidiruv`}
            className="alv-chip"
            style={{ color: 'var(--alv-muted)', minWidth: 200, justifyContent: 'flex-start' }}
          >
            {locale === 'ru' ? 'Поиск товаров…' : 'Mahsulot qidirish…'}
          </Link>

          <Link
            href={`/${other}`}
            className="alv-chip"
            style={{ minHeight: 40, padding: '0 14px' }}
          >
            {other.toUpperCase()}
          </Link>

          <Link
            href={`/${locale}/kuzatuv`}
            className="alv-chip"
            style={{ minHeight: 40, padding: '0 14px', whiteSpace: 'nowrap' }}
          >
            {locale === 'ru' ? 'Отследить' : 'Kuzatuv'}
          </Link>

          <Link
            href={`/${locale}/kabinet`}
            className="alv-chip"
            style={{ minHeight: 40, padding: '0 14px', whiteSpace: 'nowrap' }}
          >
            {locale === 'ru' ? 'Кабинет' : 'Kabinet'}
          </Link>

          <CartBadge locale={locale} />
        </div>
      </div>
    </header>
  );
}
