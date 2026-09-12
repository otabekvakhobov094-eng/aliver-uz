'use client';

import Link from 'next/link';
import { t } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { Badge, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { DataList, type DataColumn } from '@/components/DataList';
import { adminApi, type AdminReturnRow } from '@/lib/api';
import {
  RETURN_REASON_LABEL,
  RETURN_STATUS_LABEL,
  RETURN_STATUS_TONE,
  fmtDateTime,
  label,
} from '@/lib/order-labels';

/** Qaytarishlar — TZ 52, TZ-2 4.3. */

const STATUSES = [
  { value: '', label: 'Barcha holatlar' },
  ...Object.entries(RETURN_STATUS_LABEL).map(([value, l]) => ({ value, label: l })),
];

const COLUMNS: Array<DataColumn<AdminReturnRow>> = [
  {
    key: 'number',
    label: 'Raqam',
    locked: true,
    render: (r) => (
      <>
        <Link href={`/returns/${r.id}`} style={{ fontWeight: 700, color: 'var(--alv-brand)' }}>
          {r.number}
        </Link>
        <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>{r.itemsCount} {t("pozitsiya")}</div>
      </>
    ),
  },
  {
    key: 'order',
    label: 'Buyurtma',
    render: (r) => r.orderNumber ?? <span style={{ color: 'var(--alv-muted)' }}>—</span>,
  },
  {
    key: 'phone',
    label: 'Telefon',
    render: (r) => r.contactPhone ?? <span style={{ color: 'var(--alv-muted)' }}>—</span>,
  },
  {
    key: 'reason',
    label: 'Sabab',
    render: (r) => label(RETURN_REASON_LABEL, r.reasonCode),
  },
  {
    key: 'status',
    label: 'Holat',
    render: (r) => (
      <Badge tone={RETURN_STATUS_TONE[r.status] ?? 'neutral'}>
        {label(RETURN_STATUS_LABEL, r.status)}
      </Badge>
    ),
  },
  {
    key: 'refund',
    label: 'Qaytariladigan',
    align: 'right',
    render: (r) => (
      <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {formatTiyin(r.refundAmount)}
      </strong>
    ),
  },
  {
    key: 'created',
    label: 'So‘ralgan',
    render: (r) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.createdAt)}</span>,
  },
];

const EMPTY = { q: '', status: '' };

export default function ReturnsPage() {
  const [items, setItems] = useState<AdminReturnRow[]>([]);
  const [total, setTotal] = useState(0);
  // Server qaytargan haqiqiy sahifa hajmi.
  const [perPage, setPerPage] = useState(30);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, unknown>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const f = filters as Record<string, string>;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.returns({
        q: f.q || undefined,
        status: f.status || undefined,
        page,
      });
      setItems(res.items);
      setTotal(res.total);
      if (res.perPage) setPerPage(res.perPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [f.q, f.status, page]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  function changeFilters(next: Record<string, unknown>) {
    setFilters(next);
    setPage(1);
  }

  /*
   * Sahifa hajmi SERVERDAN. Ilgari u mijozda 20 deb yozilgan edi,
   * server esa 30 ta qaytaradi: 100 ta yozuvda ro'yxat «1 / 5» deb
   * ko'rsatardi, beshinchi sahifa esa bo'sh chiqardi va operator
   * buni «oxirgilari o'chib ketibdi» deb tushunardi.
   */
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

  return (
    <AdminShell title={t("Qaytarishlar")}>
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
        {t("Jami")} {total} {t("ta so‘rov")}
      </p>

      <DataList<AdminReturnRow>
        storageKey="returns"
        columns={COLUMNS}
        rows={items}
        rowKey={(r) => r.id}
        filters={filters}
        onFiltersChange={changeFilters}
        loading={loading}
        onClearFilters={() => changeFilters(EMPTY)}
        emptyTitle={t("Qaytarish so‘rovi yo‘q")}
        emptyHint={t("Mijoz qaytarish so‘rasa, u shu yerda paydo bo‘ladi.")}
        noResultsTitle={t("Bu shartlarga mos so‘rov topilmadi")}
        filterBar={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <input
              type="search"
              value={f.q ?? ''}
              onChange={(e) => changeFilters({ ...filters, q: e.target.value })}
              placeholder={t("Qaytarish yoki buyurtma raqami, telefon")}
              aria-label={t("Qaytarish qidirish")}
              style={{ ...input, flex: '1 1 260px' }}
            />
            <select
              value={f.status ?? ''}
              onChange={(e) => changeFilters({ ...filters, status: e.target.value })}
              aria-label={t("Holat bo‘yicha filtr")}
              style={input}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.label)}
                </option>
              ))}
            </select>
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
                {t("Oldingi")}
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
                {t("Keyingi")}
              </button>
            </div>
          ) : null
        }
      />
    </AdminShell>
  );
}
