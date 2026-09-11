import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AccountShell } from '@/components/AccountShell';
import { AccountAddresses } from '@/components/AccountAddresses';
import { isLocale } from '@/i18n/messages';

export const metadata: Metadata = {
  title: 'Manzillarim',
  robots: { index: false, follow: false },
};

export default async function AddressesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ paddingBlock: 28, minHeight: '60vh' }}>
        <AccountShell locale={locale} title={locale === 'ru' ? 'Адреса' : 'Manzillar'}>
          <AccountAddresses locale={locale} />
        </AccountShell>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
