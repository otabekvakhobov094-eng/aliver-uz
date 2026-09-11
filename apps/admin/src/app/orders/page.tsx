'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Input, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminOrderRow } from '@/lib/api';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYMENT_PROVIDER_LABEL,
  PAYMENT_STATUS_LABEL,
  fmtDateTime,
  label,
  reservationLeft,
} from '@/lib/order-labels';

const STATUS_FILTERS = [
  { value: '', label: 'Hammasi' },
  ...Object.entries(ORDER_STATUS_LABEL).map(([value, l]) => ({ value, label: l })),
];

const PAYMENT_FILTERS = [
  { value: '', label: 'Hammasi' },
  ...Object.entries(PAYMENT_STATUS_LABEL).map(([value, l]) => ({ value, label: l })),
];

export default function OrdersPage() {
  const [items, setItems] = useState<AdminOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guruh amallari: operator kuni bilan 40 ta buyurtmani birma-bir
  // bosib o'tirmasligi kerak.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('PROCESSING');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.orders({
        q: q || undefined,
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
      });
      setItems(res.items);
      setTotal(res.total);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [q, status, paymentStatus, dateFrom, dateTo, page]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((o) => o.id)),
    );
  };

  const runBulk = async () => {
    setBulkBusy(true);
    setBulkResult(null);
    setError(null);
    try {
      const res = await adminApi.bulkOrderStatus([...selected], bulkStatus);
      setBulkResult(
        res.failed.length === 0
          ? `${res.changed} ta buyurtma o‘zgartirildi.`
          : `${res.changed} ta o‘zgartirildi, ${res.failed.length} tasi o‘tmadi: ` +
              res.failed.map((f) => `${f.number ?? f.orderId} — ${f.message}`).join('; '),
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <AdminShell title="Buyurtmalar">
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          marginBottom: 18,
        }}
      >
        <div style={{ minWidth: 260 }}>
          <Input
            name="q"
            label="Qidiruv"
            placeholder="Raqam, telefon yoki ism"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Filter
          label="Holat"
          value={status}
          options={STATUS_FILTERS}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <Filter
          label="To‘lov"
          value={paymentStatus}
          options={PAYMENT_FILTERS}
          onChange={(v) => {
            setPaymentStatus(v);
            setPage(1);
          }}
        />

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
            Sanadan
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
            Sanagacha
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            style={inputStyle}
          />
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

      {selected.size > 0 ? (
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
            padding: '12px 16px',
            borderRadius: 14,
            background: 'var(--alv-surface-2)',
            marginBottom: 14,
          }}
        >
          <strong style={{ fontSize: 13.5 }}>{selected.size} ta tanlandi</strong>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            style={{ ...inputStyle, minWidth: 180 }}
            aria-label="Yangi holat"
          >
            {Object.entries(ORDER_STATUS_LABEL).map(([value, l]) => (
              <option key={value} value={value}>
                {l}
              </option>
            ))}
          </select>
          <Button variant="primary" size="sm" disabled={bulkBusy} onClick={() => void runBulk()}>
            Holatni o‘zgartirish
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Bekor qilish
          </Button>
          <span style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
            Har biri alohida tekshiriladi — o‘tolmagani xatosi bilan ko‘rsatiladi.
          </span>
        </div>
      ) : null}

      {bulkResult ? (
        <p role="status" style={{ color: 'var(--alv-ink-2)', fontSize: 13.5, fontWeight: 600 }}>
          {bulkResult}
        </p>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: 12.5, color: 'var(--alv-muted)' }}>
              <Th>
                <input
                  type="checkbox"
                  checked={items.length > 0 && selected.size === items.length}
                  onChange={toggleAll}
                  aria-label="Hammasini tanlash"
                  style={{ width: 18, height: 18, accentColor: 'var(--alv-brand)' }}
                />
              </Th>
              <Th>Raqam</Th>
              <Th>Sana</Th>
              <Th>Mijoz</Th>
              <Th>Hudud</Th>
              <Th>Holat</Th>
              <Th>To‘lov</Th>
              <Th align="right">Summa</Th>
              <Th>Rezerv</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => {
              const left = reservationLeft(o.reservationExpiresAt);
              return (
                <tr key={o.id} style={{ borderTop: '1px solid var(--alv-line)' }}>
                  <Td>
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggle(o.id)}
                      aria-label={`${o.number} ni tanlash`}
                      style={{ width: 18, height: 18, accentColor: 'var(--alv-brand)' }}
                    />
                  </Td>
                  <Td>
                    <Link
                      href={`/orders/${o.id}`}
                      style={{ fontWeight: 700, color: 'var(--alv-brand)' }}
                    >
                      {o.number}
                    </Link>
                    <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                      {o.itemsCount} pozitsiya
                    </div>
                  </Td>
                  <Td>{fmtDateTime(o.placedAt)}</Td>
                  <Td>
                    <div style={{ fontWeight: 600 }}>
                      {[o.firstName, o.lastName].filter(Boolean).join(' ')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>{o.contactPhone}</div>
                  </Td>
                  <Td>{o.regionName ?? '—'}</Td>
                  <Td>
                    <Badge tone={ORDER_STATUS_TONE[o.status] ?? 'neutral'}>
                      {label(ORDER_STATUS_LABEL, o.status)}
                    </Badge>
                  </Td>
                  <Td>
                    <div>{label(PAYMENT_STATUS_LABEL, o.paymentStatus)}</div>
                    <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                      {o.paymentProvider ? label(PAYMENT_PROVIDER_LABEL, o.paymentProvider) : '—'}
                    </div>
                  </Td>
                  <Td align="right">
                    <strong>{formatTiyin(o.grandTotal)}</strong>
                  </Td>
                  <Td>
                    {left ? (
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color:
                            left === 'muddati o‘tgan' ? 'var(--alv-danger)' : 'var(--alv-warn)',
                        }}
                      >
                        {left}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--alv-muted)' }}>—</span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading ? <p style={{ color: 'var(--alv-muted)' }}>Yuklanmoqda…</p> : null}
      {!loading && items.length === 0 ? (
        <p style={{ color: 'var(--alv-muted)' }}>Bu filtr bo‘yicha buyurtma topilmadi.</p>
      ) : null}

      {total > items.length || page > 1 ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={pagerStyle(page <= 1)}
          >
            ← Oldingi
          </button>
          <span style={{ fontSize: 13, color: 'var(--alv-muted)' }}>{page}-sahifa</span>
          <button
            type="button"
            disabled={items.length < 30}
            onClick={() => setPage((p) => p + 1)}
            style={pagerStyle(items.length < 30)}
          >
            Keyingi →
          </button>
        </div>
      ) : null}
    </AdminShell>
  );
}

const inputStyle: React.CSSProperties = {
  minHeight: 44,
  padding: '10px 12px',
  borderRadius: 12,
  border: 0,
  boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
  font: 'inherit',
  background: 'var(--alv-surface)',
};

function pagerStyle(disabled: boolean): React.CSSProperties {
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

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th style={{ padding: '10px 12px', textAlign: align ?? 'left', fontWeight: 700 }}>
      {children}
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <td
      style={{ padding: '12px', textAlign: align ?? 'left', fontSize: 13.5, verticalAlign: 'top' }}
    >
      {children}
    </td>
  );
}
