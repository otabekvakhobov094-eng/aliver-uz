'use client';

import { type ReactNode } from 'react';
import { setCurrentLocale, type AdminLocale } from '@/lib/i18n';

/**
 * Tilni chizishdan OLDIN o'rnatadi.
 *
 * `setCurrentLocale` aynan shu yerda, bolalar chizilgunga qadar
 * chaqiriladi — effektda emas. Effektda bo'lsa birinchi chizish
 * o'zbekcha ketib, keyin ruschaga almashardi va ekran «sakrardi».
 */
export function AdminLocaleProvider({
  locale,
  children,
}: {
  locale: AdminLocale;
  children: ReactNode;
}) {
  setCurrentLocale(locale);
  return <>{children}</>;
}
