'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, formatTiyin } from '@aliver/ui';
import { adminApi, type LoyaltyView } from '@/lib/api';

const KIND_LABEL: Record<string, string> = {
  EARN: 'Buyurtma uchun',
  REDEEM: 'Ishlatilgan',
  REVERSAL: 'Qaytarilgan',
  ADJUST: 'Qo‘lda tuzatish',
  EXPIRE: 'Muddati tugagan',
};

/**
 * Mijozning bonus ballari.
 *
 * Bu alohida sahifa EMAS va ataylab shunday: API mijoz bo'yicha
 * ishlaydi, ya'ni «ballar ro'yxati» degan ekran bo'lsa, operator avval
 * mijozni topishi, keyin boshqa ekranga o'tishi kerak bo'lardi. Ball
 * haqidagi savol esa doim aniq bir mijoz haqida.
 *
 * Tuzatish uchun IZOH majburiy — bu pul bilan bog'liq amal va keyin
 * «nega bu odamga 5 000 ball berilgan» degan savolga javob kerak
 * bo'ladi. Server ham buni talab qiladi; bu yerda shakl faqat oldindan
 * ogohlantiradi.
 */
export function CustomerLoyalty({ customerId }: { customerId: string }) {
  const [data, setData] = useState<LoyaltyView | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [points, setPoints] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await adminApi.loyalty(customerId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const n = Number(points);
    if (!Number.isInteger(n) || n === 0) {
      setError('Ball butun va noldan farqli bo‘lishi kerak');
      return;
    }
    if (comment.trim().length < 3) {
      setError('Izoh majburiy — keyin bu amalni kim va nega qilganini tushuntirish kerak bo‘ladi');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await adminApi.adjustLoyalty(customerId, n, comment.trim());
      setNotice(`${n > 0 ? '+' : ''}${n} ball yozildi`);
      setPoints('');
      setComment('');
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return (
      <p role="alert" style={{ color: 'var(--alv-danger)', fontSize: 13.5, margin: 0 }}>
        {error}
      </p>
    );
  }
  if (!data) return <p style={{ color: 'var(--alv-muted)', fontSize: 13.5, margin: 0 }}>Yuklanmoqda…</p>;

  const { balance, history } = data;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{balance.points.toLocaleString('uz-UZ')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>ball</div>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{formatTiyin(BigInt(balance.amount))}</div>
          <div style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>qiymati</div>
        </div>
        {balance.expiresAt ? (
          <div style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>
            {new Date(balance.expiresAt).toLocaleDateString('uz-UZ')} dan keyin kuyadi
          </div>
        ) : null}
        <Button variant="ghost" size="sm" style={{ marginLeft: 'auto' }} onClick={() => setOpen((v) => !v)}>
          {open ? 'Yopish' : 'Qo‘lda tuzatish'}
        </Button>
      </div>

      {notice ? (
        <p role="status" style={{ margin: 0, fontSize: 13, color: 'var(--alv-mint)' }}>
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--alv-danger)' }}>
          {error}
        </p>
      ) : null}

      {open ? (
        <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12.5, fontWeight: 600 }}>
            Ball (manfiy — yechish)
            <input
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              inputMode="numeric"
              placeholder="masalan: 500 yoki -200"
              style={fieldStyle}
            />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12.5, fontWeight: 600 }}>
            Izoh (majburiy)
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={300}
              placeholder="Nega tuzatildi"
              style={fieldStyle}
            />
          </label>
          <div>
            <Button size="sm" disabled={busy}>
              {busy ? 'Saqlanmoqda…' : 'Saqlash'}
            </Button>
          </div>
        </form>
      ) : null}

      {history.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13.5 }}>Hali harakat yo‘q.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
          {history.map((h) => (
            <li
              key={h.id}
              style={{ display: 'flex', gap: 10, justifyContent: 'space-between', fontSize: 13, alignItems: 'baseline' }}
            >
              <span style={{ minWidth: 0 }}>
                {KIND_LABEL[h.kind] ?? h.kind}
                {h.orderNumber ? ` · ${h.orderNumber}` : ''}
                {h.comment ? (
                  <span style={{ color: 'var(--alv-muted)' }}> · {h.comment}</span>
                ) : null}
              </span>
              <span style={{ whiteSpace: 'nowrap', display: 'flex', gap: 10 }}>
                <span style={{ fontWeight: 700, color: h.points < 0 ? 'var(--alv-muted)' : 'var(--alv-ink)' }}>
                  {h.points > 0 ? '+' : ''}
                  {h.points}
                </span>
                <span style={{ color: 'var(--alv-muted)' }}>
                  {new Date(h.createdAt).toLocaleDateString('uz-UZ')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  padding: '8px 11px',
  borderRadius: 9,
  border: '1px solid var(--alv-line)',
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  fontSize: 13.5,
  fontWeight: 400,
};
