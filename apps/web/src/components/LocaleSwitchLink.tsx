'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { Locale } from '@/i18n/messages';

/**
 * Til almashtirish — SHU sahifada qoladi.
 *
 * NEGA. Havola `/${other}` ga, ya'ni boshqa tilning BOSH sahifasiga
 * olib borardi. Mahsulotni o'qib turgan mijoz tilni almashtirsa,
 * o'sha mahsulotni yo'qotardi va uni qaytadan qidirishga tushardi.
 * Xato chiqmaydi — shunchaki «sayt meni chiqarib yubordi».
 *
 * Endi manzildagi til segmenti almashtiriladi, qolgan yo'l va
 * qidiruv parametrlari saqlanadi.
 */
export function LocaleSwitchLink({
  locale,
  other,
  className,
}: {
  locale: Locale;
  other: Locale;
  className?: string;
}) {
  const pathname = usePathname() ?? `/${locale}`;
  const search = useSearchParams()?.toString();

  // `/uz/mahsulot/x` → `/ru/mahsulot/x`
  const swapped = pathname.startsWith(`/${locale}`)
    ? `/${other}${pathname.slice(locale.length + 1)}`
    : `/${other}`;

  return (
    <Link href={search ? `${swapped}?${search}` : swapped} className={className} aria-label={other.toUpperCase()}>
      {other.toUpperCase()}
    </Link>
  );
}
