'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Input, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminPaymentRow } from '@/lib/api';
import {
  PAYMENT_PROVIDER_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_TONE,
  fmtDateTime,
  label,
} from '@/lib/order-labels';

const PROVIDERS = [
  { value: '', label: 'Hammasi' },
  { value: 'CLICK', label: 'Click' },
  { value: 'PAYME', label: 'Payme' },
  { value: 'CASH_ON_DELIVERY', label: 'Naqd' },
];

const STATUSES = [
  { value: '', label: 'Hammasi' },
  ...Object.entries(PAYMENT_STATUS_LABEL).map(([value, l]) => ({ value, label: l })),
];

export default function PaymentsPage() {
  const [items, setItems] = useState<AdminPaymentRow[]>([]);
  const [totals, setTotals] = useState({ paid: '0', refunded: '0' });
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.payments({
        q: q || undefined,
        provider: provider || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotals(res.totals);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [q, provider, status, dateFrom, dateTo, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <AdminShell title="To‘lovlar">
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          marginBottom: 18,
        }}
      >
        <div style={{ minWidth: 240 }}>
          <Input
            name="q"
            label="Qidiruv"
            placeholder="Buyurtma, telefon yoki tranzaksiya"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Filter
          label="Usul"
          value={provider}
          options={PROVIDERS}
          onChange={(v) => {
            setProvider(v);
            setPage(1);
          }}
        />
        <Filter
          label="Holat"
          value={status}
          options={STATUSES}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <DateField
          label="Sanadan"
          value={dateFrom}
          onChange={(v) => {
            setDateFrom(v);
            setPage(1);
          }}
        />
        <DateField
          label="Sanagacha"
          value={dateTo}
          onChange={(v) => {
            setDateTo(v);
            setPage(1);
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <Stat label="Qabul qilingan" value={formatTiyin(totals.paid)} tone="mint" />
        <Stat label="Qaytarilgan" value={formatTiyin(totals.refunded)} tone="low" />
        <Stat label="Yozuvlar" value={String(total)} />
      </div>

      {error ? (
        <p role="alert" style={{ color: 'var(--alv-danger)', fontWeight: 600 }}>
          {error}
        </p>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
          <thead>
            <tr style={{ fontSize: 12.5, color: 'var(--alv-muted)', textAlign: 'left' }}>
              <th style={th}>Buyurtma</th>
              <th style={th}>Sana</th>
              <th style={th}>Usul</th>
              <th style={th}>Holat</th>
              <th style={th}>Tranzaksiya</th>
              <th style={{ ...th, textAlign: 'right' }}>Summa</th>
              <th style={{ ...th, textAlign: 'right' }}>Qaytarilgan</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid var(--alv-line)' }}>
                <td style={td}>
                  <Link
                    href={`/payments/${p.id}`}
                    style={{ fontWeight: 700, color: 'var(--alv-brand)' }}
                  >
                    {p.orderNumber ?? p.id.slice(0, 8)}
                  </Link>
                  <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                    {p.contactPhone ?? '—'}
                  </div>
                </td>
                <td style={td}>{fmtDateTime(p.createdAt)}</td>
                <td style={td}>{label(PAYMENT_PROVIDER_LABEL, p.provider)}</td>
                <td style={td}>
                  <Badge tone={PAYMENT_TONE[p.status] ?? 'neutral'}>
                    {label(PAYMENT_STATUS_LABEL, p.status)}
                  </Badge>
                  {p.failureReason ? (
                    <div style={{ fontSize: 11.5, color: 'var(--alv-danger)', marginTop: 4 }}>
                      {p.failureReason}
                    </div>
                  ) : null}
                </td>
                <td style={{ ...td, fontSize: 12, wordBreak: 'break-all' }}>
                  {p.providerTxnId ?? '—'}
                </td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                  {formatTiyin(p.amount)}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {BigInt(p.refundedAmount) > 0n ? formatTiyin(p.refundedAmount) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading ? <p style={{ color: 'var(--alv-muted)' }}>Yuklanmoqda…</p> : null}
      {!loading && items.length === 0 ? (
        <p style={{ color: 'var(--alv-muted)' }}>Bu filtr bo‘yicha to‘lov topilmadi.</p>
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
const inputStyle: React.CSSProperties = {
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

function Filter({
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
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField({
  label: text,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>{text}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

function Stat({
  label: text,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'mint' | 'low';
}) {
  return (
    <div
      style={{
        background: 'var(--alv-surface)',
        borderRadius: 'var(--alv-radius-lg)',
        padding: '14px 18px',
        boxShadow: 'var(--alv-shadow-sm)',
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 12.5, color: 'var(--alv-muted)', fontWeight: 600 }}>{text}</div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          marginTop: 4,
          color:
            tone === 'mint'
              ? 'var(--alv-mint)'
              : tone === 'low'
                ? 'var(--alv-danger)'
                : 'var(--alv-ink)',
        }}
      >
        {value}
      </div>
    </div>
  );
}
