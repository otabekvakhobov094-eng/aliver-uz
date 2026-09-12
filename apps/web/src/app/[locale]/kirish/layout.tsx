import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { isLocale } from '@/i18n/messages';

/**
 * Sarlavha AYNAN shu yerda.
 *
 * `page.tsx` — mijoz komponenti (`'use client'`), u esa `metadata`
 * eksport qila olmaydi. Shuning uchun kirish sahifasi brauzer
 * yorlig'ida boshqa hamma sahifa bilan bir xil «ALIVER.UZ» bo'lib
 * turardi.
 *
 * Kirish sahifasi indekslanmaydi: unda indekslanadigan mazmun yo'q.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const ru = (isLocale(raw) ? raw : 'uz') === 'ru';
  return {
    title: ru ? 'Вход' : 'Kirish',
    description: ru
      ? 'Вход по номеру телефона — пароль не нужен.'
      : 'Telefon raqami orqali kirish — parol kerak emas.',
    robots: { index: false, follow: false },
  };
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
