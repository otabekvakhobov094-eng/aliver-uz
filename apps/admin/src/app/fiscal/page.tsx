'use client';

import Link from 'next/link';
import { t } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { DataList, type BulkAction, type DataColumn } from '@/components/DataList';
import { adminApi, type FiscalReceiptRow } from '@/lib/api';
import {
  FISCAL_STATUS_LABEL,
  FISCAL_STATUS_TONE,
  FISCAL_TYPE_LABEL,
  fmtDateTime,
  label,
} from '@/lib/order-labels';

/**
 * Fiskal cheklar — TZ 40, ekspertiza A-1.
 *
 * Ro'yxat platformasiga oxirgi bo'lib o'tkazildi va bu ataylab: avval
 * uning OMMAVIY AMALLARI nimaligini bilish kerak edi, aks holda
 * ko'chirish faqat ko'rinishni almashtirardi.
 *
 * Javob amaliyotdan keladi: OFD yiqilgan kun o'nlab chek FAILED bo'lib
 * qoladi va operator ularni hozircha BITTALAB bosadi. Shuning uchun
 * ommaviy amallar — qayta yuborish va bekor qilish.
 */

const STATUSES = [
  { value: '', label: 'Hammasi' },
  ...Object.entries(FISCAL_STATUS_LABEL).map(([value, l]) => ({ value, label: l })),
];

const COLUMNS: Array<DataColumn<FiscalReceiptRow>> = [
  {
    key: 'order',
    label: 'Buyurtma',
    locked: true,
    render: (r) => (
      <>
        <Link href={`/orders/${r.orderId}`} style={{ fontWeight: 700, color: 'var(--alv-brand)' }}>
          {r.orderNumber ?? '—'}
        </Link>
        <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
          {label(FISCAL_TYPE_LABEL, r.type)}
        </div>
      </>
    ),
  },
  {
    key: 'status',
    label: 'Holat',
    render: (r) => (
      <Badge tone={FISCAL_STATUS_TONE[r.status] ?? 'neutral'}>
        {label(FISCAL_STATUS_LABEL, r.status)}
      </Badge>
    ),
  },
  {
    key: 'total',
    label: 'Summa',
    align: 'right',
    render: (r) => (
      <strong style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {formatTiyin(r.totalAmount)}
      </strong>
    ),
  },
  {
    key: 'vat',
    label: 'QQS',
    align: 'right',
    defaultVisible: false,
    render: (r) => (
      <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {formatTiyin(r.vatAmount)}
      </span>
    ),
  },
  {
    key: 'attempts',
    label: 'Urinish',
    align: 'right',
    // Ko'p urinish — muammo belgisi, shuning uchun ajratib ko'rsatiladi.
    render: (r) => (
      <span
        style={{
          fontVariantNumeric: 'tabular-nums',
          color: r.attempts >= 3 ? 'var(--alv-danger)' : undefined,
          fontWeight: r.attempts >= 3 ? 700 : 400,
        }}
      >
        {r.attempts}
      </span>
    ),
  },
  {
    key: 'error',
    label: 'Oxirgi xato',
    render: (r) =>
      r.lastError ? (
        <span style={{ color: 'var(--alv-danger)', fontSize: 13 }}>{r.lastError}</span>
      ) : (
        <span style={{ color: 'var(--alv-muted)' }}>—</span>
      ),
  },
  {
    key: 'sign',
    label: 'Fiskal belgi',
    defaultVisible: false,
    render: (r) =>
      r.fiscalSign ? (
        <code style={{ fontSize: 12 }}>{r.fiscalSign}</code>
      ) : (
        <span style={{ color: 'var(--alv-muted)' }}>—</span>
      ),
  },
  {
    key: 'sentAt',
    label: 'Yuborilgan',
    render: (r) => (
      <span style={{ whiteSpace: 'nowrap', color: r.sentAt ? undefined : 'var(--alv-muted)' }}>
        {r.sentAt ? fmtDateTime(r.sentAt) : '—'}
      </span>
    ),
  },
  {
    key: 'created',
    label: 'Yaratilgan',
    defaultVisible: false,
    render: (r) => <span style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.createdAt)}</span>,
  },
];

const EMPTY = { status: '' };

export default function FiscalPage() {
  const [items, setItems] = useState<FiscalReceiptRow[]>([]);
  const [total, setTotal] = useState(0);
  const [mock, setMock] = useState(false);
  const [filters, setFilters] = useState<Record<string, unknown>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const status = (filters as Record<string, string>).status ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.fiscalReceipts({ status: status || undefined });
      setItems(res.items);
      setTotal(res.total);
      setMock(res.mock);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const bulkActions: BulkAction[] = useMemo(
    () => [
      {
        key: 'retry',
        label: 'Qayta yuborish',
        run: async (ids) => {
          const res = await adminApi.bulkRetryFiscal(ids);
          // Qisman muvaffaqiyatsizlik yashirilmaydi: yuborilmagan chek
          // qonun buzilishi, va operator qaysi biri ekanini bilishi shart.
          if (res.failed.length === 0) return `${res.sent} ta chek yuborildi.`;
          return (
            `${res.sent} ta yuborildi, ${res.failed.length} tasi o‘tmadi: ` +
            res.failed.map((f) => f.message ?? f.id).join('; ')
          );
        },
      },
      {
        key: 'cancel',
        label: 'Bekor qilish',
        run: async (ids) => {
          // Sabab majburiy — chekni bekor qilish audit qilinadigan amal.
          const reason = window.prompt('Bekor qilish sababi (kamida 3 belgi):')?.trim() ?? '';
          if (reason.length < 3) return 'Sabab ko‘rsatilmagani uchun bekor qilinmadi.';
          const res = await adminApi.bulkCancelFiscal(ids, reason);
          if (res.failed.length === 0) return `${res.cancelled} ta chek bekor qilindi.`;
          return (
            `${res.cancelled} ta bekor qilindi, ${res.failed.length} tasi o‘tmadi: ` +
            res.failed.map((f) => f.message ?? f.id).join('; ')
          );
        },
      },
    ],
    [],
  );

  async function runQueue() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminApi.runFiscalQueue();
      setNotice(`Navbat ishga tushdi: ${res.sent} yuborildi, ${res.failed} xato.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title={t("Fiskal cheklar")}>
      {mock ? (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            background: 'var(--alv-warn-soft)',
            color: 'var(--alv-warn)',
            fontWeight: 600,
            fontSize: 13.5,
            marginBottom: 16,
            lineHeight: 1.55,
          }}
        >
          {t("MAKET rejimi: cheklar shakllantirilmoqda va saqlanmoqda, lekin OFD ga yuborilmayapti. Provayder tanlanib shartnoma imzolangach")} <code>OFD_PROVIDER</code> {t("ni o‘zgartiring — boshqa hech narsani o‘zgartirish shart emas.")}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="alv-card"
          style={{ padding: 14, marginBottom: 14, borderLeft: '3px solid var(--alv-danger)' }}
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="alv-card"
          style={{ padding: 14, marginBottom: 14, borderLeft: '3px solid var(--alv-mint)' }}
        >
          {notice}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 14 }}>{t("Jami")} {total} {t("ta chek")}</p>
        <button
          type="button"
          onClick={() => void runQueue()}
          disabled={busy}
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            border: '1px solid var(--alv-line)',
            background: 'var(--alv-surface)',
            color: 'var(--alv-ink)',
            fontWeight: 600,
            fontSize: 14,
            cursor: busy ? 'progress' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? t("Ishlamoqda…") : t("Navbatni ishga tushirish")}
        </button>
      </div>

      <DataList<FiscalReceiptRow>
        storageKey="fiscal"
        columns={COLUMNS}
        rows={items}
        rowKey={(r) => r.id}
        filters={filters}
        onFiltersChange={setFilters}
        loading={loading}
        bulkActions={bulkActions}
        onDone={load}
        onClearFilters={() => setFilters(EMPTY)}
        emptyTitle={t("Hali chek yo‘q")}
        emptyHint={t("Birinchi to‘langan buyurtmadan keyin chek shu yerda paydo bo‘ladi.")}
        noResultsTitle={t("Bu holatda chek topilmadi")}
        filterBar={
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>{t("Holat")}</span>
            <select
              value={status}
              onChange={(e) => setFilters({ status: e.target.value })}
              style={{
                padding: '9px 12px',
                borderRadius: 10,
                border: '1px solid var(--alv-line)',
                fontSize: 14,
                background: 'var(--alv-surface)',
                color: 'var(--alv-ink)',
              }}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.label)}
                </option>
              ))}
            </select>
          </label>
        }
      />
    </AdminShell>
  );
}
