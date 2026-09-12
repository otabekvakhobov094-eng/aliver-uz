import type { Metadata } from 'next';
import { AccountShell } from '@/components/AccountShell';
import { AccountLoyalty } from '@/components/AccountLoyalty';
import { isLocale } from '@/i18n/messages';

export const metadata: Metadata = {
  title: 'Bonus ballar',
  robots: { index: false, follow: false },
};

export default async function LoyaltyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  return (
    <AccountShell locale={locale} title={locale === 'ru' ? 'Бонусные баллы' : 'Bonus ballar'}>
      <AccountLoyalty locale={locale} />
    </AccountShell>
  );
}
