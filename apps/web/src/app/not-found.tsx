import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { NotFoundView } from '@/components/NotFoundView';
import { isLocale } from '@/i18n/messages';

/**
 * Manzil hech qaysi route'ga mos kelmaganda.
 *
 * Noto'g'ri yozilgan va eski havolalar shu yerga tushadi, ya'ni
 * odamlar aynan shu sahifani ko'proq ko'radi.
 *
 * QOBIQ ROOT LAYOUTDAN keladi. Ilgari root layout umuman yo'q edi —
 * sayt qobig'i `[locale]/layout.tsx` da turardi. Noto'g'ri yozilgan
 * manzil esa hech qaysi `[locale]` route'iga tushmaydi va o'sha
 * layoutdan tashqarida qoladi: sarlavhadagi savat belgisi
 * `CartProvider` siz qolib xato tashlardi, Next.js `global-error`
 * ga tushardi va odam «Sayt vaqtincha ishlamayapti» degan ekranni
 * 500 javobi bilan ko'rardi. Ya'ni bitta harf xato yozgan mijoz
 * do'kon yopilgan deb o'ylardi, qidiruv tizimi esa buni serverdagi
 * nosozlik deb o'qirdi.
 */
export default async function GlobalNotFound(): Promise<ReactNode> {
  const raw = (await headers()).get('x-alv-locale') ?? 'uz';
  const locale = isLocale(raw) ? raw : 'uz';
  // Qobiq (html/body, uslublar, savat konteksti va cookie banneri)
  // root layoutdan keladi.
  return <NotFoundView locale={locale} />;
}
