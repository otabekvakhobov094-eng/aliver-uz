'use client';

import Link from 'next/link';
import { t } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { Pager } from '@/components/Pager';
import { adminApi, type NotificationRow } from '@/lib/api';
import { fmtDateTime } from '@/lib/order-labels';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Navbatda',
  SENT: 'Yuborilgan',
  FAILED: 'Xato',
  SKIPPED: 'Yuborilmadi',
};

const STATUS_TONE: Record<string, 'mint' | 'neutral' | 'low' | 'new'> = {
  PENDING: 'new',
  SENT: 'mint',
  FAILED: 'low',
  SKIPPED: 'neutral',
};

const CHANNELS = [
  { value: '', label: 'Hammasi' },
  { value: 'SMS', label: 'SMS' },
  { value: 'TELEGRAM', label: 'Telegram' },
];

type Tab = 'log' | 'templates';

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('log');
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [total, setTotal] = useState(0);
  // Sahifa va uning hajmi — hajm serverdan keladi.
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(30);

  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [mocks, setMocks] = useState({ sms: false, telegram: false });
  const [templates, setTemplates] = useState<
    Array<{
      key: string;
      staff: boolean;
      samples: Array<{
        lang: string;
        text: string;
        parts: number;
        encoding: string;
        length: number;
      }>;
    }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminApi.notifications({
        channel: channel || undefined,
        status: status || undefined,
        page,
      });
      setItems(res.items);
      setTotal(res.total);
      if (res.perPage) setPerPage(res.perPage);
      setMocks({ sms: res.smsMock, telegram: res.telegramMock });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }, [channel, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== 'templates' || templates.length > 0) return;
    adminApi
      .notificationTemplates()
      .then(setTemplates)
      .catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [tab, templates.length]);

  const retry = async (id: string) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await adminApi.retryNotification(id);
      setNotice(res.status === 'SENT' ? 'Yuborildi.' : `Yuborilmadi: ${res.error ?? '—'}`);
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
      const res = await adminApi.runNotificationQueue();
      setNotice(`Navbat: ${res.sent} yuborildi, ${res.failed} xato.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell title={t("Bildirishnomalar")}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <TabButton active={tab === 'log'} onClick={() => setTab('log')}>
          {t("Jurnal")}
        </TabButton>
        <TabButton active={tab === 'templates'} onClick={() => setTab('templates')}>
          {t("Shablonlar")}
        </TabButton>
      </div>

      {mocks.sms || mocks.telegram ? (
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
          {t("MAKET rejimi:")}{' '}
          {[mocks.sms ? 'SMS' : null, mocks.telegram ? t("Telegram") : null]
            .filter(Boolean)
            .join(t(" va "))}{' '}
          {t("haqiqatda yuborilmayapti — xabar matni server logiga chiqadi. Provayder kalitlari kelganda")}{' '}
          <code>SMS_PROVIDER</code> {t("va")} <code>TELEGRAM_BOT_TOKEN</code> {t("to‘ldiriladi.")}
        </div>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="mint">{notice}</Alert> : null}

      {tab === "log" ? (
        <>
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              marginBottom: 18,
            }}
          >
            <Select label={t("Kanal")} value={channel} options={CHANNELS} onChange={setChannel} />
            <Select
              label={t("Holat")}
              value={status}
              options={[
                { value: '', label: 'Hammasi' },
                ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
              ]}
              onChange={setStatus}
            />
            <Button variant="outline" disabled={busy} onClick={() => void runQueue()}>
              {t("Navbatni ishga tushirish")}
            </Button>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--alv-muted)' }}>
              {t("Jami:")} {total}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ fontSize: 12.5, color: 'var(--alv-muted)', textAlign: 'left' }}>
                  <th style={th}>{t("Qabul qiluvchi")}</th>
                  <th style={th}>{t("Shablon")}</th>
                  <th style={th}>{t("Holat")}</th>
                  <th style={th}>{t("Matn")}</th>
                  <th style={th}>{t("Vaqt")}</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id} style={{ borderTop: '1px solid var(--alv-line)' }}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{n.recipient}</div>
                      <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                        {n.channel}
                        {n.orderNumber ? (
                          <>
                            {' · '}
                            <Link
                              href={`/orders/${n.orderId}`}
                              style={{ color: 'var(--alv-brand)' }}
                            >
                              {n.orderNumber}
                            </Link>
                          </>
                        ) : null}
                      </div>
                    </td>
                    <td style={{ ...td, fontSize: 12.5 }}>
                      {n.template}
                      <div style={{ color: 'var(--alv-muted)' }}>{n.lang.toUpperCase()}</div>
                    </td>
                    <td style={td}>
                      <Badge tone={STATUS_TONE[n.status] ?? 'neutral'}>
                        {t(STATUS_LABEL[n.status] ?? n.status)}
                      </Badge>
                      {n.error ? (
                        <div style={{ fontSize: 11.5, color: 'var(--alv-danger)', marginTop: 4 }}>
                          {n.error}
                        </div>
                      ) : null}
                      {n.attempts > 0 ? (
                        <div style={{ fontSize: 11.5, color: 'var(--alv-muted)', marginTop: 2 }}>
                          {n.attempts} {t("urinish")}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ ...td, maxWidth: 320, fontSize: 12.5, color: 'var(--alv-ink-2)' }}>
                      {n.body}
                      {n.smsParts && n.smsParts > 1 ? (
                        <div style={{ color: 'var(--alv-warn)', fontWeight: 700, marginTop: 4 }}>
                          {n.smsParts} {t("ta SMS")}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ ...td, fontSize: 12.5 }}>
                      {n.sentAt ? (
                        fmtDateTime(n.sentAt)
                      ) : (
                        <span style={{ color: 'var(--alv-muted)' }}>
                          {fmtDateTime(n.scheduledAt)} {t("dan")}
                        </span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {n.status !== 'SENT' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => void retry(n.id)}
                        >
                          {t("Qayta yuborish")}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {items.length === 0 ? (
            <p style={{ color: 'var(--alv-muted)' }}>{t("Bildirishnoma topilmadi.")}</p>
          ) : null}

          <div style={{ marginTop: 14 }}>
            <Pager page={page} total={total} perPage={perPage} onChange={setPage} />
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13, lineHeight: 1.55 }}>
            {t("SMS narxi belgilar soniga bog‘liq: lotin yozuvida 160, kirill yozuvida 70 belgi bitta SMS. Ikki qismli xabar ikki barobar turadi — matn uzunligini shu yerda ko‘rib turing.")}
          </p>

          {templates.map((t) => (
            <section key={t.key} style={card}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 14 }}>{t.key}</strong>
                {t.staff ? (
                  <Badge tone="neutral">Operatorlar</Badge>
                ) : (
                  <Badge tone="mint">Mijoz</Badge>
                )}
              </div>
              {t.samples.map((s) => (
                <div key={s.lang} style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontSize: 12, color: 'var(--alv-muted)', fontWeight: 700 }}>
                    {s.lang.toUpperCase()} · {s.length} belgi · {s.encoding} ·{' '}
                    <span style={{ color: s.parts > 1 ? 'var(--alv-warn)' : 'var(--alv-mint)' }}>
                      {s.parts} SMS
                    </span>
                  </div>
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: 'var(--alv-bg)',
                      fontSize: 13,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {s.text}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

const card: React.CSSProperties = {
  background: 'var(--alv-surface)',
  borderRadius: 'var(--alv-radius-lg)',
  padding: 16,
  boxShadow: 'var(--alv-shadow-sm)',
  display: 'grid',
  gap: 10,
};
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        minHeight: 44,
        padding: '0 18px',
        borderRadius: 999,
        border: 0,
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 13.5,
        background: active ? 'var(--alv-brand)' : 'var(--alv-surface)',
        color: active ? '#fff' : 'var(--alv-ink)',
        boxShadow: active ? 'none' : 'inset 0 0 0 1.5px var(--alv-line-2)',
      }}
    >
      {children}
    </button>
  );
}

function Alert({ tone, children }: { tone: 'danger' | 'mint'; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      style={{
        padding: '12px 16px',
        borderRadius: 14,
        marginBottom: 16,
        fontWeight: 600,
        fontSize: 13.5,
        background: tone === 'danger' ? 'var(--alv-danger-soft)' : 'var(--alv-mint-soft)',
        color: tone === 'danger' ? 'var(--alv-danger)' : 'var(--alv-mint)',
      }}
    >
      {children}
    </div>
  );
}
