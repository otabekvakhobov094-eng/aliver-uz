import type { Metadata } from 'next';
import { PartnerForm } from '@/components/PartnerForm';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { isLocale } from '@/i18n/messages';

export const metadata: Metadata = {
  title: 'Hamkor bo‘ling — ALIVER.UZ',
  description: 'ALIVER mahsulotlarini ulgurji narxda sotib olish va o‘z do‘koningizda sotish.',
};

export default async function PartnershipPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ maxWidth: 760, paddingTop: 48, paddingBottom: 70, minHeight: '60vh' }}>
        <PartnerForm locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
