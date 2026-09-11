'use client';

import { useState } from 'react';
import { Button } from '@aliver/ui';
import { OrderStatusView } from './OrderStatusView';
import { ShopError, shopApi, type OrderView } from '@/lib/shop-api';
import type { Locale } from '@/i18n/messages';

/**
 * Mehmon uchun kuzatuv (TZ 39): raqam + telefon.
 *
 * Server "buyurtma topilmadi" deb bir xil javob beradi — raqam bor-yo'qligini
 * saralab bilib bo'lmasligi uchun. So'rovlar soni ham cheklangan.
 */
export function OrderTracker({ locale }: { locale: Locale }) {
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      setOrder(await shopApi.track(number.trim(), phone.trim()));
    } catch (e) {
      setOrder(null);
      setError(e instanceof ShopError ? e.message : 'Buyurtma topilmadi');
    } finally {
      setBusy(false);
    }
  };

  const field: React.CSSProperties = {
    width: '100%',
    minHeight: 48,
    padding: '12px 14px',
    borderRadius: 12,
    border: 0,
    boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
    font: 'inherit',
    background: 'var(--alv-surface)',
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        style={{
          background: 'var(--alv-surface)',
          borderRadius: 'var(--alv-radius-xl)',
          padding: 20,
          boxShadow: 'var(--alv-shadow-sm)',
          display: 'grid',
          gap: 14,
          maxWidth: 560,
        }}
      >
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--alv-ink-2)', lineHeight: 1.55 }}>
          {locale === 'ru'
            ? 'Введите номер заказа и телефон, указанный при оформлении.'
            : 'Buyurtma raqami va rasmiylashtirishda ko‘rsatilgan telefonni kiriting.'}
        </p>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
            {locale === 'ru' ? 'Номер заказа' : 'Buyurtma raqami'}
          </span>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value.toUpperCase())}
            placeholder="ALV-260910-4821"
            required
            style={field}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
            {locale === 'ru' ? 'Телефон' : 'Telefon'}
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            placeholder="+998 90 123 45 67"
            required
            style={field}
          />
        </label>

        {error ? (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: 14,
              background: 'var(--alv-danger-soft)',
              color: 'var(--alv-danger)',
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={busy || number.length < 6 || phone.replace(/\D/g, '').length < 9}
          fullWidth
        >
          {busy
            ? locale === 'ru'
              ? 'Ищем…'
              : 'Qidirilmoqda…'
            : locale === 'ru'
              ? 'Найти заказ'
              : 'Buyurtmani topish'}
        </Button>
      </form>

      {order ? <OrderStatusView order={order} locale={locale} variant="track" /> : null}
    </div>
  );
}
