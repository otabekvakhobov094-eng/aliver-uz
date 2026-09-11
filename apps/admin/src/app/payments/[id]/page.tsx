'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useState } from 'react';
import { Badge, Button, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminPaymentDetail } from '@/lib/api';
import {
  FISCAL_STATUS_LABEL,
  FISCAL_STATUS_TONE,
  FISCAL_TYPE_LABEL,
  PAYMENT_PROVIDER_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_TONE,
  fmtDateTime,
  label,
  sumInputToTiyin,
  tiyinToSumInput,
} from '@/lib/order-labels';

export default function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [payment, setPayment] = useState<AdminPaymentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [cashComment, setCashComment] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await adminApi.payment(id);
      setPayment(res);
      // Standart — qolgan summa to'liq.
      const remaining = BigInt(res.amount) - BigInt(res.refundedAmount);
      setRefundAmount(remaining > 0n ? tiyinToSumInput(remaining.toString()) : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const cash = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.markCashPaid(id, cashComment.trim() || undefined);
      setNotice('Naqd to‘lov qabul qilindi. Fiskal chek navbatga qo‘yildi.');
      setCashComment('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const refund = async () => {
    const tiyin = sumInputToTiyin(refundAmount);
    if (tiyin === null || tiyin <= 0n) {
      setError('Summa noto‘g‘ri. Masalan: 189000 yoki 189000.50');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminApi.refundPayment(id, tiyin.toString(), refundReason.trim());
      setNotice('Qaytarish rasmiylashtirildi. Qaytarish cheki navbatga qo‘yildi.');
      setRefundReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  if (!payment) {
    return (
      <AdminShell title="To‘lov">
        {error ? (
          <p role="alert" style={{ color: 'var(--alv-danger)', fontWeight: 600 }}>
            {error}
          </p>
        ) : (
          <p style={{ color: 'var(--alv-muted)' }}>Yuklanmoqda…</p>
        )}
      </AdminShell>
    );
  }

  const remaining = BigInt(payment.amount) - BigInt(payment.refundedAmount);
  const canCash = payment.provider === 'CASH_ON_DELIVERY' && payment.status !== 'PAID';
  const canRefund =
    (payment.status === 'PAID' || payment.status === 'PARTIALLY_REFUNDED') && remaining > 0n;

  return (
    <AdminShell title={`To‘lov ${payment.orderNumber ?? ''}`}>
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Link href="/payments" style={{ fontSize: 13.5, color: 'var(--alv-muted)' }}>
          ← To‘lovlar
        </Link>
        {payment.orderId ? (
          <Link
            href={`/orders/${payment.orderId}`}
            style={{ fontSize: 13.5, color: 'var(--alv-brand)' }}
          >
            Buyurtmani ochish →
          </Link>
        ) : null}
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
        <Badge tone={PAYMENT_TONE[payment.status] ?? 'neutral'}>
          {label(PAYMENT_STATUS_LABEL, payment.status)}
        </Badge>
        <Badge tone="neutral">{label(PAYMENT_PROVIDER_LABEL, payment.provider)}</Badge>
        <strong style={{ fontSize: 20 }}>{formatTiyin(payment.amount)}</strong>
        {BigInt(payment.refundedAmount) > 0n ? (
          <span style={{ color: 'var(--alv-danger)', fontWeight: 700 }}>
            −{formatTiyin(payment.refundedAmount)} qaytarilgan
          </span>
        ) : null}
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="mint">{notice}</Alert> : null}

      <div className="alv-admin-cols">
        <div>
          {canCash ? (
            <Card title="Naqd to‘lovni qabul qilish">
              <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)', lineHeight: 1.5 }}>
                Pul kuryerdan olingach bosiladi. Shu paytda fiskal chek beriladi — qonun bo‘yicha
                chek pul olingan paytda beriladi.
              </p>
              <input
                value={cashComment}
                onChange={(e) => setCashComment(e.target.value)}
                placeholder="Izoh (masalan: kvitansiya №44)"
                style={field}
              />
              <Button variant="primary" disabled={busy} onClick={() => void cash()}>
                To‘lov qabul qilindi
              </Button>
            </Card>
          ) : null}

          {canRefund ? (
            <Card title="Qaytarish">
              <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)', lineHeight: 1.5 }}>
                Qolgan summa: <strong>{formatTiyin(remaining.toString())}</strong>. Qaytarish cheki
                avtomatik navbatga qo‘yiladi. Click va naqd to‘lovda pul o‘tkazmasi QO‘LDA
                bajariladi — yozuv esa baribir qoladi.
              </p>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
                  Summa (so‘m)
                </span>
                <input
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  inputMode="decimal"
                  style={field}
                />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
                  Sabab (majburiy)
                </span>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={2}
                  placeholder="Masalan: mijoz tovarni qaytardi, holati yaxshi"
                  style={{ ...field, resize: 'vertical' }}
                />
              </label>
              <Button
                variant="outline"
                disabled={busy || refundReason.trim().length < 3}
                onClick={() => void refund()}
              >
                Qaytarishni rasmiylashtirish
              </Button>
            </Card>
          ) : null}

          <Card title="Tranzaksiyalar">
            {payment.transactions.length === 0 ? (
              <Empty>Tranzaksiya yozuvi yo‘q.</Empty>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                {payment.transactions.map((t) => (
                  <li key={t.id} style={{ fontSize: 13 }}>
                    <div style={{ fontWeight: 700 }}>
                      {t.state} · {formatTiyin(t.amount)}
                      {t.reason !== null ? ` · sabab ${t.reason}` : ''}
                    </div>
                    <div style={{ color: 'var(--alv-muted)', fontSize: 12.5 }}>
                      {fmtDateTime(t.createdAt)}
                      {t.performedAt ? ` · bajarildi ${fmtDateTime(t.performedAt)}` : ''}
                      {t.cancelledAt ? ` · bekor ${fmtDateTime(t.cancelledAt)}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Provayder bilan aloqa">
            {payment.logs.length === 0 ? (
              <Empty>Log yozuvi yo‘q.</Empty>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
                {payment.logs.map((l) => (
                  <li key={l.id} style={{ fontSize: 12.5 }}>
                    <div style={{ fontWeight: 700 }}>
                      {l.direction} · {l.endpoint ?? '—'}
                      {l.httpStatus ? ` · HTTP ${l.httpStatus}` : ''}
                    </div>
                    <div style={{ color: 'var(--alv-muted)' }}>{fmtDateTime(l.createdAt)}</div>
                    <pre
                      style={{
                        margin: '6px 0 0',
                        padding: 10,
                        borderRadius: 10,
                        background: 'var(--alv-bg)',
                        overflowX: 'auto',
                        fontSize: 11.5,
                      }}
                    >
                      {JSON.stringify({ request: l.request, response: l.response }, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div>
          <Card title="Ma’lumot">
            <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: 13.5 }}>
              <Line k="Tranzaksiya id" v={payment.providerTxnId ?? '—'} />
              <Line k="To‘langan" v={payment.paidAt ? fmtDateTime(payment.paidAt) : '—'} />
              <Line k="Yaratilgan" v={fmtDateTime(payment.createdAt)} />
              {payment.failureReason ? <Line k="Xato" v={payment.failureReason} /> : null}
            </dl>
          </Card>

          <Card title="Fiskal cheklar">
            {payment.fiscal.length === 0 ? (
              <Empty>Chek yo‘q.</Empty>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                {payment.fiscal.map((f) => (
                  <li key={f.id} style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Badge tone={FISCAL_STATUS_TONE[f.status] ?? 'neutral'}>
                        {label(FISCAL_STATUS_LABEL, f.status)}
                      </Badge>
                      <span>{label(FISCAL_TYPE_LABEL, f.type)}</span>
                      <strong style={{ marginLeft: 'auto' }}>{formatTiyin(f.totalAmount)}</strong>
                    </div>
                    {f.receiptUrl ? (
                      <a
                        href={f.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: 'var(--alv-brand)' }}
                      >
                        Chekni ochish{f.fiscalSign ? ` · ${f.fiscalSign}` : ''}
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
      <span style={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13.5 }}>{children}</p>;
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
