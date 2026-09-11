'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type LowStockRow, type StockMovement } from '@/lib/api';
import { fmtDateTime } from '@/lib/order-labels';

const REASONS = [
  { value: 'PURCHASE_IN', label: 'Kirim (yetkazib beruvchidan)' },
  { value: 'ADJUSTMENT', label: 'Inventarizatsiya tuzatishi' },
  { value: 'LOSS', label: 'Yo‘qotish / buzilish' },
];

const MOVEMENT_LABEL: Record<string, string> = {
  PURCHASE_IN: 'Kirim',
  ORDER_SHIP: 'Jo‘natildi',
  RETURN_IN: 'Qaytarildi',
  RETURN_SCRAP: 'Qaytarildi (yaroqsiz)',
  ADJUSTMENT: 'Tuzatish',
  LOSS: 'Yo‘qotish',
  TRANSFER_IN: 'Ombordan kirim',
  TRANSFER_OUT: 'Omborga chiqim',
};

/**
 * Ombor.
 *
 * Ikki narsani ko'rsatadi: qoldig'i kam mahsulotlar va tanlangan variant
 * bo'yicha harakatlar jurnali. Qoldiq faqat harakat orqali o'zgaradi —
 * "shunchaki sonni tahrirlash" imkoni ataylab yo'q (ekspertiza A-6).
 */
export default function InventoryPage() {
  const [rows, setRows] = useState<LowStockRow[]>([]);
  const [selected, setSelected] = useState<LowStockRow | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState(REASONS[0]!.value);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows(await adminApi.lowStock());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (row: LowStockRow) => {
    setSelected(row);
    setDelta('');
    setComment('');
    setNotice(null);
    setMovements(await adminApi.stockMovements(row.variantId).catch(() => []));
  };

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.adjustStock(selected.variantId, Number(delta), reason, comment.trim());
      setNotice('Qoldiq yangilandi va harakatlar jurnaliga yozildi.');
      setDelta('');
      setComment('');
      setMovements(await adminApi.stockMovements(selected.variantId));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Qoldiqni o‘zgartirib bo‘lmadi');
    } finally {
      setBusy(false);
    }
  };

  const expire = async () => {
    setBusy(true);
    try {
      const res = await adminApi.expireReservations();
      setNotice(
        `Tekshirildi: ${res.checked} ta buyurtma, ${res.cancelled} tasi bekor qilinib rezervi bo‘shatildi.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    !busy &&
    selected !== null &&
    Number(delta) !== 0 &&
    !Number.isNaN(Number(delta)) &&
    comment.trim().length >= 3;

  return (
    <AdminShell title="Ombor">
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--alv-muted)', flexGrow: 1 }}>
          Qoldig‘i chegaradan past mahsulotlar. Qoldiq faqat harakat orqali o‘zgaradi.
        </p>
        <Button variant="outline" disabled={busy} onClick={() => void expire()}>
          Muddati o‘tgan rezervlarni bo‘shatish
        </Button>
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

      {notice ? (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            background: 'var(--alv-mint-soft)',
            color: 'var(--alv-mint)',
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          {notice}
        </div>
      ) : null}

      <div className="alv-admin-cols">
        <section
          style={{
            background: 'var(--alv-surface)',
            borderRadius: 'var(--alv-radius-lg)',
            padding: 18,
            boxShadow: 'var(--alv-shadow-sm)',
            overflowX: 'auto',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
            <thead>
              <tr style={{ fontSize: 12.5, color: 'var(--alv-muted)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>Mahsulot</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Mavjud</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Chegara</th>
                <th style={{ padding: '10px 12px' }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.variantId} style={{ borderTop: '1px solid var(--alv-line)' }}>
                  <td style={{ padding: 12, fontSize: 13.5 }}>
                    <div style={{ fontWeight: 600 }}>{r.productName}</div>
                    <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                      {[Object.values(r.options ?? {}).join(' / '), r.sku]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <Badge tone={r.available === 0 ? 'low' : 'neutral'}>{r.available}</Badge>
                  </td>
                  <td style={{ padding: 12, textAlign: 'right', color: 'var(--alv-muted)' }}>
                    {r.threshold}
                  </td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <Button variant="ghost" size="sm" onClick={() => void open(r)}>
                      Ochish
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 ? (
            <p style={{ color: 'var(--alv-muted)', fontSize: 13.5 }}>
              Qoldig‘i kam mahsulot yo‘q — hammasi chegaradan yuqori.
            </p>
          ) : null}
        </section>

        <section
          style={{
            background: 'var(--alv-surface)',
            borderRadius: 'var(--alv-radius-lg)',
            padding: 18,
            boxShadow: 'var(--alv-shadow-sm)',
            display: 'grid',
            gap: 12,
          }}
        >
          <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 16, margin: 0 }}>
            {selected ? selected.productName : 'Variantni tanlang'}
          </h2>

          {selected ? (
            <>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
                  O‘zgarish (musbat — kirim, manfiy — chiqim)
                </span>
                <input
                  value={delta}
                  onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ''))}
                  inputMode="numeric"
                  placeholder="+20"
                  style={field}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
                  Sabab
                </span>
                <select value={reason} onChange={(e) => setReason(e.target.value)} style={field}>
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
                  Izoh (majburiy, kamida 3 belgi)
                </span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder="Masalan: 12.09 sanadagi yetkazib berish, hujjat №442"
                  style={{ ...field, resize: 'vertical' }}
                />
              </label>

              <Button variant="primary" disabled={!canSubmit} onClick={() => void submit()}>
                Qoldiqni o‘zgartirish
              </Button>

              <div style={{ height: 1, background: 'var(--alv-line)' }} />

              <h3 style={{ fontSize: 14, margin: 0 }}>Harakatlar jurnali</h3>
              {movements.length === 0 ? (
                <p style={{ color: 'var(--alv-muted)', fontSize: 13.5, margin: 0 }}>
                  Harakatlar yo‘q.
                </p>
              ) : (
                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                  {movements.map((m) => (
                    <li key={m.id} style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 700 }}>
                        {m.delta > 0 ? `+${m.delta}` : m.delta} ·{' '}
                        {MOVEMENT_LABEL[m.reason] ?? m.reason}
                      </div>
                      <div style={{ color: 'var(--alv-muted)', fontSize: 12.5 }}>
                        {fmtDateTime(m.createdAt)}
                        {m.admin ? ` · ${m.admin.fullName}` : ''}
                        {m.comment ? ` · ${m.comment}` : ''}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--alv-muted)', fontSize: 13.5, margin: 0 }}>
              Chapdagi ro‘yxatdan mahsulotni tanlang — qoldiqni o‘zgartirish va harakatlar jurnali
              shu yerda ochiladi.
            </p>
          )}
        </section>
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
