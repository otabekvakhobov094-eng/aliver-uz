'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Input, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminReturnRow } from '@/lib/api';
import {
  RETURN_REASON_LABEL,
  RETURN_STATUS_LABEL,
  RETURN_STATUS_TONE,
  fmtDateTime,
  label,
} from '@/lib/order-labels';

const STATUSES = [
  { value: '', label: 'Hammasi' },
  ...Object.entries(RETURN_STATUS_LABEL).map(([value, l]) => ({ value, label: l })),
];

export default function ReturnsPage() {
  const [items, setItems] = useState<AdminReturnRow[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.returns({ status: status || undefined, q: q || undefined, page });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <AdminShell title="Qaytarishlar">
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <div style={{ minWidth: 240 }}>
          <Input
            name="q"
            label="Qidiruv"
            placeholder="Qaytarish yoki buyurtma raqami"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>Holat</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={input}
          >
            {STATUSES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--alv-muted)' }}>
          Jami: {total}
        </span>
      </div>

      {error ? (
        <p role="alert" style={{ color: 'var(--alv-danger)', fontWeight: 600 }}>
          {error}
        </p>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
          <thead>
            <tr style={{ fontSize: 12.5, color: 'var(--alv-muted)', textAlign: 'left' }}>
              <th style={th}>Raqam</th>
              <th style={th}>Buyurtma</th>
              <th style={th}>Sabab</th>
              <th style={th}>Holat</th>
              <th style={{ ...th, textAlign: 'right' }}>Summa</th>
              <th style={th}>Sana</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--alv-line)' }}>
                <td style={td}>
                  <Link
                    href={`/returns/${r.id}`}
                    style={{ fontWeight: 700, color: 'var(--alv-brand)' }}
                  >
                    {r.number}
                  </Link>
                  <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                    {r.itemsCount} pozitsiya
                  </div>
                </td>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{r.orderNumber ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                    {r.contactPhone ?? '—'}
                  </div>
                </td>
                <td style={{ ...td, fontSize: 13 }}>{label(RETURN_REASON_LABEL, r.reasonCode)}</td>
                <td style={td}>
                  <Badge tone={RETURN_STATUS_TONE[r.status] ?? 'neutral'}>
                    {label(RETURN_STATUS_LABEL, r.status)}
                  </Badge>
                </td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                  {formatTiyin(r.refundAmount)}
                </td>
                <td style={{ ...td, fontSize: 12.5 }}>{fmtDateTime(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading ? <p style={{ color: 'var(--alv-muted)' }}>Yuklanmoqda…</p> : null}
      {!loading && items.length === 0 ? (
        <p style={{ color: 'var(--alv-muted)' }}>Qaytarish topilmadi.</p>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          style={pager(page <= 1)}
        >
          ← Oldingi
        </button>
        <span style={{ fontSize: 13, color: 'var(--alv-muted)' }}>{page}-sahifa</span>
        <button
          type="button"
          disabled={items.length < 30}
          onClick={() => setPage((p) => p + 1)}
          style={pager(items.length < 30)}
        >
          Keyingi →
        </button>
      </div>
    </AdminShell>
  );
}

const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 700 };
const td: React.CSSProperties = { padding: 12, fontSize: 13.5, verticalAlign: 'top' };
const input: React.CSSProperties = {
  minHeight: 44,
  padding: '10px 12px',
  borderRadius: 12,
  border: 0,
  boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
  font: 'inherit',
  background: 'var(--alv-surface)',
};

function pager(disabled: boolean): React.CSSProperties {
  return {
    minHeight: 44,
    padding: '0 16px',
    borderRadius: 999,
    border: 0,
    background: 'var(--alv-surface)',
    boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}
