import type { ReactNode } from 'react';
import { isLocale } from '@/i18n/messages';
import { BrandIntro } from '@/components/BrandIntro';

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
  /*
   * `<html>` va `<body>` BU YERDA EMAS — ular root layoutda
   * (`app/layout.tsx`). Sabab: noto'g'ri yozilgan manzil bu
   * layoutgacha yetib kelmaydi va qobiqsiz qoladi.
   */
  /*
   * Savat konteksti va cookie banneri root layoutda — ular butun
   * sayt uchun, 404 sahifasi ham ularga muhtoj.
   */
  return (
    <>
      {/*
        Kirish animatsiyasi tarkibdan OLDIN turadi, lekin uni
        yashirmaydi: u `position: fixed` qoplama va sayt uning ostida
        odatdagidek chiziladi.
      */}
      <BrandIntro locale={lang} />
      {children}
    </>
  );
}
