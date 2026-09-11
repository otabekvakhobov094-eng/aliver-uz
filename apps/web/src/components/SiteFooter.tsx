import Link from 'next/link';
import type { Locale } from '@/i18n/messages';

const LINKS: Array<[string, string, string]> = [
  ['/sahifa/yetkazib-berish', 'Yetkazib berish', 'Доставка'],
  ['/sahifa/tolov', 'To‘lov', 'Оплата'],
  ['/sahifa/qaytarish', 'Qaytarish shartlari', 'Условия возврата'],
  ['/sahifa/oferta', 'Ommaviy oferta', 'Публичная оферта'],
  ['/sahifa/maxfiylik', 'Maxfiylik siyosati', 'Политика конфиденциальности'],
  ['/savollar', 'Ko‘p so‘raladigan savollar', 'Частые вопросы'],
  ['/blog', 'Blog', 'Блог'],
  ['/hamkorlik', 'Hamkorlik', 'Партнёрство'],
];

export function SiteFooter({ locale }: { locale: Locale }) {
  return (
    <footer
      style={{ background: 'var(--alv-ink)', color: '#fff', marginTop: 72, padding: '40px 0 28px' }}
    >
      <div className="alv-page">
        <div
          style={{
            fontFamily: 'var(--alv-font-display)',
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: '-0.04em',
          }}
        >
          ALIVER<span style={{ color: 'var(--alv-brand)' }}>.UZ</span>
        </div>
        <p
          style={{ color: '#B6A9BE', maxWidth: 420, lineHeight: 1.6, fontSize: 13, marginTop: 12 }}
        >
          {locale === 'ru'
            ? 'Официальный интернет-магазин продукции ALIVER в Узбекистане. Вся продукция оригинальная и сертифицированная.'
            : 'ALIVER mahsulotlarining O‘zbekistondagi rasmiy onlayn do‘koni. Barcha mahsulotlar original va sertifikatlangan.'}
        </p>

        <nav style={{ display: 'flex', gap: '10px 24px', flexWrap: 'wrap', margin: '22px 0 20px' }}>
          {LINKS.map(([href, uz, ru]) => (
            <Link key={href} href={`/${locale}${href}`} style={{ color: '#B6A9BE', fontSize: 13 }}>
              {locale === 'ru' ? ru : uz}
            </Link>
          ))}
        </nav>

        <div style={{ height: 1, background: '#3A2C42', margin: '0 0 16px' }} />
        <div style={{ color: '#8E8296', fontSize: 12 }}>
          © 2026 ALIVER Uzbekistan • MCHJ «ALIVER UZ» • STIR [SIZNING STIR]
        </div>
      </div>
    </footer>
  );
}
