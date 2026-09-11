'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { DataList, type DataColumn } from '@/components/DataList';
import { adminApi, type AdminPaymentRow } from '@/lib/api';
import {
  PAYMENT_PROVIDER_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_TONE,
  fmtDateTime,
  label,
} from '@/lib/order-labels';

/** To'lovlar — TZ 33, TZ-2 4.3. Ro'yxat mexanikasi `DataList` da. */

const PROVIDERS = [
  { value: '', label: 'Barcha provayderlar' },
  ...Object.entries(PAYMENT_PROVIDER_LABEL).map(([value, l]) => ({ value, label: l })),
];

const STATUSES = [
  { value: '', label: 'Barcha holatlar' },
  ...Object.entries(PAYMENT_STATUS_LABEL).map(([value, l]) => ({ value, label: l })),
];

const COLUMNS: Array<DataColumn<AdminPaymentRow>> = [
  {
    key: 'order',
    label: 'Buyurtma',
    locked: true,
    render: (p) => (
      <>
        <Link href={`/payments/${p.id}`} style={{ fontWeight: 700, color: 'var(--alv-brand)' }}>
          {p.orderNumber ?? '—'}
        </Link>
        <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>{p.contactPhone ?? '—'}</div>
      </>
    ),
  },
  {
    key: 'provider',
    label: 'Provayder',
    render: (p) => label(PAYMENT_PROVIDER_LABEL, p.provider),
  },
  {
    key: 'status',
    label: 'Holat',
    render: (p) => (
      <Badge tone={PAYMENT_TONE[p.status] ?? 'neutral'}>{label(PAYMENT_STATUS_LABEL, p.status)}</Badge>
    ),
  },
  {
    key: 'amount',
    label: 'Summa',
    align: 'right',
    render: (p) => (
      <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {formatTiyin(p.amount)}
      </strong>
    ),
  },
  {
    key: 'refunded',
    label: 'Qaytarilgan',
    align: 'right',
    // Nol bo'lmagan qaytarish moslashtirishda eng ko'p savol tug'diradi,
    // shuning uchun u ajratib ko'rsatiladi.
    render: (p) =>
      Number(p.refundedAmount) > 0 ? (
        <span
          style={{
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            color: 'var(--alv-danger)',
          }}
        >
          {formatTiyin(p.refundedAmount)}
        </span>
      ) : (
        <span style={{ color: 'var(--alv-muted)' }}>—</span>
      ),
  },
  {
    key: 'paidAt',
    label: 'To‘langan',
    render: (p) => (
      <span style={{ whiteSpace: 'nowrap', color: p.paidAt ? undefined : 'var(--alv-muted)' }}>
        {p.paidAt ? fmtDateTime(p.paidAt) : '—'}
      </span>
    ),
  },
  {
    key: 'txn',
    label: 'Tranzaksiya',
    defaultVisible: false,
    render: (p) =>
      p.providerTxnId ? (
        <code style={{ fontSize: 12 }}>{p.providerTxnId}</code>
      ) : (
        <span style={{ color: 'var(--alv-muted)' }}>—</span>
      ),
  },
  {
    key: 'failure',
    label: 'Xato sababi',
    defaultVisible: false,
    render: (p) =>
      p.failureReason ? (
        <span style={{ color: 'var(--alv-danger)', fontSize: 13 }}>{p.failureReason}</span>
      ) : (
        <span style={{ color: 'var(--alv-muted)' }}>—</span>
      ),
  },
  {
    key: 'created',
    label: 'Yaratilgan',
    defaultVisible: false,
    render: (p) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(p.createdAt)}</span>,
  },
];

const EMPTY = { q: '', provider: '', status: '', dateFrom: '', dateTo: '' };

export default function PaymentsPage() {
  const [items, setItems] = useState<AdminPaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, unknown>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const f = filters as Record<string, string>;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.payments({
        q: f.q || undefined,
        provider: f.provider || undefined,
        status: f.status || undefined,
        dateFrom: f.dateFrom || undefined,
        dateTo: f.dateTo || undefined,
        page,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [f.q, f.provider, f.status, f.dateFrom, f.dateTo, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  function changeFilters(next: Record<string, unknown>) {
    setFilters(next);
    setPage(1);
  }

  const pages = Math.max(1, Math.ceil(total / 20));
  const input: React.CSSProperties = {
    padding: '9px 12px',
    borderRadius: 10,
    border: '1px solid var(--alv-line)',
    fontSize: 14,
    background: 'var(--alv-surface)',
    color: 'var(--alv-ink)',
    minWidth: 0,
  };

  return (
    <AdminShell title="To‘lovlar">
      {error ? (
        <div
          role="alert"
          className="alv-card"
          style={{ padding: 14, marginBottom: 14, borderLeft: '3px solid var(--alv-danger)' }}
        >
          {error}
        </div>
      ) : null}

      <p style={{ margin: '0 0 14px', color: 'var(--alv-muted)', fontSize: 14 }}>
        Jami {total} ta to‘lov
      </p>

      <DataList<AdminPaymentRow>
        storageKey="payments"
        columns={COLUMNS}
        rows={items}
        rowKey={(p) => p.id}
        filters={filters}
        onFiltersChange={changeFilters}
        loading={loading}
        onClearFilters={() => changeFilters(EMPTY)}
        emptyTitle="Hali to‘lov yo‘q"
        emptyHint="Birinchi to‘lov amalga oshgach u shu yerda ko‘rinadi."
        noResultsTitle="Bu shartlarga mos to‘lov topilmadi"
        filterBar={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            <input
              type="search"
              value={f.q ?? ''}
              onChange={(e) => changeFilters({ ...filters, q: e.target.value })}
              placeholder="Buyurtma raqami, telefon yoki tranzaksiya"
              aria-label="To‘lov qidirish"
              style={{ ...input, flex: '1 1 260px' }}
            />
            <select
              value={f.provider ?? ''}
              onChange={(e) => changeFilters({ ...filters, provider: e.target.value })}
              aria-label="Provayder bo‘yicha filtr"
              style={input}
            >
              {PROVIDERS.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
            <select
              value={f.status ?? ''}
              onChange={(e) => changeFilters({ ...filters, status: e.target.value })}
              aria-label="Holat bo‘yicha filtr"
              style={input}
            >
              {STATUSES.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
            <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--alv-muted)' }}>Sanadan</span>
              <input
                type="date"
                value={f.dateFrom ?? ''}
                onChange={(e) => changeFilters({ ...filters, dateFrom: e.target.value })}
                style={input}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--alv-muted)' }}>Sanagacha</span>
              <input
                type="date"
                value={f.dateTo ?? ''}
                onChange={(e) => changeFilters({ ...filters, dateTo: e.target.value })}
                style={input}
              />
            </label>
          </div>
        }
        footer={
          pages > 1 ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ ...input, cursor: 'pointer', opacity: page === 1 ? 0.5 : 1 }}
              >
                Oldingi
              </button>
              <span style={{ fontSize: 14, color: 'var(--alv-muted)' }}>
                {page} / {pages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                style={{ ...input, cursor: 'pointer', opacity: page === pages ? 0.5 : 1 }}
              >
                Keyingi
              </button>
            </div>
          ) : null
        }
      />
    </AdminShell>
  );
}
