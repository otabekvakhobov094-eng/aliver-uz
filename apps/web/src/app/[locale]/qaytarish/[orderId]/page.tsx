import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ReturnRequest } from '@/components/ReturnRequest';
import { isLocale } from '@/i18n/messages';

export const metadata: Metadata = {
  title: 'Tovarni qaytarish',
  robots: { index: false, follow: false },
};

export default async function ReturnPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale: raw, orderId } = await params;
  const locale = isLocale(raw) ? raw : 'uz';

  return (
    <>
      <SiteHeader locale={locale} />
      <main
        className="alv-page"
        style={{ paddingBlock: 28, minHeight: '60vh', maxWidth: 760, marginInline: 'auto' }}
      >
        <h1
          style={{
            fontFamily: 'var(--alv-font-display)',
            fontSize: 28,
            letterSpacing: '-0.03em',
            margin: '0 0 18px',
          }}
        >
          {locale === 'ru' ? 'Возврат товара' : 'Tovarni qaytarish'}
        </h1>
        <ReturnRequest orderId={orderId} locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
