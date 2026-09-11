'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, formatPrice } from '@aliver/ui';
import { useCart } from './CartProvider';
import type { Locale } from '@/i18n/messages';

const money = (v: string, locale: Locale) => formatPrice(v, locale === 'ru' ? 'RU' : 'UZ');

function Notice({ tone, children }: { tone: 'warn' | 'danger'; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      style={{
        padding: '12px 16px',
        borderRadius: 14,
        fontSize: 13.5,
        fontWeight: 600,
        lineHeight: 1.5,
        background: tone === 'danger' ? 'var(--alv-danger-soft)' : 'var(--alv-warn-soft)',
        color: tone === 'danger' ? 'var(--alv-danger)' : 'var(--alv-warn)',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Savat sahifasi.
 *
 * Summalar SERVERDAN keladi — bu yerda hech narsa qayta hisoblanmaydi.
 * Shu sababli savatdagi narx checkout dagi narx bilan har doim bir xil
 * bo'ladi (ekspertiza A-5).
 */
export function CartView({ locale }: { locale: Locale }) {
  const { cart, ready, busy, error, update, remove, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState('');

  if (!ready) {
    return (
      <p style={{ color: 'var(--alv-muted)' }}>{locale === 'ru' ? 'Загрузка…' : 'Yuklanmoqda…'}</p>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div
        style={{
          background: 'var(--alv-surface)',
          borderRadius: 'var(--alv-radius-xl)',
          padding: '48px 24px',
          textAlign: 'center',
          boxShadow: 'var(--alv-shadow-sm)',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>
          🧺
        </div>
        <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 22, margin: '0 0 8px' }}>
          {locale === 'ru' ? 'Корзина пуста' : 'Savat bo‘sh'}
        </h2>
        <p style={{ color: 'var(--alv-muted)', margin: '0 0 20px', fontSize: 14 }}>
          {locale === 'ru'
            ? 'Выберите средства по типу кожи или волос — мы поможем подобрать.'
            : 'Teri yoki soch turingizga mos vositalarni tanlang — tanlashda yordam beramiz.'}
        </p>
        <Link href={`/${locale}/katalog`}>
          <Button variant="primary" size="lg">
            {locale === 'ru' ? 'Перейти в каталог' : 'Katalogga o‘tish'}
          </Button>
        </Link>
      </div>
    );
  }

  const hasBlocking = cart.items.some((i) => i.exceedsStock);

  return (
    <div className="alv-shop-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cart.warnings.map((w) => (
          <Notice key={w} tone="warn">
            {w}
          </Notice>
        ))}
        {error ? <Notice tone="danger">{error}</Notice> : null}

        {cart.items.map((item) => (
          <div
            key={item.itemId}
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
              background: 'var(--alv-surface)',
              borderRadius: 'var(--alv-radius-lg)',
              padding: 16,
              boxShadow: 'var(--alv-shadow-sm)',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 16,
                background: 'var(--alv-surface-2)',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  width={88}
                  height={88}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              ) : null}
            </div>

            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <Link
                href={`/${locale}/mahsulot/${item.slug}`}
                style={{ fontWeight: 700, fontSize: 15, color: 'var(--alv-ink)' }}
              >
                {locale === 'ru' ? item.nameRu : item.nameUz}
              </Link>
              <div style={{ fontSize: 13, color: 'var(--alv-muted)', marginTop: 4 }}>
                {item.variantLabel}
              </div>

              {item.exceedsStock ? (
                <div style={{ marginTop: 8 }}>
                  <Notice tone="danger">
                    {locale === 'ru'
                      ? `В наличии только ${item.availableStock} шт. Уменьшите количество.`
                      : `Omborda ${item.availableStock} dona qoldi. Miqdorni kamaytiring.`}
                  </Notice>
                </div>
              ) : null}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 44,
                    borderRadius: 999,
                    boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void update(item.itemId, item.quantity - 1)}
                    aria-label={locale === 'ru' ? 'Уменьшить количество' : 'Miqdorni kamaytirish'}
                    style={{
                      width: 44,
                      height: 44,
                      border: 0,
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: 18,
                    }}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 700 }}>
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    disabled={busy || item.quantity >= item.availableStock}
                    onClick={() => void update(item.itemId, item.quantity + 1)}
                    aria-label={locale === 'ru' ? 'Увеличить количество' : 'Miqdorni ko‘paytirish'}
                    style={{
                      width: 44,
                      height: 44,
                      border: 0,
                      background: 'none',
                      cursor: 'pointer',
                      fontSize: 18,
                      opacity: item.quantity >= item.availableStock ? 0.4 : 1,
                    }}
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(item.itemId)}
                  style={{
                    minHeight: 44,
                    padding: '0 12px',
                    border: 0,
                    background: 'none',
                    color: 'var(--alv-muted)',
                    fontWeight: 600,
                    fontSize: 13.5,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {locale === 'ru' ? 'Удалить' : 'O‘chirish'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', minWidth: 120 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{money(item.lineTotal, locale)}</div>
              {item.oldUnitPrice ? (
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--alv-muted)',
                    textDecoration: 'line-through',
                    marginTop: 2,
                  }}
                >
                  {money((BigInt(item.oldUnitPrice) * BigInt(item.quantity)).toString(), locale)}
                </div>
              ) : null}
              {BigInt(item.discountAmount) > 0n ? (
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--alv-mint)',
                    fontWeight: 700,
                    marginTop: 2,
                  }}
                >
                  −{money(item.discountAmount, locale)}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <aside
        style={{
          background: 'var(--alv-surface)',
          borderRadius: 'var(--alv-radius-xl)',
          padding: 20,
          boxShadow: 'var(--alv-shadow-md)',
          alignSelf: 'start',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 18, margin: 0 }}>
          {locale === 'ru' ? 'Итого' : 'Jami'}
        </h2>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={locale === 'ru' ? 'Промокод' : 'Promo-kod'}
            aria-label={locale === 'ru' ? 'Промокод' : 'Promo-kod'}
            style={{
              flexGrow: 1,
              minWidth: 0,
              height: 44,
              padding: '0 14px',
              borderRadius: 12,
              border: 0,
              boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
              font: 'inherit',
              textTransform: 'uppercase',
            }}
          />
          <Button
            variant="ghost"
            disabled={busy || code.trim().length < 2}
            onClick={() => void applyCoupon(code.trim())}
          >
            {locale === 'ru' ? 'Применить' : 'Qo‘llash'}
          </Button>
        </div>

        {cart.couponError ? <Notice tone="danger">{cart.couponError}</Notice> : null}

        {cart.couponCode && !cart.couponError ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--alv-mint)' }}>
              {cart.couponCode} {locale === 'ru' ? 'применён' : 'qo‘llandi'}
            </span>
            <button
              type="button"
              onClick={() => void removeCoupon()}
              style={{
                minHeight: 44,
                border: 0,
                background: 'none',
                color: 'var(--alv-muted)',
                cursor: 'pointer',
                fontSize: 13,
                textDecoration: 'underline',
              }}
            >
              {locale === 'ru' ? 'Убрать' : 'Olib tashlash'}
            </button>
          </div>
        ) : null}

        <Row
          label={locale === 'ru' ? 'Товары' : 'Mahsulotlar'}
          value={money(cart.subtotal, locale)}
        />
        {BigInt(cart.discountTotal) > 0n ? (
          <Row
            label={locale === 'ru' ? 'Скидка' : 'Chegirma'}
            value={`−${money(cart.discountTotal, locale)}`}
            tone="mint"
          />
        ) : null}
        <Row
          label={locale === 'ru' ? 'Доставка' : 'Yetkazib berish'}
          value={locale === 'ru' ? 'на след. шаге' : 'keyingi qadamda'}
          muted
        />
        <div style={{ height: 1, background: 'var(--alv-line)' }} />
        <Row
          label={locale === 'ru' ? 'К оплате' : 'To‘lov uchun'}
          value={money(cart.grandTotal, locale)}
          big
        />
        <p style={{ fontSize: 12, color: 'var(--alv-muted)', margin: 0 }}>
          {locale === 'ru'
            ? `В сумме учтён НДС ${money(cart.vatTotal, 'ru')}`
            : `Summaga QQS kiritilgan: ${money(cart.vatTotal, locale)}`}
        </p>

        {hasBlocking ? (
          <Notice tone="danger">
            {locale === 'ru'
              ? 'Исправьте количество товаров, чтобы продолжить.'
              : 'Davom etish uchun mahsulot miqdorini tuzating.'}
          </Notice>
        ) : null}

        {/* Qoldiq muammosi bo'lsa havola umuman bo'lmaydi: "o'chirilgan"
            ko'rinishdagi tugmani bosib ketib qolish mumkin bo'lmasin. */}
        {hasBlocking ? (
          <Button variant="primary" size="lg" disabled fullWidth>
            {locale === 'ru' ? 'Оформить заказ' : 'Buyurtmani rasmiylashtirish'}
          </Button>
        ) : (
          <Link href={`/${locale}/checkout`} style={{ display: 'block' }}>
            <Button variant="primary" size="lg" disabled={busy} fullWidth>
              {locale === 'ru' ? 'Оформить заказ' : 'Buyurtmani rasmiylashtirish'}
            </Button>
          </Link>
        )}

        <Link
          href={`/${locale}/katalog`}
          style={{ fontSize: 13.5, color: 'var(--alv-muted)', textAlign: 'center' }}
        >
          {locale === 'ru' ? 'Продолжить покупки' : 'Xaridni davom ettirish'}
        </Link>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  big,
  tone,
}: {
  label: string;
  value: string;
  muted?: boolean;
  big?: boolean;
  tone?: 'mint';
}) {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}
    >
      <span
        style={{
          fontSize: big ? 15 : 13.5,
          color: 'var(--alv-ink-2)',
          fontWeight: big ? 700 : 600,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: big ? 20 : 14,
          fontWeight: big ? 800 : 700,
          color:
            tone === 'mint' ? 'var(--alv-mint)' : muted ? 'var(--alv-muted)' : 'var(--alv-ink)',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  );
}
