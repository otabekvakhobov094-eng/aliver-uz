import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AccountShell } from '@/components/AccountShell';
import { AccountReturns } from '@/components/AccountReturns';
import { isLocale } from '@/i18n/messages';

export const metadata: Metadata = {
  title: 'Qaytarishlarim',
  robots: { index: false, follow: false },
};

export default async function ReturnsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ paddingBlock: 28, minHeight: '60vh' }}>
        <AccountShell locale={locale} title={locale === 'ru' ? 'Возвраты' : 'Qaytarishlar'}>
          <Suspense fallback={null}>
            <AccountReturns locale={locale} />
          </Suspense>
        </AccountShell>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
