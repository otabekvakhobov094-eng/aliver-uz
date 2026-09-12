import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { NotFoundView } from '@/components/NotFoundView';
import { CookieConsent } from '@/components/CookieConsent';
import { isLocale } from '@/i18n/messages';
import '@aliver/ui/tokens.css';
import '@aliver/ui/components.css';
import '@aliver/ui/motion.css';

/**
 * Manzil hech qaysi route'ga mos kelmaganda.
 *
 * Noto'g'ri yozilgan va eski havolalar shu yerga tushadi, ya'ni
 * odamlar aynan shu sahifani ko'proq ko'radi.
 *
 * BU SAHIFA `[locale]/layout.tsx` DAN TASHQARIDA turadi. Sayt
 * uslublari o'sha layoutda import qilingan, shuning uchun bu yerda
 * ular ALOHIDA import qilinadi — aks holda sahifa butunlay
 * uslubsiz chiqadi: oq fon, serif shrift, ko'k tagi chizilgan
 * havolalar. Aynan shunday edi.
 *
 * `<html>` va `<body>` yozilmaydi: root layout yo'q, ularni Next.js
 * o'zi qo'shadi. Shrift havolasi ham yo'q — tokenlardagi tizim
 * shriftlari zaxira bo'lib ishlaydi.
 */
export default async function GlobalNotFound(): Promise<ReactNode> {
  const raw = (await headers()).get('x-alv-locale') ?? 'uz';
  const locale = isLocale(raw) ? raw : 'uz';
  return (
    <>
      <NotFoundView locale={locale} />
      <CookieConsent locale={locale} />
    </>
  );
}
