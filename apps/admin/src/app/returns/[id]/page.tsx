'use client';

import Link from 'next/link';
import { t } from '@/lib/i18n';
import { use, useCallback, useEffect, useState } from 'react';
import { Badge, Button, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminReturnDetail } from '@/lib/api';
import {
  CONDITION_LABEL,
  RETURN_REASON_LABEL,
  RETURN_STATUS_LABEL,
  RETURN_STATUS_TONE,
  fmtDateTime,
  label,
} from '@/lib/order-labels';

const CONDITIONS = ['RESELLABLE', 'OPENED', 'DAMAGED'];

/**
 * Qaytarish kartochkasi.
 *
 * Ikki muhim nuqta:
 *  - «Qabul qilindi» bosilganda har bir pozitsiyaning HOLATI
 *    ko'rsatiladi: faqat "qayta sotiladi" tovar omborga qaytadi.
 *  - «Pul qaytarildi» to'lov moduli orqali ishlaydi va qaytarish
 *    chekini navbatga qo'yadi.
 */
export default function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [row, setRow] = useState<AdminReturnDetail | null>(null);
  const [transitions, setTransitions] = useState<Record<string, string[]>>({});
  const [conditions, setConditions] = useState<Record<string, string>>({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [detail, map] = await Promise.all([
        adminApi.returnEntry(id),
        adminApi.returnTransitions(),
      ]);
      setRow(detail);
      setTransitions(map);
      setConditions(
        Object.fromEntries(detail.items.map((i) => [i.id, i.condition])) as Record<string, string>,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const change = async (status: string) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.changeReturnStatus(
        id,
        status,
        comment.trim() || undefined,
        status === 'RECEIVED'
          ? Object.entries(conditions).map(([returnItemId, condition]) => ({
              returnItemId,
              condition,
            }))
          : undefined,
      );
      setComment('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  if (!row) {
    return (
      <AdminShell title={t("Qaytarish")}>
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

  const next = transitions[row.status] ?? [];
  const resellableCount = Object.values(conditions).filter((c) => c === 'RESELLABLE').length;

  return (
    <AdminShell title={`Qaytarish ${row.number}`}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Link href="/returns" style={{ fontSize: 13.5, color: 'var(--alv-muted)' }}>
          {t("← Qaytarishlar")}
        </Link>
        <Link
          href={`/orders/${row.order.id}`}
          style={{ fontSize: 13.5, color: 'var(--alv-brand)' }}
        >
          {t("Buyurtma")} {row.order.number} →
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
        <Badge tone={RETURN_STATUS_TONE[row.status] ?? 'neutral'}>
          {label(RETURN_STATUS_LABEL, row.status)}
        </Badge>
        <Badge tone="neutral">{label(RETURN_REASON_LABEL, row.reasonCode)}</Badge>
        <strong style={{ fontSize: 20 }}>{formatTiyin(row.refundAmount)}</strong>
        <span style={{ fontSize: 13, color: 'var(--alv-muted)' }}>
          {fmtDateTime(row.createdAt)}
        </span>
        {row.handledBy ? (
          <span style={{ fontSize: 13, color: 'var(--alv-muted)' }}>· {row.handledBy}</span>
        ) : null}
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="alv-admin-cols">
        <div>
          <Card title={t("Pozitsiyalar")}>
            {row.status === 'APPROVED' || row.status === 'IN_TRANSIT' ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)', lineHeight: 1.55 }}>
                {t("Tovarni ko‘rib chiqib, har bir pozitsiya holatini belgilang. Faqat «qayta sotiladi» deb belgilangani omborga qaytadi — qolganlari harakatlar jurnalida qoladi.")}
              </p>
            ) : null}

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {row.items.map((i) => (
                <li
                  key={i.id}
                  style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      background: 'var(--alv-surface-2)',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {i.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={i.imageUrl}
                        alt=""
                        width={52}
                        height={52}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    ) : null}
                  </div>

                  <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{i.productName}</div>
                    <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                      {[i.variantName, i.sku, `× ${i.quantity}`].filter(Boolean).join(' · ')}
                    </div>
                  </div>

                  {row.status === 'REFUNDED' || i.restocked ? (
                    <Badge tone={i.condition === 'RESELLABLE' ? 'mint' : 'low'}>
                      {label(CONDITION_LABEL, i.condition)}
                      {i.restocked ? t(" · omborda") : ''}
                    </Badge>
                  ) : (
                    <select
                      value={conditions[i.id] ?? i.condition}
                      onChange={(e) => setConditions((c) => ({ ...c, [i.id]: e.target.value }))}
                      style={{ ...field, width: 170 }}
                      aria-label={`${i.productName} holati`}
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                          {label(CONDITION_LABEL, c)}
                        </option>
                      ))}
                    </select>
                  )}

                  <strong style={{ minWidth: 110, textAlign: 'right' }}>
                    {formatTiyin(i.refundAmount)}
                  </strong>
                </li>
              ))}
            </ul>

            <div style={{ height: 1, background: 'var(--alv-line)' }} />

            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
            >
              <span style={{ fontWeight: 700 }}>{t("Qaytariladi")}</span>
              <strong style={{ fontSize: 20 }}>{formatTiyin(row.refundAmount)}</strong>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--alv-muted)', lineHeight: 1.5 }}>
              {t("Summa buyurtmaning MUZLATILGAN nusxasidan hisoblangan: chegirma ulushi hisobga olingan, katalogdagi joriy narx ta’sir qilmaydi.")}
            </p>
          </Card>

          <Card title={t("Holatni o‘zgartirish")}>
            {next.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13.5 }}>
                {t("Bu holatdan boshqa holatga o‘tib bo‘lmaydi — jarayon yakunlangan.")}
              </p>
            ) : (
              <>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder={t("Izoh (rad etishda mijozga ko‘rsatiladi)")}
                  style={{ ...field, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {next.map((s) => (
                    <Button
                      key={s}
                      variant={s === 'REJECTED' || s === 'CANCELLED' ? 'outline' : 'primary'}
                      disabled={busy}
                      onClick={() => void change(s)}
                    >
                      {label(RETURN_STATUS_LABEL, s)}
                    </Button>
                  ))}
                </div>
                {next.includes('RECEIVED') ? (
                  <p
                    style={{ margin: 0, fontSize: 12, color: 'var(--alv-muted)', lineHeight: 1.5 }}
                  >
                    {t("«Qabul qilindi» bosilganda")} {resellableCount} {t("ta pozitsiya omborga qaytadi.")}
                  </p>
                ) : null}
                {next.includes('REFUNDED') ? (
                  <p
                    style={{ margin: 0, fontSize: 12, color: 'var(--alv-muted)', lineHeight: 1.5 }}
                  >
                    {t("«Pul qaytarildi» — to‘lov moduli orqali qaytariladi va qaytarish cheki navbatga tushadi. Click va naqd to‘lovda pul o‘tkazmasi qo‘lda bajariladi.")}
                  </p>
                ) : null}
              </>
            )}
          </Card>
        </div>

        <div>
          <Card title={t("Ma’lumot")}>
            <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: 13.5 }}>
              <Line k="Buyurtma" v={row.order.number} />
              <Line k="Yetkazish narxi" v={formatTiyin(row.order.shippingTotal)} />
              <Line k="Pul qaytarilgan" v={row.refundedAt ? fmtDateTime(row.refundedAt) : '—'} />
              <Line k="Usul" v={row.refundMethod ?? '—'} />
            </dl>
            {row.comment ? (
              <div style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--alv-muted)', fontWeight: 700 }}>
                  {t("Mijoz izohi")}
                </span>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-ink-2)', lineHeight: 1.55 }}>
                  {row.comment}
                </p>
              </div>
            ) : null}

            {row.resolutionNote ? (
              <div style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--alv-muted)', fontWeight: 700 }}>
                  {t("Operator izohi")}
                </span>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-ink-2)', lineHeight: 1.55 }}>
                  {row.resolutionNote}
                </p>
              </div>
            ) : null}
          </Card>

          <Card title={t("Qaytarish cheki")}>
            {row.receipts.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13.5 }}>{t("Chek yo‘q.")}</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {row.receipts.map((r) => (
                  <li key={r.id} style={{ fontSize: 13 }}>
                    <Badge tone={r.status === 'SENT' ? 'mint' : 'new'}>{r.status}</Badge>
                    {r.receiptUrl ? (
                      <a
                        href={r.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ marginLeft: 8, color: 'var(--alv-brand)' }}
                      >
                        {r.fiscalSign ?? t("Chek")}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
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

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--alv-muted)', fontWeight: 600 }}>{k}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
    </div>
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
