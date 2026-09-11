'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Input, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminCustomerRow } from '@/lib/api';
import { SEGMENT_LABEL, SEGMENT_TONE, fmtDateTime, label } from '@/lib/order-labels';

const SEGMENTS = [
  { value: '', label: 'Hammasi' },
  ...Object.entries(SEGMENT_LABEL).map(([value, l]) => ({ value, label: l })),
];

export default function CustomersPage() {
  const [items, setItems] = useState<AdminCustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [segment, setSegment] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.customers({
        q: q || undefined,
        segment: segment || undefined,
        status: status || undefined,
        page,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [q, segment, status, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <AdminShell title="Mijozlar">
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <div style={{ minWidth: 260 }}>
          <Input
            name="q"
            label="Qidiruv"
            placeholder="Telefon, ism yoki email"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          label="Segment"
          value={segment}
          options={SEGMENTS}
          onChange={(v) => {
            setSegment(v);
            setPage(1);
          }}
        />
        <Select
          label="Holat"
          value={status}
          options={[
            { value: '', label: 'Hammasi' },
            { value: 'ACTIVE', label: 'Faol' },
            { value: 'BLOCKED', label: 'Bloklangan' },
          ]}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
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
              <th style={th}>Mijoz</th>
              <th style={th}>Segment</th>
              <th style={{ ...th, textAlign: 'right' }}>Buyurtmalar</th>
              <th style={{ ...th, textAlign: 'right' }}>Sarflangan</th>
              <th style={th}>Oxirgi buyurtma</th>
              <th style={th}>Holat</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid var(--alv-line)' }}>
                <td style={td}>
                  <Link
                    href={`/customers/${c.id}`}
                    style={{ fontWeight: 700, color: 'var(--alv-brand)' }}
                  >
                    {c.name ?? c.phone}
                  </Link>
                  <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                    {c.phone}
                    {c.email ? ` · ${c.email}` : ''}
                  </div>
                </td>
                <td style={td}>
                  <Badge tone={SEGMENT_TONE[c.segment] ?? 'neutral'}>
                    {label(SEGMENT_LABEL, c.segment)}
                  </Badge>
                </td>
                <td style={{ ...td, textAlign: 'right' }}>{c.ordersCount}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                  {formatTiyin(c.totalSpent)}
                </td>
                <td style={{ ...td, fontSize: 12.5 }}>
                  {c.lastOrderAt ? fmtDateTime(c.lastOrderAt) : '—'}
                </td>
                <td style={td}>
                  <Badge tone={c.status === 'ACTIVE' ? 'mint' : 'low'}>
                    {c.status === 'ACTIVE' ? 'Faol' : 'Bloklangan'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading ? <p style={{ color: 'var(--alv-muted)' }}>Yuklanmoqda…</p> : null}
      {!loading && items.length === 0 ? (
        <p style={{ color: 'var(--alv-muted)' }}>Mijoz topilmadi.</p>
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

function Select({
  label: text,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>{text}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={input}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
