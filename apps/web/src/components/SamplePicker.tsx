'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatPrice } from '@aliver/ui';
import { shopApi, type Cart, type SampleOption } from '@/lib/shop-api';
import type { Locale } from '@/i18n/messages';

/**
 * Savatdagi namuna tanlovi — TZ-3.
 *
 * Naqsh go'zallik savdosida standart (Sephora, Cult Beauty, Douglas)
 * va sababi oddiy: u o'rtacha chekni ko'taradi, chunki mijoz ostonaga
 * yetish uchun yana bitta narsa qo'shadi.
 *
 * Ikkita qaror ataylab shunday:
 *
 *   1. Ostonaga yetmagan savatda blok YASHIRILMAYDI, progress chizig'i
 *      bilan ko'rsatiladi. Yashirilsa mijoz bunday imkoniyat borligini
 *      bilmaydi va butun mexanizm ishlamaydi.
 *   2. Tugagan namuna ro'yxatda umuman chiqmaydi. Bepul narsani tanlab,
 *      keyin «yo'q ekan» degan xabar olish eng yomon tajriba.
 */

interface Props {
  cart: Cart;
  locale: Locale;
  onChange: (cart: Cart) => void;
}

export function SamplePicker({ cart, locale, onChange }: Props) {
  const ru = locale === 'ru';
  const [options, setOptions] = useState<SampleOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOptions(await shopApi.samples());
    } catch {
      // Namunalar yuklanmasa blok shunchaki ko'rinmaydi — bu savatni
      // buzmasligi kerak.
      setOptions([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function choose(variantId: string | null) {
    setBusy(true);
    setError(null);
    try {
      onChange(await shopApi.chooseSample(variantId));
    } catch (e) {
      setError(e instanceof Error ? e.message : ru ? 'Не удалось' : 'Bajarilmadi');
    } finally {
      setBusy(false);
    }
  }

  // Umuman namuna yo'q bo'lsa blok ham yo'q — bo'sh va'da bermaymiz.
  if (options.length === 0) return null;

  const s = cart.sample;
  const pct = Math.round(s.progress * 100);

  return (
    <section
      className="alv-card"
      style={{ padding: 18, marginTop: 16 }}
      aria-label={ru ? 'Пробник в подарок' : 'Sovg‘a namuna'}
    >
      <h2 style={{ margin: '0 0 4px', fontSize: 16 }}>
        {s.unlocked
          ? ru
            ? 'Выберите пробник в подарок'
            : 'Sovg‘a namunani tanlang'
          : ru
            ? 'Пробник в подарок'
            : 'Sovg‘aga namuna'}
      </h2>

      {s.unlocked ? (
        <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--alv-ink-2)' }}>
          {ru ? 'Один пробник бесплатно к вашему заказу.' : 'Buyurtmangizga bitta namuna bepul.'}
        </p>
      ) : (
        <>
          <p style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--alv-ink-2)' }}>
            {ru ? 'Добавьте ещё на ' : 'Yana '}
            <strong>{formatPrice(s.remaining, ru ? 'RU' : 'UZ')}</strong>
            {ru ? ' — и пробник ваш.' : ' qo‘shsangiz namuna bepul.'}
          </p>
          {/* Progress chizig'i: ostonaga yetish istagini aniq qiladi. */}
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={ru ? 'До пробника' : 'Namunagacha'}
            style={{
              height: 8,
              borderRadius: 4,
              background: 'var(--alv-line)',
              overflow: 'hidden',
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: 'var(--alv-brand)',
                transition: 'width .35s ease',
              }}
            />
          </div>
        </>
      )}

      {error ? (
        <p role="alert" style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--alv-danger)' }}>
          {error}
        </p>
      ) : null}

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10,
          // Ochilmagan bo'lsa ro'yxat ko'rinadi, lekin bosilmaydi:
          // mijoz NIMA olishini biladi va bu ostonaga yetish sababi.
          opacity: s.unlocked ? 1 : 0.55,
        }}
      >
        {options.map((o) => {
          const on = cart.sample.selectedVariantId === o.variantId;
          return (
            <li key={o.variantId}>
              <button
                type="button"
                disabled={!s.unlocked || busy}
                onClick={() => void choose(on ? null : o.variantId)}
                aria-pressed={on}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: 10,
                  borderRadius: 12,
                  border: `1.5px solid ${on ? 'var(--alv-brand)' : 'var(--alv-line-2)'}`,
                  background: on ? 'var(--alv-surface-2)' : 'var(--alv-surface)',
                  cursor: s.unlocked && !busy ? 'pointer' : 'default',
                  font: 'inherit',
                  color: 'inherit',
                  display: 'grid',
                  gap: 8,
                }}
              >
                {o.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={o.imageUrl}
                    alt=""
                    loading="lazy"
                    style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      objectFit: 'cover',
                      borderRadius: 8,
                      maxWidth: '100%',
                    }}
                  />
                ) : (
                  <span
                    aria-hidden
                    style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: 8,
                      background: 'var(--alv-surface-2)',
                      display: 'block',
                    }}
                  />
                )}
                <span style={{ fontSize: 13.5, fontWeight: on ? 700 : 500, lineHeight: 1.4 }}>
                  {ru ? o.nameRu : o.nameUz}
                </span>
                {on ? (
                  <span style={{ fontSize: 12, color: 'var(--alv-brand)', fontWeight: 700 }}>
                    ✓ {ru ? 'Выбрано' : 'Tanlandi'}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
