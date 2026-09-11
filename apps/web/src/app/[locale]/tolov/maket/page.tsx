import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { MockPaymentPage } from '@/components/MockPaymentPage';
import { isLocale } from '@/i18n/messages';

export const metadata: Metadata = {
  title: 'To‘lov (maket)',
  robots: { index: false, follow: false },
};

export default async function MockPayPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ paddingBlock: 40, minHeight: '60vh' }}>
        <Suspense fallback={null}>
          <MockPaymentPage locale={locale} />
        </Suspense>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
