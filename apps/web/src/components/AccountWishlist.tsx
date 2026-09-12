'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Button, formatPrice } from '@aliver/ui';
import { AccountAlert, AccountCard } from './AccountShell';
import { useCart } from './CartProvider';
import { ShopError, shopApi, type WishlistEntry } from '@/lib/shop-api';
import { AccountStateView } from './AccountState';
import { useAccountData } from './useAccountData';
import type { Locale } from '@/i18n/messages';

export function AccountWishlist({ locale }: { locale: Locale }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { add } = useCart();
  const { data: items, state, reload, setData: setItems } = useAccountData(() => shopApi.wishlist());

  const remove = async (variantId: string) => {
    setBusy(variantId);
    try {
      setItems(await shopApi.removeFromWishlist(variantId));
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  };

  const toCart = async (variantId: string) => {
    setBusy(variantId);
    setError(null);
    try {
      await add(variantId, 1);
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Savatga qo‘shib bo‘lmadi');
    } finally {
      setBusy(null);
    }
  };

  if (state.status !== 'ready' || !items) {
    return <AccountStateView state={state} locale={locale} onRetry={reload} />;
  }
  if (items.length === 0) {
    return (
      <AccountCard>
        <p style={{ margin: 0, color: 'var(--alv-muted)' }}>
          {locale === 'ru' ? 'Избранное пусто.' : 'Sevimlilar bo‘sh.'}
        </p>
        <Link href={`/${locale}/katalog`} style={{ color: 'var(--alv-brand)', fontWeight: 700 }}>
          {locale === 'ru' ? 'Перейти в каталог →' : 'Katalogga o‘tish →'}
        </Link>
      </AccountCard>
    );
  }

  return (
    <>
      {error ? (
        <div style={{ marginBottom: 12 }}>
          <AccountAlert tone="danger">{error}</AccountAlert>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((w) => {
          const unavailable = !w.onSale || w.availableStock === 0;
          return (
            <div
              key={w.id}
              style={{
                background: 'var(--alv-surface)',
                borderRadius: 'var(--alv-radius-lg)',
                padding: 16,
                boxShadow: 'var(--alv-shadow-sm)',
                display: 'flex',
                gap: 16,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 14,
                  background: 'var(--alv-surface-2)',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {w.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={w.imageUrl}
                    alt=""
                    width={72}
                    height={72}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  />
                ) : null}
              </div>

              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <Link
                  href={`/${locale}/mahsulot/${w.slug}`}
                  style={{ fontWeight: 700, fontSize: 15, color: 'var(--alv-ink)' }}
                >
                  {locale === 'ru' ? w.nameRu : w.nameUz}
                </Link>
                <div style={{ fontSize: 12.5, color: 'var(--alv-muted)', marginTop: 2 }}>
                  {w.variantLabel}
                </div>
                {unavailable ? (
                  <div style={{ marginTop: 6 }}>
                    <Badge tone="neutral">
                      {locale === 'ru' ? 'Нет в наличии' : 'Sotuvda yo‘q'}
                    </Badge>
                  </div>
                ) : null}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>
                  {formatPrice(w.price, locale === 'ru' ? 'RU' : 'UZ')}
                </div>
                {w.oldPrice ? (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: 'var(--alv-muted)',
                      textDecoration: 'line-through',
                    }}
                  >
                    {formatPrice(w.oldPrice, locale === 'ru' ? 'RU' : 'UZ')}
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={unavailable || busy === w.variantId}
                  onClick={() => void toCart(w.variantId)}
                >
                  {locale === 'ru' ? 'В корзину' : 'Savatga'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === w.variantId}
                  onClick={() => void remove(w.variantId)}
                >
                  {locale === 'ru' ? 'Убрать' : 'Olib tashlash'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
