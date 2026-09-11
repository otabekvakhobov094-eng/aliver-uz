import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { PaymentWaiting } from '@/components/PaymentWaiting';
import { isLocale } from '@/i18n/messages';

export const metadata: Metadata = {
  title: 'To‘lov',
  robots: { index: false, follow: false },
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale: raw, orderId } = await params;
  const locale = isLocale(raw) ? raw : 'uz';

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ paddingBlock: 40, minHeight: '60vh' }}>
        <PaymentWaiting orderId={orderId} locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
