'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, formatPrice } from '@aliver/ui';
import { AccountAlert, AccountCard } from './AccountShell';
import { STATUS_LABEL } from './OrderStatusView';
import { ShopError, shopApi } from '@/lib/shop-api';
import type { Locale } from '@/i18n/messages';

interface OrderRow {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  grandTotal: string;
  placedAt: string;
  items: Array<{ imageUrl: string | null; productName: string }>;
}

export function AccountOrders({ locale }: { locale: Locale }) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    shopApi
      .myOrders()
      .then((rows) => setOrders(rows as unknown as OrderRow[]))
      .catch((e) => setError(e instanceof ShopError ? e.message : 'Xatolik'));
  }, []);

  if (error) {
    return (
      <AccountCard>
        <AccountAlert tone="danger">{error}</AccountAlert>
      </AccountCard>
    );
  }
  if (!orders) {
    return (
      <p style={{ color: 'var(--alv-muted)' }}>{locale === 'ru' ? 'Загрузка…' : 'Yuklanmoqda…'}</p>
    );
  }
  if (orders.length === 0) {
    return (
      <AccountCard>
        <p style={{ margin: 0, color: 'var(--alv-muted)' }}>
          {locale === 'ru' ? 'Заказов пока нет.' : 'Hozircha buyurtma yo‘q.'}
        </p>
        <Link href={`/${locale}/katalog`} style={{ color: 'var(--alv-brand)', fontWeight: 700 }}>
          {locale === 'ru' ? 'Перейти в каталог →' : 'Katalogga o‘tish →'}
        </Link>
      </AccountCard>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {orders.map((o) => {
        const label = STATUS_LABEL[o.status];
        const cancelled = o.status === 'CANCELLED';
        return (
          <div
            key={o.id}
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
            <div style={{ display: 'flex', gap: 6 }}>
              {o.items.slice(0, 3).map((i, idx) => (
                <div
                  key={`${o.id}-${idx}`}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: 'var(--alv-surface-2)',
                    overflow: 'hidden',
                  }}
                >
                  {i.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={i.imageUrl}
                      alt=""
                      width={48}
                      height={48}
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <Link
                href={`/${locale}/buyurtma/${o.id}`}
                style={{ fontWeight: 800, fontSize: 15, color: 'var(--alv-ink)' }}
              >
                {o.number}
              </Link>
              <div style={{ fontSize: 12.5, color: 'var(--alv-muted)', marginTop: 2 }}>
                {new Date(o.placedAt).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'uz-UZ', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>

            <Badge tone={cancelled ? 'low' : 'mint'}>
              {label ? (locale === 'ru' ? label.ru : label.uz) : o.status}
            </Badge>

            <strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>
              {formatPrice(o.grandTotal, locale === 'ru' ? 'RU' : 'UZ')}
            </strong>

            {o.status === 'DELIVERED' ? (
              <Link
                href={`/${locale}/qaytarish/${o.id}`}
                style={{ fontSize: 13, color: 'var(--alv-brand)', fontWeight: 700 }}
              >
                {locale === 'ru' ? 'Вернуть' : 'Qaytarish'}
              </Link>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
