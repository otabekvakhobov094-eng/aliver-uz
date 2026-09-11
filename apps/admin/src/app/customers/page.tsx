'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { DataList, type DataColumn } from '@/components/DataList';
import { adminApi, type AdminCustomerRow } from '@/lib/api';
import { SEGMENT_LABEL, SEGMENT_TONE, fmtDateTime, label } from '@/lib/order-labels';

/**
 * Mijozlar ro'yxati — TZ 60, TZ-2 4.6.
 *
 * Ro'yxat mexanikasi `DataList` da. Bu yerda faqat mijozga xos ustunlar
 * qoladi.
 */

const SEGMENTS = [
  { value: '', label: 'Hammasi' },
  ...Object.entries(SEGMENT_LABEL).map(([value, l]) => ({ value, label: l })),
];

const STATUSES = [
  { value: '', label: 'Barcha holatlar' },
  { value: 'ACTIVE', label: 'Faol' },
  { value: 'BLOCKED', label: 'Bloklangan' },
];

const COLUMNS: Array<DataColumn<AdminCustomerRow>> = [
  {
    key: 'customer',
    label: 'Mijoz',
    locked: true,
    minWidth: 220,
    render: (c) => (
      <Link href={`/customers/${c.id}`} style={{ color: 'var(--alv-ink)' }}>
        <strong style={{ display: 'block' }}>{c.name ?? 'Ismi yo‘q'}</strong>
        <span style={{ color: 'var(--alv-muted)', fontSize: 13 }}>
          {c.phone}
          {c.email ? ` · ${c.email}` : ''}
        </span>
      </Link>
    ),
  },
  {
    key: 'segment',
    label: 'Segment',
    render: (c) => <Badge tone={SEGMENT_TONE[c.segment] ?? 'neutral'}>{label(SEGMENT_LABEL, c.segment)}</Badge>,
  },
  {
    key: 'orders',
    label: 'Buyurtma',
    align: 'right',
    render: (c) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{c.ordersCount}</span>,
  },
  {
    key: 'spent',
    label: 'Jami sarflagan',
    align: 'right',
    render: (c) => (
      <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {formatTiyin(c.totalSpent)}
      </span>
    ),
  },
  {
    key: 'avg',
    label: 'O‘rtacha chek',
    align: 'right',
    defaultVisible: false,
    render: (c) => (
      <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {c.ordersCount > 0
          ? formatTiyin(String(Math.round(Number(c.totalSpent) / c.ordersCount)))
          : '—'}
      </span>
    ),
  },
  {
    key: 'lastOrder',
    label: 'Oxirgi buyurtma',
    render: (c) => (
      <span style={{ color: 'var(--alv-muted)', whiteSpace: 'nowrap' }}>
        {c.lastOrderAt ? fmtDateTime(c.lastOrderAt) : '—'}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Holat',
    defaultVisible: false,
    render: (c) => (
      <Badge tone={c.status === 'ACTIVE' ? 'mint' : 'neutral'}>
        {c.status === 'ACTIVE' ? 'Faol' : 'Bloklangan'}
      </Badge>
    ),
  },
  {
    key: 'locale',
    label: 'Til',
    defaultVisible: false,
    render: (c) => <span style={{ textTransform: 'uppercase' }}>{c.locale}</span>,
  },
  {
    key: 'created',
    label: 'Ro‘yxatdan o‘tgan',
    defaultVisible: false,
    render: (c) => (
      <span style={{ color: 'var(--alv-muted)', whiteSpace: 'nowrap' }}>
        {new Date(c.createdAt).toLocaleDateString('uz-UZ')}
      </span>
    ),
  },
];

const EMPTY_FILTERS = { q: '', segment: '', status: '' };

export default function CustomersPage() {
  const [items, setItems] = useState<AdminCustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Record<string, unknown>>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const q = (filters.q as string) ?? '';
  const segment = (filters.segment as string) ?? '';
  const status = (filters.status as string) ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.customers({
        q: q || undefined,
        segment: segment || undefined,
        status: status || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [q, segment, status]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

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
    <AdminShell title="Mijozlar">
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
        Jami {total} ta mijoz
      </p>

      <DataList<AdminCustomerRow>
        storageKey="customers"
        columns={COLUMNS}
        rows={items}
        rowKey={(c) => c.id}
        filters={filters}
        onFiltersChange={setFilters}
        loading={loading}
        onClearFilters={() => setFilters(EMPTY_FILTERS)}
        emptyTitle="Hali mijoz yo‘q"
        emptyHint="Birinchi buyurtma berilgach mijozlar shu yerda paydo bo‘ladi."
        noResultsTitle="Bu so‘rovga mos mijoz topilmadi"
        filterBar={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <input
              type="search"
              value={q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="Ism, telefon yoki e-pochta"
              aria-label="Mijoz qidirish"
              style={{ ...input, flex: '1 1 260px' }}
            />
            <select
              value={segment}
              onChange={(e) => setFilters({ ...filters, segment: e.target.value })}
              aria-label="Segment bo‘yicha filtr"
              style={input}
            >
              {SEGMENTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              aria-label="Holat bo‘yicha filtr"
              style={input}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        }
      />
    </AdminShell>
  );
}
