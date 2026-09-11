'use client';

import { useEffect, useState } from 'react';
import { OrderStatusView } from './OrderStatusView';
import { ShopError, shopApi, type OrderView } from '@/lib/shop-api';
import type { Locale } from '@/i18n/messages';

/**
 * Rahmat sahifasi. Buyurtma brauzerdan olinadi (server komponentda emas):
 * sahifa keshlanmasligi va har doim joriy holatni ko'rsatishi kerak.
 */
export function OrderSuccess({ id, locale }: { id: string; locale: Locale }) {
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    shopApi
      .order(id)
      .then(setOrder)
      .catch((e) =>
        setError(e instanceof ShopError ? e.message : 'Buyurtma ma’lumotini olib bo‘lmadi'),
      );
  }, [id]);

  if (error) {
    return (
      <p role="alert" style={{ color: 'var(--alv-danger)', fontWeight: 600 }}>
        {error}
      </p>
    );
  }
  if (!order) {
    return (
      <p style={{ color: 'var(--alv-muted)' }}>{locale === 'ru' ? 'Загрузка…' : 'Yuklanmoqda…'}</p>
    );
  }
  return <OrderStatusView order={order} locale={locale} variant="success" />;
}
