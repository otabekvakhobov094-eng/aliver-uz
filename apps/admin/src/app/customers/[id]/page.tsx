'use client';

import Link from 'next/link';
import { t } from '@/lib/i18n';
import { use, useCallback, useEffect, useState } from 'react';
import { Badge, Button, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { CustomerLoyalty } from '@/components/CustomerLoyalty';
import { adminApi, type AdminCustomerDetail } from '@/lib/api';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  RETURN_STATUS_LABEL,
  SEGMENT_LABEL,
  SEGMENT_TONE,
  fmtDateTime,
  label,
} from '@/lib/order-labels';

const CONSENT_LABEL: Record<string, string> = {
  PUBLIC_OFFER: 'Ommaviy oferta',
  PRIVACY_POLICY: 'Maxfiylik siyosati',
  MARKETING_SMS: 'Reklama SMS',
  MARKETING_TELEGRAM: 'Reklama Telegram',
  COOKIE_ANALYTICS: 'Analitika cookie',
  COOKIE_MARKETING: 'Marketing cookie',
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [c, setC] = useState<AdminCustomerDetail | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setC(await adminApi.customer(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const addNote = async () => {
    setBusy(true);
    try {
      setC(await adminApi.addCustomerNote(id, note.trim()));
      setNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async () => {
    if (!c) return;
    setBusy(true);
    try {
      setC(await adminApi.setCustomerStatus(id, c.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  if (!c) {
    return (
      <AdminShell title={t("Mijoz")}>
        {error ? (
          <p role="alert" style={{ color: 'var(--alv-danger)', fontWeight: 600 }}>
            {error}
          </p>
        ) : (
          <p style={{ color: 'var(--alv-muted)' }}>{t("Yuklanmoqda…")}</p>
        )}
      </AdminShell>
    );
  }

  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.phone;

  return (
    <AdminShell title={name}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/customers" style={{ fontSize: 13.5, color: 'var(--alv-muted)' }}>
          {t("← Mijozlar")}
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <Badge tone={SEGMENT_TONE[c.segment] ?? 'neutral'}>{label(SEGMENT_LABEL, c.segment)}</Badge>
        <Badge tone={c.status === 'ACTIVE' ? 'mint' : 'low'}>
          {c.status === 'ACTIVE' ? t("Faol") : t("Bloklangan")}
        </Badge>
        <span style={{ fontSize: 13.5 }}>{c.phone}</span>
        {c.email ? (
          <span style={{ fontSize: 13.5, color: 'var(--alv-muted)' }}>{c.email}</span>
        ) : null}
        {c.telegramLinked ? <Badge tone="new">{t("Telegram ulangan")}</Badge> : null}
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          style={{ marginLeft: 'auto' }}
          onClick={() => void toggleStatus()}
        >
          {c.status === 'ACTIVE' ? t("Bloklash") : t("Blokdan chiqarish")}
        </Button>
      </div>

      {error ? (
        <p role="alert" style={{ color: 'var(--alv-danger)', fontWeight: 600 }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <Stat label={t("Buyurtmalar")} value={String(c.stats.ordersCount)} />
        <Stat label={t("Sarflangan")} value={formatTiyin(c.stats.totalSpent)} />
        <Stat label={t("O‘rtacha chek")} value={formatTiyin(c.stats.avgCheck)} />
        <Stat
          label={t("Oxirgi buyurtma")}
          value={c.stats.lastOrderAt ? fmtDateTime(c.stats.lastOrderAt) : '—'}
        />
      </div>

      <div className="alv-admin-cols">
        <div>
          <Card title={t("Buyurtmalar")}>
            {c.orders.length === 0 ? (
              <Empty>{t("Buyurtma yo‘q.")}</Empty>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                {c.orders.map((o) => (
                  <li
                    key={o.id}
                    style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <Link
                      href={`/orders/${o.id}`}
                      style={{ fontWeight: 700, color: 'var(--alv-brand)' }}
                    >
                      {o.number}
                    </Link>
                    <Badge tone={ORDER_STATUS_TONE[o.status] ?? 'neutral'}>
                      {label(ORDER_STATUS_LABEL, o.status)}
                    </Badge>
                    <span style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>
                      {fmtDateTime(o.placedAt)}
                    </span>
                    <strong style={{ marginLeft: 'auto' }}>{formatTiyin(o.grandTotal)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t("Qaytarishlar")}>
            {c.returns.length === 0 ? (
              <Empty>{t("Qaytarish yo‘q.")}</Empty>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                {c.returns.map((r) => (
                  <li
                    key={r.id}
                    style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <Link
                      href={`/returns/${r.id}`}
                      style={{ fontWeight: 700, color: 'var(--alv-brand)' }}
                    >
                      {r.number}
                    </Link>
                    <Badge tone="neutral">{label(RETURN_STATUS_LABEL, r.status)}</Badge>
                    <strong style={{ marginLeft: 'auto' }}>{formatTiyin(r.refundAmount)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t("Ichki izohlar")}>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--alv-muted)' }}>
              {t("Izohlar faqat operatorlarga ko‘rinadi.")}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={t("Masalan: qo‘ng‘iroqda ertaga yetkazishni so‘radi")}
              style={{ ...field, resize: 'vertical' }}
            />
            <Button
              variant="primary"
              size="sm"
              disabled={busy || note.trim().length < 2}
              onClick={() => void addNote()}
            >
              {t("Qo‘shish")}
            </Button>

            {c.notes.length > 0 ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                {c.notes.map((n) => (
                  <li key={n.id} style={{ fontSize: 13 }}>
                    <div>{n.body}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--alv-muted)', marginTop: 2 }}>
                      {n.adminName ?? '—'} · {fmtDateTime(n.createdAt)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        </div>

        <div>
          <Card title={t("Manzillar")}>
            {c.addresses.length === 0 ? (
              <Empty>{t("Saqlangan manzil yo‘q.")}</Empty>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                {c.addresses.map((a) => (
                  <li key={a.id} style={{ fontSize: 13 }}>
                    <div style={{ fontWeight: 700 }}>
                      {a.label || a.recipient}
                      {a.isDefault ? t(" · standart") : ''}
                    </div>
                    <div style={{ color: 'var(--alv-ink-2)' }}>{a.address}</div>
                    <div style={{ color: 'var(--alv-muted)', fontSize: 12 }}>{a.phone}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t("Roziliklar")}>
            {c.consents.length === 0 ? (
              <Empty>{t("Rozilik yozuvi yo‘q.")}</Empty>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {c.consents.map((k) => (
                  <li
                    key={k.type}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      fontSize: 13,
                    }}
                  >
                    <span>{t(CONSENT_LABEL[k.type] ?? k.type)}</span>
                    <span
                      style={{
                        color: k.granted ? 'var(--alv-mint)' : 'var(--alv-muted)',
                        fontWeight: 700,
                      }}
                    >
                      {k.granted ? t("ha") : t("yo‘q")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t("Bonus ballar")}>
            <CustomerLoyalty customerId={id} />
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}

const field: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '10px 12px',
  borderRadius: 12,
  border: 0,
  boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
  font: 'inherit',
  background: 'var(--alv-surface)',
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--alv-surface)',
        borderRadius: 'var(--alv-radius-lg)',
        padding: 18,
        boxShadow: 'var(--alv-shadow-sm)',
        display: 'grid',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 16, margin: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13.5 }}>{children}</p>;
}

function Stat({ label: text, value }: { label: string; value: string }) {
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
      <div style={{ fontSize: 19, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}
