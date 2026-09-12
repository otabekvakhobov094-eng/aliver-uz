'use client';

import Link from 'next/link';
import { fmtDateLong, fmtDateTime as fmtDateTimeShared } from '@/lib/format-date';
import { useEffect, useState } from 'react';
import { Button, formatPrice } from '@aliver/ui';
import { ShopError, shopApi, type OrderView } from '@/lib/shop-api';
import type { Locale } from '@/i18n/messages';

const money = (v: string, locale: Locale) => formatPrice(v, locale === 'ru' ? 'RU' : 'UZ');

/** Status nomlari — mijozga tushunarli tilda, ichki kodlar emas. */
export const STATUS_LABEL: Record<string, { uz: string; ru: string }> = {
  NEW: { uz: 'Qabul qilindi', ru: 'Принят' },
  CONFIRMED: { uz: 'Tasdiqlandi', ru: 'Подтверждён' },
  PROCESSING: { uz: 'Tayyorlanmoqda', ru: 'В обработке' },
  PACKING: { uz: 'Qadoqlanmoqda', ru: 'Упаковывается' },
  READY: { uz: 'Jo‘natishga tayyor', ru: 'Готов к отправке' },
  SHIPPED: { uz: 'Yo‘lda', ru: 'В пути' },
  DELIVERED: { uz: 'Yetkazildi', ru: 'Доставлен' },
  CANCELLED: { uz: 'Bekor qilindi', ru: 'Отменён' },
  RETURN_REQUESTED: { uz: 'Qaytarish so‘raldi', ru: 'Запрошен возврат' },
  RETURNED: { uz: 'Qaytarildi', ru: 'Возвращён' },
  REFUNDED: { uz: 'Pul qaytarildi', ru: 'Деньги возвращены' },
};

const PAYMENT_LABEL: Record<string, { uz: string; ru: string }> = {
  PENDING: { uz: 'To‘lov kutilmoqda', ru: 'Ожидает оплаты' },
  WAITING: { uz: 'To‘lov tekshirilmoqda', ru: 'Проверяется' },
  PAID: { uz: 'To‘langan', ru: 'Оплачен' },
  FAILED: { uz: 'To‘lov amalga oshmadi', ru: 'Оплата не прошла' },
  CANCELLED: { uz: 'Bekor qilindi', ru: 'Отменён' },
  REFUNDED: { uz: 'Qaytarildi', ru: 'Возвращён' },
  PARTIALLY_REFUNDED: { uz: 'Qisman qaytarildi', ru: 'Частично возвращён' },
};

const label = (map: typeof STATUS_LABEL, key: string, locale: Locale) =>
  map[key] ? (locale === 'ru' ? map[key]!.ru : map[key]!.uz) : key;

/** Rezerv tugashigacha qolgan vaqt — onlayn to'lovda muhim. */
function Countdown({ until, locale }: { until: string; locale: Locale }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(until).getTime() - Date.now()));

  useEffect(() => {
    const id = setInterval(
      () => setLeft(Math.max(0, new Date(until).getTime() - Date.now())),
      1000,
    );
    return () => clearInterval(id);
  }, [until]);

  if (left <= 0) {
    return <span>{locale === 'ru' ? 'Время резерва истекло' : 'Rezerv muddati tugadi'}</span>;
  }

  const mm = String(Math.floor(left / 60000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  return (
    <span>
      {locale === 'ru' ? 'Товар зарезервирован ещё ' : 'Tovar yana '}
      <strong>
        {mm}:{ss}
      </strong>
      {locale === 'ru' ? '' : ' band turadi'}
    </span>
  );
}

export function OrderStatusView({
  order,
  locale,
  variant = 'track',
}: {
  order: OrderView;
  locale: Locale;
  variant?: 'success' | 'track';
}) {
  const cancelled = order.status === 'CANCELLED';
  const showReservation =
    !cancelled && order.reservationExpiresAt !== null && order.paymentStatus !== 'PAID';

  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const pay = async () => {
    setPayBusy(true);
    setPayError(null);
    try {
      const link = await shopApi.startPayment(order.id);
      if (link.url) {
        window.location.href = link.url;
        return;
      }
      setPayError(locale === 'ru' ? 'Ссылка на оплату недоступна' : 'To‘lov havolasi mavjud emas');
    } catch (e) {
      setPayError(e instanceof ShopError ? e.message : 'Xatolik');
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {variant === 'success' ? (
        <div
          style={{
            background: 'var(--alv-brand-soft)',
            borderRadius: 'var(--alv-radius-xl)',
            padding: '28px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40 }} aria-hidden>
            ✓
          </div>
          <h1
            style={{
              fontFamily: 'var(--alv-font-display)',
              fontSize: 26,
              margin: '8px 0 6px',
              color: 'var(--alv-brand-deep)',
            }}
          >
            {locale === 'ru' ? 'Заказ принят' : 'Buyurtma qabul qilindi'}
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--alv-ink-2)' }}>
            {locale === 'ru' ? 'Номер заказа' : 'Buyurtma raqami'}:{' '}
            <strong style={{ fontSize: 17 }}>{order.number}</strong>
          </p>
          <p
            style={{
              margin: '10px 0 0',
              fontSize: 13.5,
              color: 'var(--alv-ink-2)',
              lineHeight: 1.55,
            }}
          >
            {locale === 'ru'
              ? `Мы отправили подтверждение на ${order.contactPhone}. Оператор свяжется с вами для подтверждения.`
              : `Tasdiqni ${order.contactPhone} raqamiga yubordik. Operator siz bilan bog‘lanadi.`}
          </p>
        </div>
      ) : (
        <div
          style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
        >
          <h1 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 24, margin: 0 }}>
            {order.number}
          </h1>
          <span
            style={{
              alignSelf: 'center',
              padding: '6px 14px',
              borderRadius: 999,
              background: cancelled ? 'var(--alv-danger-soft)' : 'var(--alv-mint-soft)',
              color: cancelled ? 'var(--alv-danger)' : 'var(--alv-mint)',
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {label(STATUS_LABEL, order.status, locale)}
          </span>
        </div>
      )}

      {order.canPay ? (
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            padding: 16,
            borderRadius: 'var(--alv-radius-lg)',
            background: 'var(--alv-surface)',
            boxShadow: 'var(--alv-shadow-sm)',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--alv-ink-2)' }}>
            {locale === 'ru' ? 'Заказ ожидает оплаты.' : 'Buyurtma to‘lov kutmoqda.'}
          </span>
          <Button variant="primary" disabled={payBusy} onClick={() => void pay()}>
            {payBusy
              ? locale === 'ru'
                ? 'Открываем…'
                : 'Ochilmoqda…'
              : locale === 'ru'
                ? 'Оплатить'
                : 'To‘lash'}
          </Button>
        </div>
      ) : null}

      {payError ? (
        <p role="alert" style={{ margin: 0, color: 'var(--alv-danger)', fontSize: 13.5 }}>
          {payError}
        </p>
      ) : null}

      {showReservation ? (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            background: 'var(--alv-warn-soft)',
            color: 'var(--alv-warn)',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          <Countdown until={order.reservationExpiresAt!} locale={locale} />
        </div>
      ) : null}

      <div className="alv-shop-grid">
        <div style={{ display: 'grid', gap: 16 }}>
          <Card title={locale === 'ru' ? 'Состав заказа' : 'Buyurtma tarkibi'}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {order.items.map((i) => (
                <li key={i.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 12,
                      background: 'var(--alv-surface-2)',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {i.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={i.imageUrl}
                        alt=""
                        width={56}
                        height={56}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    ) : null}
                  </div>
                  <div style={{ flexGrow: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{i.productName}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>
                      {[i.variantName, `× ${i.quantity}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {money(i.lineTotal, locale)}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={locale === 'ru' ? 'Доставка' : 'Yetkazib berish'}>
            <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: 13.5 }}>
              <Line
                k={locale === 'ru' ? 'Способ' : 'Usul'}
                v={(locale === 'ru' ? order.delivery.nameRu : order.delivery.nameUz) ?? '—'}
              />
              <Line
                k={locale === 'ru' ? 'Адрес' : 'Manzil'}
                v={[
                  order.delivery.regionName,
                  order.delivery.districtName,
                  order.delivery.addressLine,
                ]
                  .filter(Boolean)
                  .join(', ')}
              />
              {order.delivery.etaFrom ? (
                <Line
                  k={locale === 'ru' ? 'Ожидаемая дата' : 'Taxminiy sana'}
                  v={`${fmtDate(order.delivery.etaFrom, locale)} — ${fmtDate(order.delivery.etaTo, locale)}`}
                />
              ) : null}
              <Line
                k={locale === 'ru' ? 'Оплата' : 'To‘lov'}
                v={label(PAYMENT_LABEL, order.paymentStatus, locale)}
              />
            </dl>
          </Card>

          {order.shipment ? (
            <Card title={locale === 'ru' ? 'Курьер' : 'Kuryer'}>
              <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: 13.5 }}>
                {order.shipment.courierName ? (
                  <Line k={locale === 'ru' ? 'Имя' : 'Ism'} v={order.shipment.courierName} />
                ) : null}
                {order.shipment.courierPhone ? (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      fontSize: 13.5,
                    }}
                  >
                    <span style={{ color: 'var(--alv-muted)', fontWeight: 600 }}>
                      {locale === 'ru' ? 'Телефон' : 'Telefon'}
                    </span>
                    {/* Mijoz kuryerga to'g'ridan-to'g'ri qo'ng'iroq qila olishi kerak. */}
                    <a
                      href={`tel:${order.shipment.courierPhone.replace(/\s/g, '')}`}
                      style={{ fontWeight: 700, color: 'var(--alv-brand)' }}
                    >
                      {order.shipment.courierPhone}
                    </a>
                  </div>
                ) : null}
                {order.shipment.trackingNo ? (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      fontSize: 13.5,
                    }}
                  >
                    <span style={{ color: 'var(--alv-muted)', fontWeight: 600 }}>
                      {locale === 'ru' ? 'Трек-номер' : 'Trek raqami'}
                    </span>
                    {order.shipment.trackUrl ? (
                      <a
                        href={order.shipment.trackUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontWeight: 700, color: 'var(--alv-brand)' }}
                      >
                        {order.shipment.trackingNo}
                      </a>
                    ) : (
                      <span style={{ fontWeight: 700 }}>{order.shipment.trackingNo}</span>
                    )}
                  </div>
                ) : null}
                {order.shipment.shippedAt ? (
                  <Line
                    k={locale === 'ru' ? 'Отправлен' : 'Jo‘natildi'}
                    v={fmtDateTime(order.shipment.shippedAt, locale)}
                  />
                ) : null}
              </dl>
            </Card>
          ) : null}

          <Card title={locale === 'ru' ? 'История' : 'Tarix'}>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {order.timeline.map((s, idx) => (
                <li key={`${s.status}-${idx}`} style={{ display: 'flex', gap: 12 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: 'var(--alv-brand)',
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                      {label(STATUS_LABEL, s.status, locale)}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>
                      {fmtDateTime(s.at, locale)}
                      {s.comment ? ` · ${s.comment}` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside
          style={{
            background: 'var(--alv-surface)',
            borderRadius: 'var(--alv-radius-xl)',
            padding: 20,
            boxShadow: 'var(--alv-shadow-md)',
            display: 'grid',
            gap: 10,
            alignSelf: 'start',
          }}
        >
          <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 17, margin: 0 }}>
            {locale === 'ru' ? 'Сумма' : 'Summa'}
          </h2>
          <Line
            k={locale === 'ru' ? 'Товары' : 'Mahsulotlar'}
            v={money(order.totals.subtotal, locale)}
          />
          {BigInt(order.totals.discountTotal) > 0n ? (
            <Line
              k={locale === 'ru' ? 'Скидка' : 'Chegirma'}
              v={`−${money(order.totals.discountTotal, locale)}`}
            />
          ) : null}
          <Line
            k={locale === 'ru' ? 'Доставка' : 'Yetkazib berish'}
            v={
              BigInt(order.totals.shippingTotal) === 0n
                ? locale === 'ru'
                  ? 'Бесплатно'
                  : 'Bepul'
                : money(order.totals.shippingTotal, locale)
            }
          />
          <div style={{ height: 1, background: 'var(--alv-line)' }} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 12,
            }}
          >
            <span style={{ fontWeight: 700 }}>{locale === 'ru' ? 'Итого' : 'Jami'}</span>
            <span style={{ fontWeight: 800, fontSize: 22 }}>
              {money(order.totals.grandTotal, locale)}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--alv-muted)', margin: 0 }}>
            {locale === 'ru'
              ? `НДС в сумме: ${money(order.totals.vatTotal, 'ru')}`
              : `Summadagi QQS: ${money(order.totals.vatTotal, locale)}`}
          </p>

          {order.status === 'DELIVERED' ? (
            <Link
              href={`/${locale}/qaytarish/${order.id}`}
              style={{ fontSize: 13.5, color: 'var(--alv-ink-2)', textDecoration: 'underline' }}
            >
              {locale === 'ru' ? 'Вернуть товар' : 'Tovarni qaytarish'}
            </Link>
          ) : null}

          {order.receipt?.url ? (
            <a
              href={order.receipt.url}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13, color: 'var(--alv-ink-2)', textDecoration: 'underline' }}
            >
              {locale === 'ru' ? 'Фискальный чек' : 'Fiskal chek'}
              {order.receipt.fiscalSign ? ` · ${order.receipt.fiscalSign}` : ''}
            </a>
          ) : null}

          <Link
            href={`/${locale}/katalog`}
            style={{ fontSize: 13.5, color: 'var(--alv-brand)', fontWeight: 700, marginTop: 6 }}
          >
            {locale === 'ru' ? 'Продолжить покупки →' : 'Xaridni davom ettirish →'}
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--alv-surface)',
        borderRadius: 'var(--alv-radius-xl)',
        padding: 20,
        boxShadow: 'var(--alv-shadow-sm)',
        display: 'grid',
        gap: 14,
      }}
    >
      <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 17, margin: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5 }}>
      <span style={{ color: 'var(--alv-muted)', fontWeight: 600 }}>{k}</span>
      <span style={{ fontWeight: 700, textAlign: 'right' }}>{v}</span>
    </div>
  );
}

/*
 * Sana formatlari `@/lib/format-date` da — ICU ga bog'liq emas.
 * `toLocaleDateString('uz-UZ', { month: 'long' })` to'liq ICU
 * bo'lmagan qurilishda «2026 M08 14» beradi.
 */
function fmtDate(v: string | null, locale: Locale): string {
  return fmtDateLong(v, locale === 'ru');
}

function fmtDateTime(v: string, locale: Locale): string {
  void locale;
  return fmtDateTimeShared(v);
}
