import { headers } from 'next/headers';
import { NotFoundView } from '@/components/NotFoundView';
import { isLocale } from '@/i18n/messages';

/**
 * Sahifa `notFound()` chaqirganda — masalan mavjud bo'lmagan mahsulot.
 *
 * `not-found.tsx` Next.js da `params` olmaydi, shuning uchun til
 * middleware qo'ygan sarlavhadan olinadi.
 */
export default async function LocaleNotFound() {
  const raw = (await headers()).get('x-alv-locale') ?? 'uz';
  return <NotFoundView locale={isLocale(raw) ? raw : 'uz'} />;
}
