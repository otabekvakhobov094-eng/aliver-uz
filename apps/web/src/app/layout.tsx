import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { isLocale } from '@/i18n/messages';
import { CartProvider } from '@/components/CartProvider';
import { CookieConsent } from '@/components/CookieConsent';
import '@aliver/ui/tokens.css';
import '@aliver/ui/components.css';
import '@aliver/ui/motion.css';

/**
 * ROOT LAYOUT — `<html>` va `<body>` aynan shu yerda.
 *
 * NEGA KERAK BO'LDI. Ilgari ular `[locale]/layout.tsx` da edi va
 * root layout umuman yo'q edi. Bu ishlaydi — lekin FAQAT manzil
 * `[locale]` route'iga tushganda. Noto'g'ri yozilgan manzil
 * (`/uz/bunday-sahifa-yoq`) hech qaysi route'ga mos kelmaydi va
 * o'sha layoutdan tashqarida qoladi: Next.js qobiqsiz sahifani
 * chiza olmay `global-error` ga tushardi va mijoz «Sayt vaqtincha
 * ishlamayapti» degan ekranni ko'rardi.
 *
 * Ya'ni bitta harf xato yozgan odam do'kon yopilgan deb o'ylardi.
 * Ustiga javob 500 bo'lib ketardi — qidiruv tizimi uchun bu
 * «serverda nosozlik», 404 esa oddiy «bunday sahifa yo'q».
 *
 * Til SARLAVHADAN olinadi: uni `middleware.ts` har so'rovga qo'yadi.
 * `params` bu yerda yo'q, chunki root layout `[locale]` dan
 * yuqorida turadi.
 */
export const metadata: Metadata = {
  title: { default: 'ALIVER.UZ', template: '%s — ALIVER.UZ' },
  description: 'ALIVER mahsulotlarining O‘zbekistondagi rasmiy onlayn do‘koni',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const raw = (await headers()).get('x-alv-locale') ?? 'uz';
  const lang = isLocale(raw) ? raw : 'uz';

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
      {/*
        SAVAT KONTEKSTI VA COOKIE BANNERI HAM SHU YERDA.
        Ilgari ular `[locale]/layout.tsx` da edi va 404 sahifasi
        ulardan tashqarida qolardi: sarlavhadagi savat belgisi
        `useCart` ni chaqirib «CartProvider ichida ishlaydi» degan
        xato tashlardi. Natijada 404 o'rniga «Sayt vaqtincha
        ishlamayapti» ekrani chiqardi.
      */}
      <body>
        <CartProvider>{children}</CartProvider>
        <CookieConsent locale={lang} />
      </body>
    </html>
  );
}
