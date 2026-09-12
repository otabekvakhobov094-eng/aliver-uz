'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Price } from '@aliver/ui';
import type { ProductVariant } from '@/lib/catalog-api';
import type { Locale } from '@/i18n/messages';
import { toSum, trackAddToCart } from '@/lib/pixel';
import { useCart } from './CartProvider';

/**
 * Variant tanlash va savatga qo'shish.
 *
 * Prototipdagi mahsulot sahifasiga mos: hajm tanlanganda narx va qoldiq
 * o'zgaradi. Qo'shilgandan keyin narx SAQLANMAYDI — savat har safar
 * joriy narxni serverdan oladi (ekspertiza A-5).
 */
export function ProductBuyBox({
  variants,
  locale,
}: {
  variants: ProductVariant[];
  locale: Locale;
}) {
  const firstAvailable = variants.findIndex((v) => v.availableStock > 0);
  const [index, setIndex] = useState(firstAvailable >= 0 ? firstAvailable : 0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const { add, busy, error, clearError } = useCart();

  const variant = variants[index];
  if (!variant) return null;

  const label = (v: ProductVariant) => Object.values(v.options).join(' / ') || v.sku;

  const outOfStock = variant.availableStock === 0;

  const onAdd = async () => {
    clearError();
    try {
      await add(variant.id, qty);
      setAdded(true);
      /*
       * «Savatga qo'shildi» — qo'shish MUVAFFAQIYATLI tugagandan keyin.
       *
       * Tugma bosilishi bilan yuborilsa, qoldiq yetmay xato bergan
       * urinishlar ham hodisa bo'lib hisoblanardi.
       */
      trackAddToCart({ id: variant.sku, quantity: qty, price: toSum(variant.price) });
    } catch {
      // Xato matni kontekstda saqlanadi va pastda ko'rsatiladi.
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Price
        value={variant.price}
        oldValue={variant.oldPrice}
        size="lg"
        locale={locale === 'ru' ? 'RU' : 'UZ'}
      />

      {variants.length > 1 ? (
        <div>
          <div
            style={{ fontSize: 13, fontWeight: 700, color: 'var(--alv-ink-2)', marginBottom: 8 }}
          >
            {locale === 'ru' ? 'Выберите вариант' : 'Variantni tanlang'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {variants.map((v, i) => {
              const disabled = v.availableStock === 0;
              const on = i === index;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    if (disabled) return;
                    setIndex(i);
                    /*
                     * Variant almashganda MIQDOR TIKLANADI.
                     *
                     * Ilgari u saqlanib qolardi: A variantida 10 ta
                     * tanlab, 2 tasi qolgan B variantiga o'tilsa,
                     * "Savatga qo'shish" 10 ta so'rardi. Server esa
                     * jimgina 2 taga qisqartirardi va mijoz 10 ta
                     * qo'shildi deb o'ylab qolardi.
                     */
                    setQty(1);
                    setAdded(false);
                  }}
                  disabled={disabled}
                  aria-pressed={on}
                  style={{
                    minHeight: 56,
                    minWidth: 96,
                    padding: '10px 16px',
                    borderRadius: 16,
                    border: 0,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: on ? 'var(--alv-brand-soft)' : 'var(--alv-surface)',
                    boxShadow: on
                      ? 'inset 0 0 0 2px var(--alv-brand)'
                      : 'inset 0 0 0 1.5px var(--alv-line-2)',
                    color: on ? 'var(--alv-brand-deep)' : 'var(--alv-ink)',
                    opacity: disabled ? 0.45 : 1,
                    textDecoration: disabled ? 'line-through' : 'none',
                    font: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 2,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{label(v)}</span>
                  <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 600 }}>
                    {Number(BigInt(v.price) / 100n)
                      .toLocaleString('ru-RU')
                      .replace(/ /g, ' ')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {outOfStock ? (
          <Badge tone="neutral">{locale === 'ru' ? 'Нет в наличии' : 'Sotuvda yo‘q'}</Badge>
        ) : variant.lowStock ? (
          <Badge tone="low">
            {locale === 'ru'
              ? `Осталось ${variant.availableStock}`
              : `Oz qoldi: ${variant.availableStock}`}
          </Badge>
        ) : (
          <Badge tone="mint">
            {locale === 'ru'
              ? `В наличии: ${variant.availableStock}`
              : `Sotuvda: ${variant.availableStock}`}
          </Badge>
        )}
        <Badge tone="neutral">SKU {variant.sku}</Badge>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            height: 52,
            borderRadius: 999,
            background: 'var(--alv-surface)',
            boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label={locale === 'ru' ? 'Уменьшить' : 'Kamaytirish'}
            style={{
              width: 52,
              height: 52,
              border: 0,
              background: 'none',
              cursor: 'pointer',
              fontSize: 20,
            }}
          >
            −
          </button>
          <span style={{ minWidth: 36, textAlign: 'center', fontWeight: 700 }}>{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(variant.availableStock || 1, q + 1))}
            aria-label={locale === 'ru' ? 'Увеличить' : 'Ko‘paytirish'}
            style={{
              width: 52,
              height: 52,
              border: 0,
              background: 'none',
              cursor: 'pointer',
              fontSize: 20,
            }}
          >
            +
          </button>
        </div>

        <Button
          variant="primary"
          size="lg"
          disabled={outOfStock || busy}
          onClick={() => void onAdd()}
          style={{ flexGrow: 1 }}
        >
          {outOfStock
            ? locale === 'ru'
              ? 'Нет в наличии'
              : 'Sotuvda yo‘q'
            : busy
              ? locale === 'ru'
                ? 'Добавляем…'
                : 'Qo‘shilmoqda…'
              : locale === 'ru'
                ? 'В корзину'
                : 'Savatga qo‘shish'}
        </Button>
      </div>

      {error ? (
        <p role="alert" style={{ fontSize: 13, color: 'var(--alv-danger)', margin: 0 }}>
          {error}
        </p>
      ) : null}

      {added && !error ? (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            padding: '12px 16px',
            borderRadius: 16,
            background: 'var(--alv-brand-soft)',
            color: 'var(--alv-brand-deep)',
            fontSize: 13.5,
            fontWeight: 700,
          }}
        >
          <span>{locale === 'ru' ? 'Добавлено в корзину' : 'Savatga qo‘shildi'}</span>
          <Link href={`/${locale}/savat`} style={{ textDecoration: 'underline' }}>
            {locale === 'ru' ? 'Перейти в корзину' : 'Savatga o‘tish'}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
