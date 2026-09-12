import type { Metadata } from 'next';
import { AccountShell } from '@/components/AccountShell';
import { AccountLoyalty } from '@/components/AccountLoyalty';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { isLocale } from '@/i18n/messages';

export const metadata: Metadata = {
  title: 'Bonus ballar',
  robots: { index: false, follow: false },
};

/**
 * Bu sahifada sarlavha, footer va `alv-page` konteyneri YO'Q edi.
 *
 * Kabinetning qolgan beshta sahifasida ular bor, faqat shu bittasida
 * tushib qolgan — natijada «Ballar» bosilganda sayt chrome'i yo'qolib,
 * matn ekranning chap yuqori burchagiga yopishib qolardi va sahifa
 * «kattalashib ketgandek» ko'rinardi.
 *
 * Bu turdagi xato o'zini ko'rsatmaydi: sahifa ochiladi, xato bermaydi,
 * shunchaki boshqacha ko'rinadi. Shuning uchun quyida
 * `scripts/check-page-chrome.mjs` tekshiruvi qo'shildi.
 */
export default async function LoyaltyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ paddingBlock: 28, minHeight: '60vh' }}>
        <AccountShell locale={locale} title={locale === 'ru' ? 'Бонусные баллы' : 'Bonus ballar'}>
          <AccountLoyalty locale={locale} />
        </AccountShell>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
