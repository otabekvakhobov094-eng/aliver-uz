'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button, formatPrice } from '@aliver/ui';
import { ShopError, shopApi } from '@/lib/shop-api';
import type { Locale } from '@/i18n/messages';

/**
 * Provayder nomi. Ilgari bu yerda `provider === 'PAYME' ? 'Payme' : 'Click'`
 * turardi — ya'ni uchinchi provayder qo'shilishi bilan Uzum «Click» deb
 * ko'rinardi va buni hech qanday tur tekshiruvi ushlamasdi.
 */
const PROVIDER_NAME: Record<string, string> = {
  CLICK: 'Click',
  PAYME: 'Payme',
  UZUM: 'Uzum',
  CASH_ON_DELIVERY: 'Naqd',
};

/**
 * MAKET to'lov sahifasi.
 *
 * Click va Payme kalitlari kelmaguncha mijoz shu sahifaga tushadi.
 * Bu yerda "to'lash" tugmasi haqiqiy provayder webhook'i qiladigan
 * ishni bajaradi — natijada butun zanjir (buyurtma tasdiqlanishi,
 * rezerv, fiskal chek navbati) haqiqiy sharoitdagidek ishlaydi.
 *
 * Endpoint faqat `PAYMENTS_MODE=mock` da ochiq: jangovar muhitda
 * server 404 qaytaradi.
 */
export function MockPaymentPage({ locale }: { locale: Locale }) {
  const router = useRouter();
  const search = useSearchParams();
  const orderId = search.get('order') ?? '';
  const provider = search.get('provider') ?? 'CLICK';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);

  const act = async (outcome: 'PAID' | 'CANCELLED') => {
    setBusy(true);
    setError(null);
    try {
      const res = await shopApi.mockConfirm(orderId, outcome);
      setAmount(res.amount);
      router.push(`/${locale}/tolov/${orderId}`);
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Xatolik');
      setBusy(false);
    }
  };

  if (!orderId) {
    return (
      <p role="alert" style={{ color: 'var(--alv-danger)', textAlign: 'center' }}>
        Buyurtma ko‘rsatilmagan.
      </p>
    );
  }

  return (
    <div
      style={{
        maxWidth: 460,
        margin: '0 auto',
        background: 'var(--alv-surface)',
        borderRadius: 'var(--alv-radius-xl)',
        padding: 28,
        boxShadow: 'var(--alv-shadow-md)',
        display: 'grid',
        gap: 16,
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 12,
          background: 'var(--alv-warn-soft)',
          color: 'var(--alv-warn)',
          fontWeight: 700,
          fontSize: 13,
          textAlign: 'center',
        }}
      >
        {locale === 'ru'
          ? 'МАКЕТ — реальная оплата не производится'
          : 'MAKET — haqiqiy to‘lov amalga oshmaydi'}
      </div>

      <h1
        style={{
          fontFamily: 'var(--alv-font-display)',
          fontSize: 22,
          margin: 0,
          textAlign: 'center',
        }}
      >
        {PROVIDER_NAME[provider] ?? provider}
      </h1>

      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--alv-ink-2)', lineHeight: 1.6 }}>
        {locale === 'ru'
          ? 'Здесь будет страница платёжной системы. Пока ключи мерчанта не получены, вы можете смоделировать результат оплаты — дальше всё работает как в бою: заказ подтверждается, резерв закрепляется, чек уходит в очередь.'
          : 'Bu yerda to‘lov tizimining sahifasi bo‘ladi. Merchant kalitlari kelmaguncha natijani shu yerda modellashtirasiz — undan keyingi hamma narsa jangovardagidek ishlaydi: buyurtma tasdiqlanadi, rezerv mustahkamlanadi, chek navbatga tushadi.'}
      </p>

      {amount ? (
        <p style={{ margin: 0, textAlign: 'center', fontWeight: 800, fontSize: 20 }}>
          {formatPrice(amount, locale === 'ru' ? 'RU' : 'UZ')}
        </p>
      ) : null}

      {error ? (
        <p role="alert" style={{ margin: 0, color: 'var(--alv-danger)', fontSize: 13.5 }}>
          {error}
        </p>
      ) : null}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={busy}
        onClick={() => void act('PAID')}
      >
        {locale === 'ru' ? 'Успешная оплата' : 'To‘lov muvaffaqiyatli'}
      </Button>
      <Button variant="outline" fullWidth disabled={busy} onClick={() => void act('CANCELLED')}>
        {locale === 'ru' ? 'Отменить оплату' : 'To‘lovni bekor qilish'}
      </Button>
    </div>
  );
}
