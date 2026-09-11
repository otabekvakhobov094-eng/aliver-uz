'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { DataList, type BulkAction, type DataColumn } from '@/components/DataList';
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

/**
 * Buyurtmalar ro'yxati — TZ 35, TZ-2 4.3.
 *
 * Saqlangan ko'rinishlar aynan shu sahifada eng ko'p foyda beradi:
 * «yig'ilmagan, Toshkent, oxirgi 7 kun» har kuni qayta teriladigan
 * filtr edi, endi bitta tab.
 */

const STATUS_FILTERS = [
  { value: '', label: 'Barcha holatlar' },
  ...Object.entries(ORDER_STATUS_LABEL).map(([value, l]) => ({ value, label: l })),
];

const PAYMENT_FILTERS = [
  { value: '', label: 'Barcha to‘lovlar' },
  ...Object.entries(PAYMENT_STATUS_LABEL).map(([value, l]) => ({ value, label: l })),
];

/**
 * Kundalik o'tishlar. Ilgali bu yerda 11 ta holatli ochiluvchi ro'yxat
 * bor edi; amalda operator kuniga shu to'rttasini ishlatadi, qolganlari
 * buyurtma sahifasida yakka tartibda o'zgartiriladi.
 */
const BULK_TRANSITIONS: Array<{ key: string; label: string; status: string }> = [
  { key: 'confirm', label: 'Tasdiqlash', status: 'CONFIRMED' },
  { key: 'process', label: 'Yig‘ishga', status: 'PROCESSING' },
  { key: 'ship', label: 'Jo‘natildi', status: 'SHIPPED' },
  { key: 'deliver', label: 'Yetkazildi', status: 'DELIVERED' },
];

const COLUMNS: Array<DataColumn<AdminOrderRow>> = [
  {
    key: 'number',
    label: 'Raqam',
    locked: true,
    render: (o) => (
      <>
        <Link href={`/orders/${o.id}`} style={{ fontWeight: 700, color: 'var(--alv-brand)' }}>
          {o.number}
        </Link>
        <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>{o.itemsCount} pozitsiya</div>
      </>
    ),
  },
  {
    key: 'placedAt',
    label: 'Sana',
    render: (o) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(o.placedAt)}</span>,
  },
  {
    key: 'customer',
    label: 'Mijoz',
    minWidth: 180,
    render: (o) => (
      <>
        <div style={{ fontWeight: 600 }}>{[o.firstName, o.lastName].filter(Boolean).join(' ')}</div>
        <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>{o.contactPhone}</div>
      </>
    ),
  },
  { key: 'region', label: 'Hudud', render: (o) => o.regionName ?? '—' },
  {
    key: 'status',
    label: 'Holat',
    render: (o) => (
      <Badge tone={ORDER_STATUS_TONE[o.status] ?? 'neutral'}>
        {label(ORDER_STATUS_LABEL, o.status)}
      </Badge>
    ),
  },
  {
    key: 'payment',
    label: 'To‘lov',
    render: (o) => (
      <>
        <div>{label(PAYMENT_STATUS_LABEL, o.paymentStatus)}</div>
        <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
          {o.paymentProvider ? label(PAYMENT_PROVIDER_LABEL, o.paymentProvider) : '—'}
        </div>
      </>
    ),
  },
  {
    key: 'total',
    label: 'Summa',
    align: 'right',
    render: (o) => (
      <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {formatTiyin(o.grandTotal)}
      </strong>
    ),
  },
  {
    key: 'reservation',
    label: 'Rezerv',
    render: (o) => {
      const left = reservationLeft(o.reservationExpiresAt);
      if (!left) return <span style={{ color: 'var(--alv-muted)' }}>—</span>;
      return (
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            color: left === 'muddati o‘tgan' ? 'var(--alv-danger)' : 'var(--alv-warn)',
          }}
        >
          {left}
        </span>
      );
    },
  },
];

const EMPTY_FILTERS = { q: '', status: '', paymentStatus: '', dateFrom: '', dateTo: '' };

export default function OrdersPage() {
  const [items, setItems] = useState<AdminOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, unknown>>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const f = filters as Record<string, string>;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.orders({
        q: f.q || undefined,
        status: f.status || undefined,
        paymentStatus: f.paymentStatus || undefined,
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
  }, [f.q, f.status, f.paymentStatus, f.dateFrom, f.dateTo, page]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  // Filtr o'zgarganda birinchi sahifaga qaytamiz: aks holda 3-sahifada
  // turib filtr qo'ysa, natija bo'sh chiqadi va sababi ko'rinmaydi.
  function changeFilters(next: Record<string, unknown>) {
    setFilters(next);
    setPage(1);
  }

  const bulkActions: BulkAction[] = useMemo(
    () =>
      BULK_TRANSITIONS.map((t) => ({
        key: t.key,
        label: t.label,
        run: async (ids: string[]) => {
          const res = await adminApi.bulkOrderStatus(ids, t.status);
          // Qisman muvaffaqiyatsizlikni yashirmaymiz: holat mashinasi
          // ba'zi o'tishlarni rad etadi va operator qaysi buyurtma va
          // nega o'tmaganini bilishi kerak.
          if (res.failed.length === 0) return `${res.changed} ta buyurtma o‘zgartirildi.`;
          return (
            `${res.changed} ta o‘zgartirildi, ${res.failed.length} tasi o‘tmadi: ` +
            res.failed.map((x) => `${x.number ?? x.orderId} — ${x.message}`).join('; ')
          );
        },
      })),
    [],
  );

  const perPage = 20;
  const pages = Math.max(1, Math.ceil(total / perPage));

  const input: React.CSSProperties = {
    padding: '9px 12px',
    borderRadius: 10,
    border: '1px solid var(--alv-line)',
    fontSize: 14,
    background: 'var(--alv-surface)',
    color: 'var(--alv-ink)',
    minWidth: 0,
  };
  const pageBtn = (on: boolean): React.CSSProperties => ({
    minWidth: 38,
    height: 38,
    borderRadius: 10,
    border: '1px solid var(--alv-line)',
    background: on ? 'var(--alv-ink)' : 'var(--alv-surface)',
    color: on ? '#fff' : 'var(--alv-ink)',
    fontWeight: 600,
    cursor: 'pointer',
    fontVariantNumeric: 'tabular-nums',
  });

  return (
    <AdminShell title="Buyurtmalar">
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
        Jami {total} ta buyurtma
      </p>

      <DataList<AdminOrderRow>
        storageKey="orders"
        columns={COLUMNS}
        rows={items}
        rowKey={(o) => o.id}
        filters={filters}
        onFiltersChange={changeFilters}
        loading={loading}
        bulkActions={bulkActions}
        onDone={load}
        onClearFilters={() => changeFilters(EMPTY_FILTERS)}
        emptyTitle="Hali buyurtma yo‘q"
        emptyHint="Birinchi buyurtma berilgach u shu yerda paydo bo‘ladi."
        noResultsTitle="Bu shartlarga mos buyurtma topilmadi"
        filterBar={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
            <input
              type="search"
              value={f.q ?? ''}
              onChange={(e) => changeFilters({ ...filters, q: e.target.value })}
              placeholder="Raqam, telefon yoki ism"
              aria-label="Buyurtma qidirish"
              style={{ ...input, flex: '1 1 240px' }}
            />
            <select
              value={f.status ?? ''}
              onChange={(e) => changeFilters({ ...filters, status: e.target.value })}
              aria-label="Holat bo‘yicha filtr"
              style={input}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={f.paymentStatus ?? ''}
              onChange={(e) => changeFilters({ ...filters, paymentStatus: e.target.value })}
              aria-label="To‘lov holati bo‘yicha filtr"
              style={input}
            >
              {PAYMENT_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ ...pageBtn(false), opacity: page === 1 ? 0.5 : 1, padding: '0 14px' }}
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
                style={{ ...pageBtn(false), opacity: page === pages ? 0.5 : 1, padding: '0 14px' }}
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
