'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatPrice } from '@aliver/ui';
import { shopApi, type LoyaltyBalance, type LoyaltyQuote } from '@/lib/shop-api';
import type { Locale } from '@/i18n/messages';

/**
 * Checkout'da ball ishlatish — TZ-3.
 *
 * «Ikki valyuta» shu yerda ko'rinadi: mijoz ball kiritadi, lekin uning
 * SO'MDAGI qiymati darhol yoziladi. Faqat ball ko'rsatish mijozga hech
 * narsa demaydi — «1 250 ball» qancha ekanini u bilmaydi va shuning
 * uchun ishlatmaydi ham.
 *
 * Chegara SERVERDAN so'raladi, mijozda hisoblanmaydi: brauzerdagi
 * hisob faqat qulaylik, uni chetlab o'tish oson, va ikki joyda ikki
 * xil formula bo'lib qolishi ham vaqt masalasi.
 */

interface Props {
  locale: Locale;
  /** Chegirmadan keyingi mahsulot summasi, tiyinda. */
  subtotalAfterDiscount: string;
  value: number;
  onChange: (points: number, amount: string) => void;
}

export function LoyaltyRedeem({ locale, subtotalAfterDiscount, value, onChange }: Props) {
  const ru = locale === 'ru';
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null);
  const [quote, setQuote] = useState<LoyaltyQuote | null>(null);
  const [raw, setRaw] = useState(String(value || ''));

  useEffect(() => {
    // Mehmon uchun 403 keladi — blok shunchaki ko'rinmaydi.
    shopApi.loyaltyBalance().then(setBalance).catch(() => setBalance(null));
  }, []);

  const ask = useCallback(
    async (points: number) => {
      try {
        const q = await shopApi.loyaltyQuote(subtotalAfterDiscount, points);
        setQuote(q);
        onChange(q.points, q.amount);
      } catch {
        setQuote(null);
        onChange(0, '0');
      }
    },
    [subtotalAfterDiscount, onChange],
  );

  // Summa o'zgarsa chegara ham o'zgaradi — qayta so'raymiz.
  useEffect(() => {
    if (!balance || balance.points <= 0) return;
    const n = Number(raw) || 0;
    const t = setTimeout(() => void ask(n), 300);
    return () => clearTimeout(t);
  }, [raw, balance, ask]);

  if (!balance || balance.points <= 0) return null;

  const max = quote?.maxPoints ?? 0;
  const applied = quote?.points ?? 0;

  return (
    <section
      className="alv-card"
      style={{ padding: 16, display: 'grid', gap: 10 }}
      aria-label={ru ? 'Бонусные баллы' : 'Bonus ballar'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 15 }}>{ru ? 'Бонусные баллы' : 'Bonus ballar'}</strong>
        <span style={{ fontSize: 14, color: 'var(--alv-ink-2)' }}>
          {balance.points} {ru ? 'б.' : 'ball'} ={' '}
          {formatPrice(balance.amount, ru ? 'RU' : 'UZ')}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          id="loyalty-points"
          type="number"
          min={0}
          max={max}
          inputMode="numeric"
          value={raw}
          onChange={(e) => setRaw(e.target.value.replace(/\D/g, ''))}
          aria-label={ru ? 'Сколько баллов списать' : 'Nechta ball ishlatilsin'}
          style={{
            width: 120,
            padding: '9px 12px',
            borderRadius: 10,
            border: '1px solid var(--alv-line-2)',
            fontSize: 15,
            background: 'var(--alv-surface)',
            color: 'var(--alv-ink)',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={() => setRaw(String(max))}
          disabled={max === 0}
          style={{
            padding: '9px 14px',
            borderRadius: 10,
            border: '1px solid var(--alv-line-2)',
            background: 'var(--alv-surface)',
            color: 'var(--alv-ink)',
            fontSize: 14,
            cursor: max === 0 ? 'default' : 'pointer',
            font: 'inherit',
            opacity: max === 0 ? 0.5 : 1,
          }}
        >
          {ru ? `Максимум (${max})` : `Ko‘pi bilan (${max})`}
        </button>
      </div>

      {applied > 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--alv-mint)', fontWeight: 600 }}>
          −{formatPrice(quote!.amount, ru ? 'RU' : 'UZ')}
        </p>
      ) : null}

      {/* Nega so'ralgandan kam berilgani AYTILADI. «Kiritdim, lekin
          chegirma boshqacha» degan holat eng ko'p shikoyat sababi. */}
      {quote?.reason === 'balance' ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-warn)' }}>
          {ru ? 'Больше баллов на счету нет.' : 'Hisobingizda bundan ko‘p ball yo‘q.'}
        </p>
      ) : null}
      {quote?.reason === 'cap' ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-warn)' }}>
          {ru
            ? `Баллами можно оплатить не более ${balance.rate.maxRedeemSharePercent}% заказа.`
            : `Ballar bilan buyurtmaning ko‘pi bilan ${balance.rate.maxRedeemSharePercent}% qismini qoplash mumkin.`}
        </p>
      ) : null}
      {quote?.reason === 'nothing' ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
          {ru ? 'В этом заказе баллы применить нельзя.' : 'Bu buyurtmada ball ishlatib bo‘lmaydi.'}
        </p>
      ) : null}

      {balance.expiresAt ? (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--alv-muted)' }}>
          {ru ? 'Сгорают ' : 'Kuyish sanasi: '}
          {new Date(balance.expiresAt).toLocaleDateString(ru ? 'ru-RU' : 'uz-UZ')}
        </p>
      ) : null}
    </section>
  );
}
