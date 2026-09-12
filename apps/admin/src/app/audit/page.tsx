'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import { Badge, Button } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AuditDetail, type AuditRow } from '@/lib/api';
import { fmtDateTime } from '@/lib/order-labels';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Qiymatni ro'yxatda qisqa ko'rsatish. */
function short(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') {
    const text = JSON.stringify(value);
    return text.length > 60 ? `${text.slice(0, 60)}…` : text;
  }
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

/**
 * Audit log.
 *
 * Yozuvlar FAQAT o'qish uchun: tahrirlash yoki o'chirish tugmasi
 * ataylab yo'q — aks holda audit logning ma'nosi qolmasdi.
 */
export default function AuditPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState<{ modules: string[]; actions: string[] }>({
    modules: [],
    actions: [],
  });
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState(isoDaysAgo(7));
  const [dateTo, setDateTo] = useState(isoDaysAgo(0));
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminApi.audit({
        module: module || undefined,
        action: action || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }, [module, action, dateFrom, dateTo, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    adminApi
      .auditFacets()
      .then(setFacets)
      .catch(() => undefined);
  }, []);

  const open = async (id: string) => {
    try {
      setDetail(await adminApi.auditEntry(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  };

  return (
    <AdminShell title={t("Audit log")}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <Select
          label={t("Modul")}
          value={module}
          onChange={(v) => {
            setModule(v);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Hammasi' },
            ...facets.modules.map((m) => ({ value: m, label: m })),
          ]}
        />
        <Select
          label={t("Harakat")}
          value={action}
          onChange={(v) => {
            setAction(v);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Hammasi' },
            ...facets.actions.map((a) => ({ value: a, label: a })),
          ]}
        />
        <DateField
          label={t("Sanadan")}
          value={dateFrom}
          onChange={(v) => {
            setDateFrom(v);
            setPage(1);
          }}
        />
        <DateField
          label={t("Sanagacha")}
          value={dateTo}
          onChange={(v) => {
            setDateTo(v);
            setPage(1);
          }}
        />
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--alv-muted)' }}>
          {t("Jami:")} {total}
        </span>
      </div>

      {error ? (
        <p role="alert" style={{ color: 'var(--alv-danger)', fontWeight: 600 }}>
          {error}
        </p>
      ) : null}

      <div className="alv-admin-cols">
        <section style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
            <thead>
              <tr style={{ fontSize: 12.5, color: 'var(--alv-muted)', textAlign: 'left' }}>
                <th style={th}>{t("Vaqt")}</th>
                <th style={th}>{t("Kim")}</th>
                <th style={th}>{t("Nima")}</th>
                <th style={th}>{t("O‘zgargan maydonlar")}</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr
                  key={r.id}
                  style={{
                    borderTop: '1px solid var(--alv-line)',
                    background: detail?.id === r.id ? 'var(--alv-surface-2)' : undefined,
                  }}
                >
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDateTime(r.createdAt)}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{r.adminName ?? t("Tizim")}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--alv-muted)' }}>{r.ip ?? '—'}</div>
                  </td>
                  <td style={td}>
                    <Badge tone="neutral">{r.module}</Badge>
                    <div style={{ fontSize: 12, marginTop: 4 }}>{r.action}</div>
                  </td>
                  <td style={{ ...td, fontSize: 12.5 }}>
                    {r.changedFields.length === 0 ? (
                      <span style={{ color: 'var(--alv-muted)' }}>—</span>
                    ) : (
                      r.changedFields.join(', ')
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <Button variant="ghost" size="sm" onClick={() => void open(r.id)}>
                      {t("Ochish")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 ? (
            <p style={{ color: 'var(--alv-muted)' }}>{t("Yozuv topilmadi.")}</p>
          ) : null}

          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={pager(page <= 1)}
            >
              {t("← Oldingi")}
            </button>
            <span style={{ fontSize: 13, color: 'var(--alv-muted)' }}>{page}{t("-sahifa")}</span>
            <button
              type="button"
              disabled={items.length < 50}
              onClick={() => setPage((p) => p + 1)}
              style={pager(items.length < 50)}
            >
              {t("Keyingi →")}
            </button>
          </div>
        </section>

        <section
          style={{
            background: 'var(--alv-surface)',
            borderRadius: 'var(--alv-radius-lg)',
            padding: 18,
            boxShadow: 'var(--alv-shadow-sm)',
            display: 'grid',
            gap: 12,
            alignSelf: 'start',
          }}
        >
          <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 16, margin: 0 }}>
            {detail ? `${detail.module} · ${detail.action}` : t("Yozuvni tanlang")}
          </h2>

          {!detail ? (
            <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13.5 }}>
              {t("Chapdagi ro‘yxatdan yozuvni oching — oldingi va keyingi qiymatlar shu yerda yonma-yon ko‘rinadi.")}
            </p>
          ) : (
            <>
              <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: 13 }}>
                <Line k="Vaqt" v={fmtDateTime(detail.createdAt)} />
                <Line k="Kim" v={detail.adminName ?? 'Tizim'} />
                {detail.adminEmail ? <Line k="Email" v={detail.adminEmail} /> : null}
                <Line k="IP" v={detail.ip ?? '—'} />
                {detail.recordId ? <Line k="Yozuv id" v={detail.recordId} /> : null}
              </dl>

              <div style={{ height: 1, background: 'var(--alv-line)' }} />

              {detail.diff.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13.5 }}>
                  {t("Maydonlar o‘zgarmagan.")}
                </p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {detail.diff.map((d) => (
                    <div key={d.field} style={{ fontSize: 12.5 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.field}</div>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <div
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: 'var(--alv-danger-soft)',
                            color: 'var(--alv-danger)',
                          }}
                        >
                          − {short(d.before)}
                        </div>
                        <div
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            background: 'var(--alv-mint-soft)',
                            color: 'var(--alv-mint)',
                          }}
                        >
                          + {short(d.after)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
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

function Select({
  label,
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
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={input}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.label)}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} style={input} />
    </label>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--alv-muted)', fontWeight: 600 }}>{k}</span>
      <span style={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
    </div>
  );
}
