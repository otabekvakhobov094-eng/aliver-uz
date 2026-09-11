'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, formatPrice } from '@aliver/ui';
import { ShopError, shopApi, type PaymentStatusView } from '@/lib/shop-api';
import type { Locale } from '@/i18n/messages';

const POLL_MS = 3000;
const MAX_POLLS = 200; // ~10 daqiqa

const LABEL: Record<string, { uz: string; ru: string }> = {
  PENDING: { uz: 'To‘lov kutilmoqda', ru: 'Ожидает оплаты' },
  WAITING: { uz: 'To‘lov tekshirilmoqda', ru: 'Проверяем оплату' },
  PAID: { uz: 'To‘lov qabul qilindi', ru: 'Оплата получена' },
  FAILED: { uz: 'To‘lov amalga oshmadi', ru: 'Оплата не прошла' },
  CANCELLED: { uz: 'To‘lov bekor qilindi', ru: 'Оплата отменена' },
};

/**
 * To'lov kutish sahifasi.
 *
 * Mijoz provayder sahifasidan qaytganda holat DARHOL yangilanmagan
 * bo'lishi mumkin: webhook bir necha soniyaga kechikadi. Shuning uchun
 * sahifa holatni so'rab turadi. Muhimi — "to'landi" degan xulosani
 * brauzer emas, SERVER chiqaradi (ekspertiza A-7).
 */
export function PaymentWaiting({ orderId, locale }: { orderId: string; locale: Locale }) {
  const [state, setState] = useState<PaymentStatusView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [restarting, setRestarting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await shopApi.paymentStatus(orderId);
      setState(res);
      return res.status;
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Holatni olib bo‘lmadi');
      return null;
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;

    const loop = async () => {
      const status = await poll();
      if (cancelled) return;

      const finished = status === 'PAID' || status === 'CANCELLED' || status === 'FAILED';
      if (finished) return;

      setTries((t) => {
        if (t + 1 >= MAX_POLLS) return t;
        timer.current = setTimeout(() => void loop(), POLL_MS);
        return t + 1;
      });
    };

    void loop();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poll]);

  const restart = async () => {
    setRestarting(true);
    setError(null);
    try {
      const link = await shopApi.startPayment(orderId);
      if (link.url) window.location.href = link.url;
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'To‘lovni qayta boshlab bo‘lmadi');
    } finally {
      setRestarting(false);
    }
  };

  const status = state?.status ?? 'PENDING';
  const label = LABEL[status] ?? LABEL.PENDING!;
  const paid = status === 'PAID';
  const failed = status === 'CANCELLED' || status === 'FAILED';
  const stalled = tries >= MAX_POLLS - 1 && !paid && !failed;

  return (
    <div
      style={{
        maxWidth: 520,
        margin: '0 auto',
        background: 'var(--alv-surface)',
        borderRadius: 'var(--alv-radius-xl)',
        padding: 28,
        boxShadow: 'var(--alv-shadow-md)',
        textAlign: 'center',
        display: 'grid',
        gap: 14,
      }}
    >
      <div style={{ fontSize: 40 }} aria-hidden>
        {paid ? '✓' : failed ? '✕' : '⏳'}
      </div>

      <h1 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 24, margin: 0 }}>
        {locale === 'ru' ? label.ru : label.uz}
      </h1>

      {state?.orderNumber ? (
        <p style={{ margin: 0, color: 'var(--alv-ink-2)', fontSize: 14 }}>
          {locale === 'ru' ? 'Заказ' : 'Buyurtma'} <strong>{state.orderNumber}</strong>
          {' · '}
          {formatPrice(state.amount, locale === 'ru' ? 'RU' : 'UZ')}
        </p>
      ) : null}

      {!paid && !failed ? (
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--alv-muted)', lineHeight: 1.55 }}>
          {locale === 'ru'
            ? 'Не закрывайте страницу — подтверждение от платёжной системы обычно приходит за несколько секунд.'
            : 'Sahifani yopmang — to‘lov tizimidan tasdiq odatda bir necha soniyada keladi.'}
        </p>
      ) : null}

      {state?.failureReason && failed ? (
        <p role="alert" style={{ margin: 0, fontSize: 13.5, color: 'var(--alv-danger)' }}>
          {state.failureReason}
        </p>
      ) : null}

      {stalled ? (
        <p
          role="status"
          style={{
            margin: 0,
            padding: '12px 16px',
            borderRadius: 14,
            background: 'var(--alv-warn-soft)',
            color: 'var(--alv-warn)',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          {locale === 'ru'
            ? 'Подтверждение задерживается. Заказ сохранён — мы свяжемся с вами.'
            : 'Tasdiq kechikmoqda. Buyurtma saqlangan — biz siz bilan bog‘lanamiz.'}
        </p>
      ) : null}

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 13.5, color: 'var(--alv-danger)' }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
        {paid ? (
          <Link href={`/${locale}/buyurtma/${orderId}`} style={{ display: 'block' }}>
            <Button variant="primary" size="lg" fullWidth>
              {locale === 'ru' ? 'Открыть заказ' : 'Buyurtmani ochish'}
            </Button>
          </Link>
        ) : failed ? (
          <>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={restarting}
              onClick={() => void restart()}
            >
              {locale === 'ru' ? 'Оплатить снова' : 'Qayta to‘lash'}
            </Button>
            <Link href={`/${locale}/buyurtma/${orderId}`} style={{ display: 'block' }}>
              <Button variant="ghost" fullWidth>
                {locale === 'ru' ? 'Открыть заказ' : 'Buyurtmani ochish'}
              </Button>
            </Link>
          </>
        ) : (
          <Link
            href={`/${locale}/buyurtma/${orderId}`}
            style={{ fontSize: 13.5, color: 'var(--alv-muted)' }}
          >
            {locale === 'ru' ? 'Открыть заказ' : 'Buyurtmani ochish'}
          </Link>
        )}
      </div>
    </div>
  );
}
