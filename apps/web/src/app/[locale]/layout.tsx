import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { isLocale } from '@/i18n/messages';
import { CartProvider } from '@/components/CartProvider';
import { CookieConsent } from '@/components/CookieConsent';
import { BrandIntro } from '@/components/BrandIntro';
import '@aliver/ui/tokens.css';
import '@aliver/ui/components.css';
import '@aliver/ui/motion.css';

export const metadata: Metadata = {
  title: { default: 'ALIVER.UZ', template: '%s — ALIVER.UZ' },
  description: 'ALIVER mahsulotlarining O‘zbekistondagi rasmiy onlayn do‘koni',
};

/**
 * generateStaticParams ataylab ishlatilmaydi: katalog sahifalari API dan
 * ma'lumot oladi va build paytida API ishlab turishi shart emas.
 * Sahifalar birinchi so'rovda render qilinadi va `revalidate` bo'yicha
 * keshlanadi (ISR) — natija bir xil, lekin CI build API ga bog'liq emas.
 */

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = isLocale(locale) ? locale : 'uz';
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Prata&family=Golos+Text:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        {/*
          Kirish animatsiyasi tarkibdan OLDIN turadi, lekin uni
          yashirmaydi: u `position: fixed` qoplama va sayt uning ostida
          odatdagidek chiziladi.
        */}
        <BrandIntro locale={lang} />
        <CartProvider>{children}</CartProvider>
        <CookieConsent locale={lang} />
      </body>
    </html>
  );
}
