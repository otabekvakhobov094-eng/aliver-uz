'use client';

import Link from 'next/link';
import { useCart } from './CartProvider';
import type { Locale } from '@/i18n/messages';

/**
 * Savat tugmasi — aliver.com dagidek IKONKA, matn emas.
 *
 * Sababi joy: sarlavhada logotip markazda turishi uchun yon ustunlar
 * teng bo'lishi kerak, «Savat» so'zi esa o'ng ustunni kengaytirib,
 * logotipni chapga surardi. Ikonka ostidagi son savatda nima borligini
 * matndan ko'ra tezroq aytadi.
 */
export function CartBadge({ locale }: { locale: Locale }) {
  const { cart, ready } = useCart();
  const count = cart?.itemsCount ?? 0;

  return (
    <Link
      href={`/${locale}/savat`}
      className="alv-icon-btn"
      aria-label={locale === 'ru' ? `Корзина, товаров: ${count}` : `Savat, ${count} ta mahsulot`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 7h12l-1.2 11.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M9 9V6.5a3 3 0 1 1 6 0V9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>

      {/*
        Son FAQAT savat o'qilgandan keyin chiqadi. Ilgari u serverda 0
        bo'lib chizilib, keyin haqiqiy songa sakrab o'tardi — bu
        "layout shift" va u ko'zga sezilarli.
      */}
      {ready && count > 0 ? (
        <span className="alv-icon-btn__count" aria-hidden>
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}
