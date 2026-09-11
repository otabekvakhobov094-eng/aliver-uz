import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { OrderSuccess } from '@/components/OrderSuccess';
import { isLocale } from '@/i18n/messages';

export const metadata: Metadata = {
  title: 'Buyurtma qabul qilindi',
  robots: { index: false, follow: false },
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale = isLocale(raw) ? raw : 'uz';

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ paddingBlock: 28, minHeight: '60vh' }}>
        <OrderSuccess id={id} locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
