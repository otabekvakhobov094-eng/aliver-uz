'use client';

import Link from 'next/link';
import { t } from '@/lib/i18n';
import { use, useCallback, useEffect, useState } from 'react';
import { Badge, Button, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminOrderDetail, type NotificationRow, type Shipment } from '@/lib/api';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PAYMENT_PROVIDER_LABEL,
  PAYMENT_STATUS_LABEL,
  fmtDateTime,
  label,
} from '@/lib/order-labels';

/**
 * Buyurtma kartochkasi.
 *
 * Statuslar uchun tugmalar SERVERDAN kelgan `transitions` ro'yxatidan
 * chiziladi. Shu sababli admin faqat ruxsat etilgan o'tishni ko'radi va
 * "409 Conflict" ni tugmani bosib kashf qilmaydi (ekspertiza A-7).
 */
export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [transitions, setTransitions] = useState<Record<string, string[]>>({});
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  // Bekor qilishning ikkinchi bosqichi — tasdiq.
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [carriers, setCarriers] = useState<Array<{ code: string; label: string }>>([]);
  const [shipTransitions, setShipTransitions] = useState<Record<string, string[]>>({});
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [carrier, setCarrier] = useState('own');
  const [courierName, setCourierName] = useState('');
  const [courierPhone, setCourierPhone] = useState('');
  const [trackingNo, setTrackingNo] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [detail, map, ships, carrierInfo, notes] = await Promise.all([
        adminApi.order(id),
        adminApi.orderTransitions(),
        adminApi.orderShipments(id).catch(() => []),
        adminApi.carriers().catch(() => ({ carriers: [], transitions: {} })),
        adminApi.orderNotifications(id).catch(() => []),
      ]);
      setOrder(detail);
      setTransitions(map);
      setShipments(ships);
      setCarriers(carrierInfo.carriers);
      setShipTransitions(carrierInfo.transitions);
      setNotifications(notes);

      const active = ships[0];
      if (active) {
        setCarrier(active.carrier ?? 'own');
        setCourierName(active.courierName ?? '');
        setCourierPhone(active.courierPhone ?? '');
        setTrackingNo(active.trackingNo ?? '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const change = async (status: string) => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.changeOrderStatus(order.id, status, comment.trim() || undefined);
      setComment('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Statusni o‘zgartirib bo‘lmadi');
    } finally {
      setBusy(false);
    }
  };

  const assignCourier = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.assignShipment(id, {
        carrier,
        courierName: courierName.trim() || undefined,
        courierPhone: courierPhone.trim() || undefined,
        trackingNo: trackingNo.trim() || undefined,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kuryerni biriktirib bo‘lmadi');
    } finally {
      setBusy(false);
    }
  };

  const changeShipment = async (shipmentId: string, status: string) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.changeShipmentStatus(shipmentId, status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Jo‘natma holati o‘zgartirilmadi');
    } finally {
      setBusy(false);
    }
  };

  const printWaybill = () => {
    // Varaqa yangi oynada ochiladi va chop etishga tayyor bo'ladi.
    window.open(`/orders/${id}/waybill`, '_blank', 'noopener');
  };

  if (!order) {
    return (
      <AdminShell title={t("Buyurtma")}>
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

  const next = transitions[order.status] ?? [];

  return (
    <AdminShell title={`Buyurtma ${order.number}`}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/orders" style={{ fontSize: 13.5, color: 'var(--alv-muted)' }}>
          {t("← Buyurtmalar ro‘yxati")}
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
        <Badge tone={ORDER_STATUS_TONE[order.status] ?? 'neutral'}>
          {label(ORDER_STATUS_LABEL, order.status)}
        </Badge>
        <Badge tone={order.paymentStatus === 'PAID' ? 'mint' : 'neutral'}>
          {label(PAYMENT_STATUS_LABEL, order.paymentStatus)}
        </Badge>
        <span style={{ fontSize: 13, color: 'var(--alv-muted)' }}>
          {fmtDateTime(order.placedAt)}
        </span>
        {order.reservationExpiresAt ? (
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--alv-warn)' }}>
            {t("Rezerv:")} {fmtDateTime(order.reservationExpiresAt)} {t("gacha")}
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            background: 'var(--alv-danger-soft)',
            color: 'var(--alv-danger)',
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      ) : null}

      <Card title={t("Holatni o‘zgartirish")}>
        {next.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13.5 }}>
            {t("Bu holatdan boshqa holatga o‘tib bo‘lmaydi — buyurtma yakunlangan.")}
          </p>
        ) : (
          <>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("Izoh (ixtiyoriy) — tarixga va audit logga yoziladi")}
              rows={2}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: 0,
                boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
                font: 'inherit',
                resize: 'vertical',
              }}
            />
            {/*
              BEKOR QILISH ikki bosqichli.

              Holat tugmalari bitta qatorda turadi va «Bekor qilingan»
              odatdagi keyingi qadamning qo'shnisi bo'lib qoladi.
              Bitta noto'g'ri bosish rezervni bo'shatadi va chegirma
              limitini qaytaradi — orqaga yo'l yo'q, iz esa faqat
              o'zgargan holat belgisi.
            */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {next.map((s) => (
                <Button
                  key={s}
                  variant={s === 'CANCELLED' ? 'outline' : 'primary'}
                  disabled={busy}
                  onClick={() => {
                    if (s === 'CANCELLED' && confirmCancel !== s) {
                      setConfirmCancel(s);
                      return;
                    }
                    setConfirmCancel(null);
                    void change(s);
                  }}
                  onBlur={() => setConfirmCancel(null)}
                >
                  {s === 'CANCELLED' && confirmCancel === s
                    ? t('Ha, bekor qilinsin')
                    : label(ORDER_STATUS_LABEL, s)}
                </Button>
              ))}
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--alv-muted)', lineHeight: 1.5 }}>
              {t("«Yo‘lda» — rezerv haqiqiy hisobdan chiqariladi. «Bekor qilingan» — rezerv bo‘shatiladi va chegirma limiti qaytariladi.")}
            </p>
          </>
        )}
      </Card>

      <div className="alv-admin-cols">
        <Card title={t("Pozitsiyalar")}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
              <thead>
                <tr style={{ fontSize: 12.5, color: 'var(--alv-muted)', textAlign: 'left' }}>
                  <th style={th}>{t("Mahsulot")}</th>
                  <th style={th}>{t("IKPU / QQS")}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t("Narx")}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t("Soni")}</th>
                  <th style={{ ...th, textAlign: 'right' }}>{t("Jami")}</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id} style={{ borderTop: '1px solid var(--alv-line)' }}>
                    <td style={td}>
                      <div style={{ fontWeight: 600 }}>{i.productName}</div>
                      <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                        {[i.variantName, i.sku].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td style={td}>
                      <div style={{ fontSize: 12.5 }}>{i.ikpuCode}</div>
                      <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                        QQS {i.vatRate}% ({formatTiyin(i.vatAmount)})
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>{formatTiyin(i.unitPrice)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{i.quantity}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                      {formatTiyin(i.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ margin: 0, fontSize: 12, color: 'var(--alv-muted)', lineHeight: 1.5 }}>
            {t("Bu qiymatlar buyurtma yaratilganda MUZLATILGAN nusxa. Katalogda narx yoki IKPU o‘zgarsa ham bu yerda o‘zgarmaydi.")}
          </p>

          <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
            <Sum k="Mahsulotlar" v={formatTiyin(order.subtotal)} />
            {BigInt(order.discountTotal) > 0n ? (
              <Sum
                k={`Chegirma${order.appliedCouponCode ? ` (${order.appliedCouponCode})` : ''}`}
                v={`−${formatTiyin(order.discountTotal)}`}
              />
            ) : null}
            <Sum k="Yetkazib berish" v={formatTiyin(order.shippingTotal)} />
            <Sum k="Shu jumladan QQS" v={formatTiyin(order.vatTotal)} muted />
            <div style={{ height: 1, background: 'var(--alv-line)' }} />
            <Sum k="Jami" v={formatTiyin(order.grandTotal)} big />
          </div>
        </Card>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Card title={t("Mijoz va yetkazish")}>
            <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: 13.5 }}>
              <Line k="Ism" v={[order.firstName, order.lastName].filter(Boolean).join(' ')} />
              <Line k="Telefon" v={order.contactPhone} />
              {order.customer ? (
                <Line
                  k="Mijoz tarixi"
                  v={`${order.customer.ordersCount} buyurtma · ${formatTiyin(order.customer.totalSpent)}`}
                />
              ) : (
                <Line k="Mijoz" v="Mehmon (ro‘yxatdan o‘tmagan)" />
              )}
              <Line k="Usul" v={order.deliveryMethod?.nameUz ?? order.deliveryType} />
              <Line
                k="Manzil"
                v={
                  [order.regionName, order.districtName, order.addressLine]
                    .filter(Boolean)
                    .join(', ') || '—'
                }
              />
              {order.landmark ? <Line k="Mo‘ljal" v={order.landmark} /> : null}
              {order.deliveryEtaFrom ? (
                <Line
                  k="Taxminiy sana"
                  v={`${fmtDateTime(order.deliveryEtaFrom)} — ${fmtDateTime(order.deliveryEtaTo!)}`}
                />
              ) : null}
              {order.comment ? <Line k="Izoh" v={order.comment} /> : null}
            </dl>
          </Card>

          <Card title={t("To‘lov")}>
            {order.payments.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13.5 }}>
                {t("To‘lov yozuvi yo‘q.")}
              </p>
            ) : (
              <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: 13.5 }}>
                {order.payments.map((p) => (
                  <Line
                    key={p.id}
                    k={label(PAYMENT_PROVIDER_LABEL, p.provider)}
                    v={`${label(PAYMENT_STATUS_LABEL, p.status)} · ${formatTiyin(p.amount)}`}
                  />
                ))}
              </dl>
            )}
          </Card>

          <Card title={t("Ombor rezervi")}>
            {order.reservations.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13.5 }}>{t("Rezerv yo‘q.")}</p>
            ) : (
              <dl style={{ margin: 0, display: 'grid', gap: 8, fontSize: 13.5 }}>
                {order.reservations.map((r) => (
                  <Line
                    key={r.id}
                    k={`${r.quantity} dona`}
                    v={`${r.status}${r.expiresAt ? ` · ${fmtDateTime(r.expiresAt)}` : ''}`}
                  />
                ))}
              </dl>
            )}
          </Card>

          <Card title={t("Jo‘natma")}>
            {order.deliveryType === 'PICKUP' ? (
              <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13.5 }}>
                {t("Olib ketish buyurtmasi — kuryer kerak emas.")}
              </p>
            ) : (
              <>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
                    {t("Tashuvchi")}
                  </span>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    style={field}
                  >
                    {carriers.map((c) => (
                      <option key={c.code} value={c.code}>
                        {t(c.label)}
                      </option>
                    ))}
                  </select>
                </label>

                <input
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder={t("Kuryer ismi")}
                  style={field}
                />
                <input
                  value={courierPhone}
                  onChange={(e) => setCourierPhone(e.target.value)}
                  placeholder={t("Kuryer telefoni")}
                  style={field}
                />
                <input
                  value={trackingNo}
                  onChange={(e) => setTrackingNo(e.target.value)}
                  placeholder={t("Trek raqami (bo‘lsa)")}
                  style={field}
                />

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button variant="primary" disabled={busy} onClick={() => void assignCourier()}>
                    {t("Kuryerni biriktirish")}
                  </Button>
                  <Button variant="ghost" onClick={printWaybill}>
                    {t("Varaqani chop etish")}
                  </Button>
                </div>

                {shipments.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
                    {shipments.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
                          display: 'grid',
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                          }}
                        >
                          <Badge tone={s.status === 'DELIVERED' ? 'mint' : 'new'}>{s.status}</Badge>
                          <span style={{ fontSize: 13 }}>
                            {s.courierName ?? '—'}
                            {s.courierPhone ? ` · ${s.courierPhone}` : ''}
                          </span>
                        </div>
                        {s.trackingNo ? (
                          <div style={{ fontSize: 12.5 }}>
                            {t("Trek:")}{' '}
                            {s.trackUrl ? (
                              <a
                                href={s.trackUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'var(--alv-brand)' }}
                              >
                                {s.trackingNo}
                              </a>
                            ) : (
                              s.trackingNo
                            )}
                          </div>
                        ) : null}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(shipTransitions[s.status] ?? []).map((next) => (
                            <Button
                              key={next}
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() => void changeShipment(s.id, next)}
                            >
                              {next}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: 'var(--alv-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      {t("«IN_TRANSIT» buyurtmani «Yo‘lda», «DELIVERED» esa «Yetkazilgan» holatiga o‘tkazadi — ikkalasini alohida bosish shart emas.")}
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </Card>

          <Card title={t("Yuborilgan xabarlar")}>
            {notifications.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 13.5 }}>
                {t("Hali xabar yuborilmagan.")}
              </p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                {notifications.map((n) => (
                  <li key={n.id} style={{ fontSize: 12.5 }}>
                    <div
                      style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
                    >
                      <Badge
                        tone={n.status === 'SENT' ? 'mint' : n.status === 'FAILED' ? 'low' : 'new'}
                      >
                        {n.status}
                      </Badge>
                      <span style={{ fontWeight: 700 }}>{n.channel}</span>
                      <span style={{ color: 'var(--alv-muted)' }}>{n.template}</span>
                    </div>
                    <div style={{ color: 'var(--alv-ink-2)', marginTop: 4 }}>{n.body}</div>
                    <div style={{ color: 'var(--alv-muted)', marginTop: 2 }}>
                      {n.sentAt ? fmtDateTime(n.sentAt) : `${fmtDateTime(n.scheduledAt)} dan`}
                      {n.error ? ` · ${n.error}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t("Tarix")}>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {order.statusHistory.map((h) => (
                <li key={h.id} style={{ fontSize: 13 }}>
                  <div style={{ fontWeight: 700 }}>
                    {h.fromStatus ? `${label(ORDER_STATUS_LABEL, h.fromStatus)} → ` : ''}
                    {label(ORDER_STATUS_LABEL, h.toStatus)}
                  </div>
                  <div style={{ color: 'var(--alv-muted)', fontSize: 12.5 }}>
                    {fmtDateTime(h.createdAt)} · {h.admin?.fullName ?? h.source}
                    {h.comment ? ` · ${h.comment}` : ''}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}

const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 700 };
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
const td: React.CSSProperties = { padding: '12px', verticalAlign: 'top', fontSize: 13.5 };

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

function Sum({ k, v, big, muted }: { k: string; v: string; big?: boolean; muted?: boolean }) {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}
    >
      <span
        style={{
          fontSize: big ? 15 : 13.5,
          fontWeight: big ? 700 : 600,
          color: 'var(--alv-ink-2)',
        }}
      >
        {k}
      </span>
      <span
        style={{
          fontSize: big ? 20 : 14,
          fontWeight: big ? 800 : 700,
          color: muted ? 'var(--alv-muted)' : 'var(--alv-ink)',
        }}
      >
        {v}
      </span>
    </div>
  );
}
