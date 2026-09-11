'use client';

import Link from 'next/link';
import { useCart } from './CartProvider';
import type { Locale } from '@/i18n/messages';

/** Sarlavhadagi savat tugmasi va undagi pozitsiyalar soni. */
export function CartBadge({ locale }: { locale: Locale }) {
  const { cart, ready } = useCart();
  const count = cart?.itemsCount ?? 0;

  return (
    <Link
      href={`/${locale}/savat`}
      aria-label={locale === 'ru' ? `Корзина, товаров: ${count}` : `Savat, ${count} ta mahsulot`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 44,
        minHeight: 44,
        borderRadius: 999,
        background: 'var(--alv-brand)',
        color: '#fff',
        fontWeight: 700,
        fontSize: 14,
        padding: '0 18px',
        gap: 8,
      }}
    >
      {locale === 'ru' ? 'Корзина' : 'Savat'}
      {ready && count > 0 ? (
        <span
          style={{
            minWidth: 22,
            height: 22,
            borderRadius: 999,
            background: '#fff',
            color: 'var(--alv-brand)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 800,
            padding: '0 6px',
          }}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
