'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge, Button, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type ReconcileReport } from '@/lib/api';
import { MISMATCH_LABEL, label } from '@/lib/order-labels';

const PROVIDERS = [
  { value: 'PAYME', label: 'Payme' },
  { value: 'CLICK', label: 'Click' },
  { value: 'CASH_ON_DELIVERY', label: 'Naqd' },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * To'lovlarni moslashtirish.
 *
 * Savol oddiy: "provayder yozuvi bilan bizning yozuvimiz bir xilmi?".
 * Javob esa oy oxirida emas, har kuni kerak — shuning uchun bu ekran
 * eng shoshilinch farqlarni tepaga chiqaradi.
 */
export default function ReconcilePage() {
  const [provider, setProvider] = useState('PAYME');
  const [dateFrom, setDateFrom] = useState(isoDaysAgo(7));
  const [dateTo, setDateTo] = useState(isoDaysAgo(0));
  const [report, setReport] = useState<ReconcileReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setReport(await adminApi.reconcile(dateFrom, dateTo, provider));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ['Turi', 'Buyurtma', 'Tranzaksiya', 'Bizda (tiyin)', 'Provayderda (tiyin)', 'Izoh'],
      ...report.mismatches.map((m) => [
        label(MISMATCH_LABEL, m.kind),
        m.orderNumber ?? '',
        m.providerTxnId ?? '',
        m.localAmount ?? '',
        m.providerAmount ?? '',
        m.note,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    // Excel CSV ni UTF-8 deb tanishi uchun BOM kerak.
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moslashtirish-${provider}-${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const difference = report ? BigInt(report.totals.difference) : 0n;

  return (
    <AdminShell title="To‘lovlarni moslashtirish">
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <Field label="Provayder">
          <select value={provider} onChange={(e) => setProvider(e.target.value)} style={input}>
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sanadan">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={input}
          />
        </Field>
        <Field label="Sanagacha">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={input}
          />
        </Field>
        <Button variant="primary" disabled={busy} onClick={() => void run()}>
          {busy ? 'Solishtirilmoqda…' : 'Solishtirish'}
        </Button>
        {report && report.mismatches.length > 0 ? (
          <Button variant="ghost" onClick={exportCsv}>
            CSV yuklab olish
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" style={{ color: 'var(--alv-danger)', fontWeight: 600 }}>
          {error}
        </p>
      ) : null}

      {report ? (
        <>
          {report.mode === 'mock' ? (
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
              Manba: {report.source}. Bu MUSTAQIL manba emas — haqiqiy moslashtirish provayder
              vypiskasi ulangandan keyin ishlaydi. Ekran va hisobot mantiqi esa hozirdan tayyor.
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
            <Stat label="Bizda (to‘langan)" value={formatTiyin(report.totals.localPaid)} />
            <Stat label="Provayderda" value={formatTiyin(report.totals.providerPerformed)} />
            <Stat
              label="Farq"
              value={formatTiyin(report.totals.difference)}
              tone={difference === 0n ? 'mint' : 'low'}
            />
            <Stat label="Mos kelgan" value={String(report.matched)} />
            <Stat
              label="Farqlar"
              value={String(report.mismatches.length)}
              tone={report.mismatches.length === 0 ? 'mint' : 'low'}
            />
          </div>

          {report.mismatches.length === 0 ? (
            <div
              style={{
                padding: 24,
                borderRadius: 'var(--alv-radius-lg)',
                background: 'var(--alv-mint-soft)',
                color: 'var(--alv-mint)',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              Farq topilmadi — {report.checkedLocal} ta yozuv va {report.checkedProvider} ta
              tranzaksiya to‘liq mos keldi.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ fontSize: 12.5, color: 'var(--alv-muted)', textAlign: 'left' }}>
                    <th style={th}>Turi</th>
                    <th style={th}>Buyurtma</th>
                    <th style={th}>Tranzaksiya</th>
                    <th style={{ ...th, textAlign: 'right' }}>Bizda</th>
                    <th style={{ ...th, textAlign: 'right' }}>Provayderda</th>
                    <th style={th}>Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {report.mismatches.map((m, i) => (
                    <tr
                      key={`${m.kind}-${m.providerTxnId ?? i}`}
                      style={{ borderTop: '1px solid var(--alv-line)' }}
                    >
                      <td style={td}>
                        <Badge tone={m.severity === 1 ? 'low' : 'neutral'}>
                          {label(MISMATCH_LABEL, m.kind)}
                        </Badge>
                      </td>
                      <td style={td}>
                        {m.paymentId ? (
                          <Link
                            href={`/payments/${m.paymentId}`}
                            style={{ color: 'var(--alv-brand)', fontWeight: 700 }}
                          >
                            {m.orderNumber ?? m.paymentId.slice(0, 8)}
                          </Link>
                        ) : (
                          (m.orderNumber ?? '—')
                        )}
                      </td>
                      <td style={{ ...td, fontSize: 12, wordBreak: 'break-all' }}>
                        {m.providerTxnId ?? '—'}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {m.localAmount ? formatTiyin(m.localAmount) : '—'}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {m.providerAmount ? formatTiyin(m.providerAmount) : '—'}
                      </td>
                      <td
                        style={{ ...td, fontSize: 12.5, color: 'var(--alv-ink-2)', maxWidth: 340 }}
                      >
                        {m.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p style={{ color: 'var(--alv-muted)' }}>
          Davr va provayderni tanlab «Solishtirish» tugmasini bosing.
        </p>
      )}
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

function Field({ label: text, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>{text}</span>
      {children}
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
        minWidth: 150,
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
