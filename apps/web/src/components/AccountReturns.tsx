'use client';

import Link from 'next/link';
import { fmtDate } from '@/lib/format-date';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge, Button, formatPrice } from '@aliver/ui';
import { AccountAlert, AccountCard } from './AccountShell';
import { ShopError, shopApi, type ReturnSummary, type ReturnView } from '@/lib/shop-api';
import { AccountStateView } from './AccountState';
import { useAccountData } from './useAccountData';
import type { Locale } from '@/i18n/messages';

const TONE: Record<string, 'mint' | 'neutral' | 'low' | 'new'> = {
  REQUESTED: 'new',
  APPROVED: 'mint',
  IN_TRANSIT: 'new',
  RECEIVED: 'mint',
  REFUNDED: 'mint',
  REJECTED: 'low',
  CANCELLED: 'neutral',
};

export function AccountReturns({ locale }: { locale: Locale }) {
  const search = useSearchParams();
  const created = search.get('yangi');

  const [labels, setLabels] = useState<Record<string, { uz: string; ru: string }>>({});
  const [open, setOpen] = useState<ReturnView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: items, state, reload, setData: setItems } = useAccountData(() => shopApi.myReturns());

  /*
   * Holat nomlari ALOHIDA yuklanadi va xatosi yutiladi: ular bo'lmasa
   * ro'yxat baribir ko'rinadi, faqat holat kodi ko'rinishida. Butun
   * sahifani shu sabab yiqitish nomutanosib.
   */
  useEffect(() => {
    shopApi
      .returnReasons()
      .then((r) => {
        const map: Record<string, { uz: string; ru: string }> = {};
        for (const st of r.statuses) map[st.code] = { uz: st.uz, ru: st.ru };
        setLabels(map);
      })
      .catch(() => undefined);
  }, []);

  const show = async (id: string) => {
    try {
      setOpen(await shopApi.returnView(id));
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Xatolik');
    }
  };

  const cancel = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await shopApi.cancelReturn(id);
      setOpen(null);
      await reload();
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const label = (code: string) => {
    const l = labels[code];
    return l ? (locale === 'ru' ? l.ru : l.uz) : code;
  };

  if (!items) {
    return (
      <p style={{ color: 'var(--alv-muted)' }}>{locale === 'ru' ? 'Загрузка…' : 'Yuklanmoqda…'}</p>
    );
  }

  return (
    <>
      {created ? (
        <div style={{ marginBottom: 14 }}>
          <AccountAlert tone="mint">
            {locale === 'ru'
              ? `Запрос ${created} отправлен. Мы свяжемся с вами после проверки.`
              : `${created} so‘rovi yuborildi. Tekshirgach siz bilan bog‘lanamiz.`}
          </AccountAlert>
        </div>
      ) : null}

      {error ? (
        <div style={{ marginBottom: 14 }}>
          <AccountAlert tone="danger">{error}</AccountAlert>
        </div>
      ) : null}

      {items.length === 0 ? (
        <AccountCard>
          <p style={{ margin: 0, color: 'var(--alv-muted)' }}>
            {locale === 'ru' ? 'Возвратов нет.' : 'Qaytarishlar yo‘q.'}
          </p>
          <Link
            href={`/${locale}/kabinet/buyurtmalar`}
            style={{ color: 'var(--alv-brand)', fontWeight: 700 }}
          >
            {locale === 'ru' ? 'К заказам →' : 'Buyurtmalarga →'}
          </Link>
        </AccountCard>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((r) => (
            <div
              key={r.id}
              style={{
                background: 'var(--alv-surface)',
                borderRadius: 'var(--alv-radius-lg)',
                padding: 16,
                boxShadow: 'var(--alv-shadow-sm)',
                display: 'flex',
                gap: 14,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 180px' }}>
                <strong style={{ fontSize: 15 }}>{r.number}</strong>
                <div style={{ fontSize: 12.5, color: 'var(--alv-muted)', marginTop: 2 }}>
                  {locale === 'ru' ? 'Заказ' : 'Buyurtma'} {r.orderNumber} ·{' '}
                  {fmtDate(r.createdAt)}
                </div>
              </div>

              <Badge tone={TONE[r.status] ?? 'neutral'}>{label(r.status)}</Badge>

              <strong style={{ whiteSpace: 'nowrap' }}>
                {formatPrice(r.refundAmount, locale === 'ru' ? 'RU' : 'UZ')}
              </strong>

              <Button variant="ghost" size="sm" onClick={() => void show(r.id)}>
                {locale === 'ru' ? 'Подробнее' : 'Batafsil'}
              </Button>
            </div>
          ))}
        </div>
      )}

      {open ? (
        <div style={{ marginTop: 18 }}>
          <AccountCard title={`${open.number} · ${label(open.status)}`}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
              {open.items.map((i) => (
                <li key={i.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      background: 'var(--alv-surface-2)',
                      overflow: 'hidden',
                      flexShrink: 0,
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
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{i.productName}</div>
                    <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                      {[i.variantName, `× ${i.quantity}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <strong style={{ whiteSpace: 'nowrap' }}>
                    {formatPrice(i.refundAmount, locale === 'ru' ? 'RU' : 'UZ')}
                  </strong>
                </li>
              ))}
            </ul>

            <div style={{ height: 1, background: 'var(--alv-line)' }} />

            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
            >
              <span style={{ fontWeight: 700 }}>
                {locale === 'ru' ? 'К возврату' : 'Qaytariladi'}
              </span>
              <strong style={{ fontSize: 20 }}>
                {formatPrice(open.refundAmount, locale === 'ru' ? 'RU' : 'UZ')}
              </strong>
            </div>

            {open.refundedAt ? (
              <AccountAlert tone="mint">
                {locale === 'ru'
                  ? `Деньги возвращены ${fmtDate(open.refundedAt)}. Зачисление 1–3 дня.`
                  : `Pul ${fmtDate(open.refundedAt)} da qaytarildi. Bankka tushishi 1–3 kun.`}
              </AccountAlert>
            ) : null}

            {open.receipts.find((r) => r.receiptUrl) ? (
              <a
                href={open.receipts.find((r) => r.receiptUrl)!.receiptUrl!}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 13, color: 'var(--alv-brand)', fontWeight: 700 }}
              >
                {locale === 'ru' ? 'Чек возврата' : 'Qaytarish cheki'}
              </a>
            ) : null}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['REQUESTED', 'APPROVED'].includes(open.status) ? (
                <Button variant="outline" disabled={busy} onClick={() => void cancel(open.id)}>
                  {locale === 'ru' ? 'Отменить запрос' : 'So‘rovni bekor qilish'}
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => setOpen(null)}>
                {locale === 'ru' ? 'Закрыть' : 'Yopish'}
              </Button>
            </div>
          </AccountCard>
        </div>
      ) : null}
    </>
  );
}
