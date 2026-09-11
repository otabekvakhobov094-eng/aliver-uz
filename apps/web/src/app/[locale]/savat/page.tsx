import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CartView } from '@/components/CartView';
import { isLocale } from '@/i18n/messages';

export const metadata: Metadata = {
  title: 'Savat',
  // Savat shaxsiy sahifa — qidiruv tizimiga kerak emas.
  robots: { index: false, follow: false },
};

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ paddingBlock: 28, minHeight: '60vh' }}>
        <h1
          style={{
            fontFamily: 'var(--alv-font-display)',
            fontSize: 30,
            letterSpacing: '-0.03em',
            margin: '0 0 20px',
          }}
        >
          {locale === 'ru' ? 'Корзина' : 'Savat'}
        </h1>
        <CartView locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
