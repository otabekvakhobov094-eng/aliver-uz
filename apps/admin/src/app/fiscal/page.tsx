'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type FiscalReceiptRow } from '@/lib/api';
import {
  FISCAL_STATUS_LABEL,
  FISCAL_STATUS_TONE,
  FISCAL_TYPE_LABEL,
  fmtDateTime,
  label,
} from '@/lib/order-labels';

const STATUSES = [
  { value: '', label: 'Hammasi' },
  ...Object.entries(FISCAL_STATUS_LABEL).map(([value, l]) => ({ value, label: l })),
];

export default function FiscalPage() {
  const [items, setItems] = useState<FiscalReceiptRow[]>([]);
  const [total, setTotal] = useState(0);
  const [mock, setMock] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminApi.fiscalReceipts({ status: status || undefined });
      setItems(res.items);
      setTotal(res.total);
      setMock(res.mock);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = async (id: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminApi.retryFiscalReceipt(id);
      setNotice(res.status === 'SENT' ? 'Chek yuborildi.' : `Yuborilmadi: ${res.error ?? '—'}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const rebuild = async (orderId: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminApi.rebuildFiscalReceipt(orderId);
      setNotice(res.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const runQueue = async () => {
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
  };

  return (
    <AdminShell title="Fiskal cheklar">
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
          MAKET rejimi: cheklar shakllantirilmoqda va saqlanmoqda, lekin OFD ga yuborilmayapti.
          Provayder tanlanib shartnoma imzolangach <code>OFD_PROVIDER</code> ni o‘zgartiring —
          boshqa hech narsani o‘zgartirish shart emas.
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>Holat</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              minHeight: 44,
              padding: '10px 12px',
              borderRadius: 12,
              border: 0,
              boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
              font: 'inherit',
              background: 'var(--alv-surface)',
            }}
          >
            {STATUSES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <Button variant="outline" disabled={busy} onClick={() => void runQueue()}>
          Navbatni ishga tushirish
        </Button>

        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--alv-muted)' }}>
          Jami: {total}
        </span>
      </div>

      {error ? (
        <p role="alert" style={{ color: 'var(--alv-danger)', fontWeight: 600 }}>
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" style={{ color: 'var(--alv-mint)', fontWeight: 600 }}>
          {notice}
        </p>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
          <thead>
            <tr style={{ fontSize: 12.5, color: 'var(--alv-muted)', textAlign: 'left' }}>
              <th style={th}>Buyurtma</th>
              <th style={th}>Turi</th>
              <th style={th}>Holat</th>
              <th style={{ ...th, textAlign: 'right' }}>Summa</th>
              <th style={{ ...th, textAlign: 'right' }}>QQS</th>
              <th style={th}>Fiskal belgi</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--alv-line)' }}>
                <td style={td}>
                  <Link
                    href={`/orders/${r.orderId}`}
                    style={{ fontWeight: 700, color: 'var(--alv-brand)' }}
                  >
                    {r.orderNumber ?? r.orderId.slice(0, 8)}
                  </Link>
                  <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                    {fmtDateTime(r.createdAt)}
                  </div>
                </td>
                <td style={td}>{label(FISCAL_TYPE_LABEL, r.type)}</td>
                <td style={td}>
                  <Badge tone={FISCAL_STATUS_TONE[r.status] ?? 'neutral'}>
                    {label(FISCAL_STATUS_LABEL, r.status)}
                  </Badge>
                  {r.lastError ? (
                    <div style={{ fontSize: 11.5, color: 'var(--alv-danger)', marginTop: 4 }}>
                      {r.lastError}
                    </div>
                  ) : null}
                  {r.attempts > 0 ? (
                    <div style={{ fontSize: 11.5, color: 'var(--alv-muted)', marginTop: 2 }}>
                      {r.attempts} urinish
                      {r.nextRetryAt ? ` · keyingisi ${fmtDateTime(r.nextRetryAt)}` : ''}
                    </div>
                  ) : null}
                </td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                  {formatTiyin(r.totalAmount)}
                </td>
                <td style={{ ...td, textAlign: 'right', color: 'var(--alv-muted)' }}>
                  {formatTiyin(r.vatAmount)}
                </td>
                <td style={{ ...td, fontSize: 12 }}>
                  {r.receiptUrl ? (
                    <a
                      href={r.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--alv-brand)' }}
                    >
                      {r.fiscalSign ?? 'Chek'}
                    </a>
                  ) : (
                    (r.fiscalSign ?? '—')
                  )}
                </td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {r.status !== 'SENT' && r.status !== 'CANCELLED' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void retry(r.id)}
                    >
                      Qayta yuborish
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length === 0 ? <p style={{ color: 'var(--alv-muted)' }}>Chek topilmadi.</p> : null}
    </AdminShell>
  );
}

const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 700 };
const td: React.CSSProperties = { padding: 12, fontSize: 13.5, verticalAlign: 'top' };
