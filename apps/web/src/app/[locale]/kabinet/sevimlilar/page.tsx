import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AccountShell } from '@/components/AccountShell';
import { AccountWishlist } from '@/components/AccountWishlist';
import { isLocale } from '@/i18n/messages';

export const metadata: Metadata = {
  title: 'Sevimlilar',
  robots: { index: false, follow: false },
};

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ paddingBlock: 28, minHeight: '60vh' }}>
        <AccountShell locale={locale} title={locale === 'ru' ? 'Избранное' : 'Sevimlilar'}>
          <AccountWishlist locale={locale} />
        </AccountShell>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
