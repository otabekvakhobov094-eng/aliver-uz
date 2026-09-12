'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatPrice } from '@aliver/ui';
import Link from 'next/link';
import { ShopError, shopApi, type LoyaltyBalance, type LoyaltyEntry } from '@/lib/shop-api';
import type { Locale } from '@/i18n/messages';

/**
 * Kabinetdagi ball sahifasi — TZ-3.
 *
 * Tarix TO'LIQ ko'rsatiladi va bu ataylab: ball pul kabi narsa va
 * «balansim nega kamaydi?» degan savolga javob har doim ko'rinib
 * turishi kerak. Faqat raqam ko'rsatuvchi dastur ishonch uyg'otmaydi.
 */

const KIND: Record<string, { uz: string; ru: string }> = {
  EARN: { uz: 'Buyurtma uchun', ru: 'За заказ' },
  REDEEM: { uz: 'Buyurtmada ishlatildi', ru: 'Списано в заказе' },
  EXPIRE: { uz: 'Muddati o‘tdi', ru: 'Сгорело' },
  ADJUST: { uz: 'Qo‘lda to‘g‘rilandi', ru: 'Корректировка' },
  REVERSAL: { uz: 'Buyurtma bekor qilindi', ru: 'Заказ отменён' },
};

export function AccountLoyalty({ locale }: { locale: Locale }) {
  const ru = locale === 'ru';
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null);
  const [history, setHistory] = useState<LoyaltyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  /*
   * Xatolik TURI saqlanadi, shunchaki «failed» bayrog'i emas.
   *
   * Ilgari har qanday xato «Yuklab bo'lmadi» degan bir qatorga
   * aylanardi. Lekin eng ko'p uchraydigan sabab — seans tugagani, ya'ni
   * 401. Bunda mijozga «yuklab bo'lmadi» deyish yolg'on: hech narsa
   * buzilmagan, shunchaki qayta kirish kerak. U esa sahifani qayta
   * yuklab, yana o'sha yozuvni ko'rardi.
   */
  const [problem, setProblem] = useState<'none' | 'auth' | 'network'>('none');

  const load = useCallback(async () => {
    setLoading(true);
    setProblem('none');
    try {
      const [b, h] = await Promise.all([shopApi.loyaltyBalance(), shopApi.loyaltyHistory()]);
      setBalance(b);
      setHistory(h);
    } catch (e) {
      setProblem(e instanceof ShopError && (e.status === 401 || e.status === 403) ? 'auth' : 'network');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p style={{ color: 'var(--alv-muted)' }}>{ru ? 'Загрузка…' : 'Yuklanmoqda…'}</p>;

  if (problem === 'auth') {
    return (
      <div className="alv-card" style={{ padding: 22, display: 'grid', gap: 12, justifyItems: 'start' }}>
        <p style={{ margin: 0, color: 'var(--alv-ink-2)', lineHeight: 1.6 }}>
          {ru
            ? 'Сессия истекла. Войдите снова, чтобы увидеть баллы.'
            : 'Seans tugadi. Ballaringizni ko‘rish uchun qaytadan kiring.'}
        </p>
        <Link href={`/${locale}/kirish`} className="alv-btn alv-btn--primary alv-btn--md">
          {ru ? 'Войти' : 'Kirish'}
        </Link>
      </div>
    );
  }

  if (problem === 'network' || !balance) {
    return (
      <div className="alv-card" style={{ padding: 22, display: 'grid', gap: 12, justifyItems: 'start' }}>
        <p style={{ margin: 0, color: 'var(--alv-ink-2)', lineHeight: 1.6 }}>
          {ru
            ? 'Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.'
            : 'Server bilan bog‘lanib bo‘lmadi. Ulanishni tekshirib, qayta urinib ko‘ring.'}
        </p>
        <button type="button" className="alv-btn alv-btn--outline alv-btn--md" onClick={() => void load()}>
          {ru ? 'Повторить' : 'Qayta urinish'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="alv-card" style={{ padding: 22 }}>
        <div style={{ fontSize: 13, color: 'var(--alv-muted)', marginBottom: 4 }}>
          {ru ? 'Ваши баллы' : 'Ballaringiz'}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 38, lineHeight: 1.1 }}>{balance.points}</strong>
          {/* «Ikki valyuta»: ball yonida har doim so'm. */}
          <span style={{ fontSize: 17, color: 'var(--alv-ink-2)' }}>
            = {formatPrice(balance.amount, ru ? 'RU' : 'UZ')}
          </span>
        </div>

        <p style={{ margin: '14px 0 0', fontSize: 13.5, color: 'var(--alv-ink-2)', lineHeight: 1.65 }}>
          {ru
            ? `1 балл за каждые 1 000 сум. Баллами можно оплатить до ${balance.rate.maxRedeemSharePercent}% заказа.`
            : `Har 1 000 so‘mga 1 ball. Ballar bilan buyurtmaning ${balance.rate.maxRedeemSharePercent}% gacha qismini qoplash mumkin.`}
        </p>

        {balance.expiresAt ? (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--alv-warn)' }}>
            {ru ? 'Сгорают ' : 'Kuyish sanasi: '}
            {new Date(balance.expiresAt).toLocaleDateString(ru ? 'ru-RU' : 'uz-UZ')}
          </p>
        ) : null}
      </div>

      <div>
        <h2 style={{ fontSize: 17, margin: '0 0 12px' }}>{ru ? 'История' : 'Tarix'}</h2>
        {history.length === 0 ? (
          <p style={{ color: 'var(--alv-muted)', fontSize: 14 }}>
            {ru
              ? 'Пока нет операций. Баллы начисляются после оплаты заказа.'
              : 'Hali harakat yo‘q. Ballar buyurtma to‘langandan keyin beriladi.'}
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 1 }}>
            {history.map((e) => (
              <li
                key={e.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 14,
                  padding: '13px 2px',
                  borderTop: '1px solid var(--alv-line)',
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14.5 }}>
                    {ru ? KIND[e.kind]?.ru : KIND[e.kind]?.uz}
                    {e.orderNumber ? ` · ${e.orderNumber}` : ''}
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>
                    {new Date(e.createdAt).toLocaleDateString(ru ? 'ru-RU' : 'uz-UZ')}
                    {e.comment ? ` · ${e.comment}` : ''}
                  </span>
                </span>
                <strong
                  style={{
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                    color: e.points >= 0 ? 'var(--alv-mint)' : 'var(--alv-ink-2)',
                  }}
                >
                  {e.points > 0 ? `+${e.points}` : e.points}
                </strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
