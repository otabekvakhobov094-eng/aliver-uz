'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type ReportOverview } from '@/lib/api';

/**
 * Hisobotlar — TZ 55.
 *
 * Ilgari bu sahifada uchta muammo bor edi va uchalasi ham bir xil
 * sababdan: sahifa faqat baxtli yo'lni ko'zda tutgandi.
 *
 *   1. Davr tanlagichi yo'q — har doim oxirgi 30 kun ko'rsatilardi va
 *      buni o'zgartirishning yo'li yo'q edi.
 *   2. Eksport yo'q — raqamni buxgalterga yuborish uchun ekrandan
 *      ko'chirib yozish kerak edi.
 *   3. Xato holati yo'q. `useEffect` ichidagi `.then(setReport)` da
 *      `catch` yo'q edi, shuning uchun API yiqilsa sahifa CHEKSIZ
 *      «Yuklanmoqda…» da qolardi va sabab hech qayerda ko'rinmasdi.
 */

const PERIODS = [
  { key: 'today', label: 'Bugun' },
  { key: 'yesterday', label: 'Kecha' },
  { key: '7d', label: '7 kun' },
  { key: '30d', label: '30 kun' },
  { key: 'month', label: 'Shu oy' },
  { key: 'custom', label: 'Boshqa' },
];

function money(value: string | null | undefined): string {
  return `${(Number(value ?? 0) / 100).toLocaleString('uz-UZ')} so‘m`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportOverview | null>(null);
  const [period, setPeriod] = useState('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(
        await adminApi.reportOverview(
          period,
          period === 'custom' ? from || undefined : undefined,
          period === 'custom' ? to || undefined : undefined,
        ),
      );
    } catch (e) {
      // Eski holat ekranda qolmasin: eski raqamlar yangi davr yozuvi
      // bilan birga ko'rinsa, ular to'g'ri deb o'qiladi.
      setReport(null);
      setError(e instanceof Error ? e.message : 'Hisobotni yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, [period, from, to]);

  useEffect(() => {
    // «Boshqa» tanlanib, sanalar hali kiritilmagan bo'lsa so'rov yubormaymiz.
    if (period === 'custom' && (!from || !to)) {
      setLoading(false);
      return;
    }
    void load();
  }, [load, period, from, to]);

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      await adminApi.exportReportCsv(
        period,
        period === 'custom' ? from || undefined : undefined,
        period === 'custom' ? to || undefined : undefined,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eksport qilib bo‘lmadi');
    } finally {
      setExporting(false);
    }
  }

  const cards: Array<[string, string | number]> = report
    ? [
        ['Buyurtmalar', report.orders.count],
        ['Tushum', money(report.orders.revenue)],
        ['Yangi mijozlar', report.newCustomers],
        ['Chegirmalar', money(report.orders.discount)],
      ]
    : [];

  return (
    <AdminShell title="Hisobotlar">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: 18 }}>
        <div role="group" aria-label="Davr" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              aria-pressed={period === p.key}
              style={{
                padding: '8px 14px',
                borderRadius: 9,
                border: '1px solid var(--alv-line)',
                background: period === p.key ? 'var(--alv-ink)' : 'var(--alv-surface)',
                color: period === p.key ? '#fff' : 'var(--alv-ink)',
                fontWeight: period === p.key ? 700 : 500,
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' ? (
          <>
            <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--alv-muted)' }}>Sanadan</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={FIELD} />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
              <span style={{ color: 'var(--alv-muted)' }}>Sanagacha</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={FIELD} />
            </label>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => void exportCsv()}
          disabled={exporting || !report}
          style={{
            marginLeft: 'auto',
            padding: '9px 18px',
            borderRadius: 10,
            border: '1px solid var(--alv-line)',
            background: 'var(--alv-surface)',
            color: 'var(--alv-ink)',
            fontWeight: 600,
            fontSize: 14,
            cursor: exporting ? 'progress' : 'pointer',
            opacity: exporting || !report ? 0.55 : 1,
          }}
        >
          {exporting ? 'Tayyorlanmoqda…' : 'CSV yuklab olish'}
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="alv-card"
          style={{ padding: 16, marginBottom: 16, borderLeft: '3px solid var(--alv-danger)' }}
        >
          <strong style={{ display: 'block', marginBottom: 4 }}>Hisobot olinmadi</strong>
          <span style={{ fontSize: 14, color: 'var(--alv-ink-2)' }}>{error}</span>
          <div style={{ marginTop: 12 }}>
            <button type="button" onClick={() => void load()} style={RETRY}>
              Qayta urinish
            </button>
          </div>
        </div>
      ) : null}

      {period === 'custom' && (!from || !to) ? (
        <p style={{ color: 'var(--alv-muted)' }}>Ikkala sanani ham tanlang.</p>
      ) : loading ? (
        <p style={{ color: 'var(--alv-muted)' }}>Yuklanmoqda…</p>
      ) : !report ? null : (
        <>
          <p style={{ margin: '0 0 16px', color: 'var(--alv-muted)', fontSize: 13.5 }}>
            {fmtDate(report.period.from)} — {fmtDate(report.period.to)}. Faqat to‘langan
            buyurtmalar hisobga olinadi.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
            {cards.map(([label, value]) => (
              <div className="alv-card" style={{ padding: 20 }} key={label}>
                <div style={{ color: 'var(--alv-muted)', fontSize: 13 }}>{label}</div>
                <strong style={{ fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>{value}</strong>
              </div>
            ))}
          </div>

          <Section title="Top mahsulotlar" empty="Bu davrda sotuv bo‘lmagan.">
            {report.topProducts.map((p) => (
              <Row
                key={p.productName}
                left={p.productName}
                right={`${p._sum.quantity ?? 0} dona · ${money(p._sum.lineTotal)}`}
              />
            ))}
          </Section>

          <Section title="Marketing atributsiyasi" empty="UTM belgilangan buyurtma yo‘q.">
            {report.attribution.map((row) => (
              <Row
                key={row.utmSource ?? 'direct'}
                left={row.utmSource ?? 'to‘g‘ridan-to‘g‘ri'}
                right={`${row._count} ta · ${money(row._sum.grandTotal)}`}
              />
            ))}
          </Section>
        </>
      )}
    </AdminShell>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  const has = Array.isArray(children) && children.length > 0;
  return (
    <>
      <h2 style={{ marginTop: 30, fontSize: 18 }}>{title}</h2>
      <div className="alv-card" style={{ overflow: 'hidden' }}>
        {has ? (
          children
        ) : (
          <p style={{ padding: 18, margin: 0, color: 'var(--alv-muted)', fontSize: 14 }}>{empty}</p>
        )}
      </div>
    </>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 14,
        padding: 14,
        borderBottom: '1px solid var(--alv-line)',
      }}
    >
      <span style={{ minWidth: 0, overflowWrap: 'break-word' }}>{left}</span>
      <strong style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{right}</strong>
    </div>
  );
}

const FIELD: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid var(--alv-line)',
  fontSize: 14,
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  fontFamily: 'inherit',
};

const RETRY: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 9,
  border: '1px solid var(--alv-line)',
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  fontSize: 13.5,
  cursor: 'pointer',
};
