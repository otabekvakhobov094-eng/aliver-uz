'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import {
  adminApi,
  type LoyaltyExpiredRow,
  type LoyaltyExpiringRow,
} from '@/lib/api';

/**
 * Bonus ballar — kuyish nazorati.
 *
 * NEGA BU EKRAN KERAK. Ballar 12 oylik faoliyatsizlikdan keyin kuyadi
 * va bu jarayon tunda, avtomatik ishlaydi. Avtomatik jarayonning eng
 * yomon tomoni — u jimgina noto'g'ri ishlashi mumkin: kuydirmay qo'ysa
 * hech kim sezmaydi, ortiqcha kuydirsa mijoz shikoyat qilgandagina
 * bilinadi.
 *
 * Shuning uchun ikkita ro'yxat: KUYADIGANLAR (hali kuymagan, ya'ni
 * xatoni oldindan ko'rish mumkin) va KUYGANLAR (haqiqatda nima
 * bo'lgani). Ikkalasi ham faqat o'qish uchun — bu yerda hech narsani
 * o'zgartirib bo'lmaydi, tuzatish mijoz kartochkasida qo'lda
 * kiritiladi va izoh talab qiladi.
 */

type Tab = 'expiring' | 'expired';

const WINDOWS = [7, 14, 30, 60];

export default function LoyaltyPage() {
  const [tab, setTab] = useState<Tab>('expiring');
  const [days, setDays] = useState(14);

  const [expiring, setExpiring] = useState<LoyaltyExpiringRow[] | null>(null);
  const [expiringTotal, setExpiringTotal] = useState(0);
  const [expired, setExpired] = useState<LoyaltyExpiredRow[] | null>(null);
  const [expiredTotal, setExpiredTotal] = useState({ points: 0, amount: '0' });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'expiring') {
        const res = await adminApi.loyaltyExpiring(days);
        setExpiring(res.items);
        setExpiringTotal(res.totalPoints);
      } else {
        const res = await adminApi.loyaltyExpired({});
        setExpired(res.items);
        setExpiredTotal({ points: res.totalPoints, amount: res.totalAmount });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell title="Bonus ballar">
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={tab === 'expiring' ? 'alv-btn' : 'alv-btn alv-btn--ghost'}
          onClick={() => setTab('expiring')}
        >
          Tez orada kuyadi
        </button>
        <button
          type="button"
          className={tab === 'expired' ? 'alv-btn' : 'alv-btn alv-btn--ghost'}
          onClick={() => setTab('expired')}
        >
          Kuygan ballar
        </button>
      </div>

      {tab === 'expiring' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: 'var(--alv-muted)' }}>Oraliq:</span>
          {WINDOWS.map((d) => (
            <button
              key={d}
              type="button"
              className={days === d ? 'alv-chip alv-chip--on' : 'alv-chip'}
              onClick={() => setDays(d)}
            >
              {d} kun
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" style={{ color: 'var(--alv-danger)', marginBottom: 14 }}>
          {error}
        </p>
      )}

      {loading && <p style={{ color: 'var(--alv-muted)' }}>Yuklanmoqda…</p>}

      {!loading && tab === 'expiring' && (
        <>
          <Summary
            label={`Keyingi ${days} kun ichida kuyadigan ballar`}
            points={expiringTotal}
            note="Har biriga kuyishdan 14 kun oldin SMS yuboriladi. Mijoz buyurtma bersa muddat 12 oyga yangilanadi."
          />
          {expiring && expiring.length === 0 ? (
            <Empty text="Bu oraliqda kuyadigan ball yo‘q." />
          ) : (
            <Table
              head={['Mijoz', 'Ball', 'Qiymat', 'Oxirgi harakat', 'Kuyadi']}
              rows={(expiring ?? []).map((r) => [
                <Customer key="c" id={r.customerId} name={r.name} phone={r.phone} />,
                <strong key="p">{r.points}</strong>,
                formatTiyin(BigInt(r.amount)),
                fmtDate(r.lastActivityAt),
                <span key="d">
                  {fmtDate(r.expiresAt)}{' '}
                  {r.daysLeft !== null && (
                    <Badge tone={r.daysLeft <= 7 ? 'sale' : 'low'}>{r.daysLeft} kun</Badge>
                  )}
                </span>,
              ])}
            />
          )}
        </>
      )}

      {!loading && tab === 'expired' && (
        <>
          <Summary
            label="Kuygan ballar (jami)"
            points={expiredTotal.points}
            amount={expiredTotal.amount}
            note="Kuydirish har kuni soat 03:00 da avtomatik bajariladi. Xato bo‘lsa mijoz kartochkasida qo‘lda to‘g‘rilanadi — izoh majburiy."
          />
          {expired && expired.length === 0 ? (
            <Empty text="Hali hech qanday ball kuymagan." />
          ) : (
            <Table
              head={['Mijoz', 'Kuygan ball', 'Qiymat', 'Sana']}
              rows={(expired ?? []).map((r) => [
                <Customer key="c" id={r.customerId} name={r.name} phone={r.phone} />,
                <strong key="p">{r.points}</strong>,
                formatTiyin(BigInt(r.amount)),
                fmtDate(r.createdAt),
              ])}
            />
          )}
        </>
      )}
    </AdminShell>
  );
}

/* ---------------------------------------------------------------- */

function Summary(props: { label: string; points: number; amount?: string; note: string }) {
  return (
    <div
      style={{
        background: 'var(--alv-surface-2, #FAF7F8)',
        border: '1px solid var(--alv-line, #ECE4E7)',
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--alv-muted)' }}>{props.label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 2 }}>
        {props.points.toLocaleString('ru-RU')} ball
        {props.amount ? (
          <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--alv-muted)' }}>
            {' '}
            · {formatTiyin(BigInt(props.amount))}
          </span>
        ) : null}
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--alv-muted)', margin: '6px 0 0', maxWidth: '70ch' }}>
        {props.note}
      </p>
    </div>
  );
}

function Customer(props: { id: string; name: string | null; phone: string | null }) {
  return (
    <Link href={`/customers/${props.id}`} style={{ textDecoration: 'none' }}>
      <strong style={{ display: 'block' }}>{props.name ?? 'Ismsiz'}</strong>
      <span style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>{props.phone ?? '—'}</span>
    </Link>
  );
}

function Empty(props: { text: string }) {
  return (
    <p style={{ color: 'var(--alv-muted)', padding: '24px 0' }}>{props.text}</p>
  );
}

function Table(props: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="alv-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            {props.head.map((h) => (
              <th key={h} style={{ textAlign: 'left' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
