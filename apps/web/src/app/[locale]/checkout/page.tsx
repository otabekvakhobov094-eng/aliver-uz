import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CheckoutForm } from '@/components/CheckoutForm';
import { isLocale } from '@/i18n/messages';

export const metadata: Metadata = {
  title: 'Buyurtmani rasmiylashtirish',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
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
          {locale === 'ru' ? 'Оформление заказа' : 'Buyurtmani rasmiylashtirish'}
        </h1>
        <CheckoutForm locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
