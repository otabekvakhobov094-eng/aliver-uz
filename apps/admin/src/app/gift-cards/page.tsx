'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { DataList, type BulkAction, type DataColumn } from '@/components/DataList';
import { adminApi, type GiftCardRow, type IssuedGiftCard } from '@/lib/api';

/**
 * Sovg'a sertifikatlari — TZ-3.
 *
 * Bu ekranning eng muhim xossasi — u OCHIQ KODNI KO'RSATMAYDI.
 * Kod bazada saqlanmaydi (faqat xeshi) va faqat chiqarilgan paytda
 * bir marta qaytariladi. Shuning uchun ro'yxatda ham, kartochkada ham
 * uni topib bo'lmaydi.
 *
 * Bu noqulay va shunday bo'lishi kerak: sertifikat pul, baza nusxasi
 * esa chiqib ketishi mumkin — zaxira, xodim, tekshiruv. Ochiq kod bilan
 * o'sha nusxani olgan odam hammasini darhol ishlatib bo'lardi.
 */

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Faol',
  USED: 'Ishlatilgan',
  EXPIRED: 'Muddati o‘tgan',
  CANCELLED: 'Bekor qilingan',
};
const STATUS_TONE: Record<string, 'mint' | 'neutral' | 'low' | 'sale'> = {
  ACTIVE: 'mint',
  USED: 'neutral',
  EXPIRED: 'low',
  CANCELLED: 'sale',
};

const COLUMNS: Array<DataColumn<GiftCardRow>> = [
  {
    key: 'code',
    label: 'Kod',
    locked: true,
    render: (c) => (
      <>
        <code style={{ fontSize: 13, fontWeight: 700 }}>{c.masked}</code>
        <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
          {c.recipientName ?? '—'}
          {c.recipientPhone ? ` · ${c.recipientPhone}` : ''}
        </div>
      </>
    ),
  },
  {
    key: 'status',
    label: 'Holat',
    render: (c) => (
      <Badge tone={STATUS_TONE[c.status] ?? 'neutral'}>{STATUS_LABEL[c.status] ?? c.status}</Badge>
    ),
  },
  {
    key: 'initial',
    label: 'Nominal',
    align: 'right',
    render: (c) => (
      <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {formatTiyin(c.initialAmount)}
      </span>
    ),
  },
  {
    key: 'remaining',
    label: 'Qoldiq',
    align: 'right',
    render: (c) => (
      <strong
        style={{
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          color: BigInt(c.remaining) > 0n ? undefined : 'var(--alv-muted)',
        }}
      >
        {formatTiyin(c.remaining)}
      </strong>
    ),
  },
  {
    key: 'expires',
    label: 'Muddati',
    render: (c) =>
      c.expiresAt ? (
        <span style={{ whiteSpace: 'nowrap' }}>
          {new Date(c.expiresAt).toLocaleDateString('uz-UZ')}
        </span>
      ) : (
        <span style={{ color: 'var(--alv-muted)' }}>muddatsiz</span>
      ),
  },
  {
    key: 'created',
    label: 'Chiqarilgan',
    defaultVisible: false,
    render: (c) => (
      <span style={{ whiteSpace: 'nowrap' }}>
        {new Date(c.createdAt).toLocaleDateString('uz-UZ')}
      </span>
    ),
  },
];

const EMPTY = { tail: '' };

export default function GiftCardsPage() {
  const [items, setItems] = useState<GiftCardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Record<string, unknown>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedGiftCard | null>(null);
  const [amount, setAmount] = useState('500000');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const tail = (filters as Record<string, string>).tail ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.giftCards({ tail: tail || undefined });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [tail]);

  useEffect(() => {
    void load();
  }, [load]);

  const bulkActions: BulkAction[] = useMemo(
    () => [
      {
        key: 'cancel',
        label: 'Bekor qilish',
        run: async (ids) => {
          const reason = window.prompt('Bekor qilish sababi (kamida 3 belgi):')?.trim() ?? '';
          if (reason.length < 3) return 'Sabab ko‘rsatilmagani uchun bekor qilinmadi.';
          let done = 0;
          const failed: string[] = [];
          for (const id of ids) {
            try {
              await adminApi.cancelGiftCard(id, reason);
              done += 1;
            } catch (e) {
              failed.push(e instanceof Error ? e.message : id);
            }
          }
          if (failed.length === 0) return `${done} ta sertifikat bekor qilindi.`;
          return `${done} ta bekor qilindi, ${failed.length} tasi o‘tmadi: ${failed.join('; ')}`;
        },
      },
    ],
    [],
  );

  async function issue() {
    const sum = Number(amount);
    if (!Number.isInteger(sum) || sum < 10000) {
      setError('Eng kam nominal 10 000 so‘m.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setIssued(
        await adminApi.issueGiftCard({
          amountSum: sum,
          recipientName: name.trim() || undefined,
          recipientPhone: phone.trim() || undefined,
        }),
      );
      setName('');
      setPhone('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chiqarib bo‘lmadi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Sovg‘a sertifikatlari">
      {error ? (
        <div
          role="alert"
          className="alv-card"
          style={{ padding: 14, marginBottom: 14, borderLeft: '3px solid var(--alv-danger)' }}
        >
          {error}
        </div>
      ) : null}

      {/* Chiqarilgan kod FAQAT shu yerda va FAQAT bir marta ko'rinadi. */}
      {issued ? (
        <div
          role="status"
          className="alv-card"
          style={{
            padding: 18,
            marginBottom: 16,
            borderLeft: '3px solid var(--alv-warn)',
            background: 'var(--alv-warn-soft)',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 8 }}>{issued.warning}</strong>
          <code
            style={{
              display: 'inline-block',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '.06em',
              padding: '8px 14px',
              borderRadius: 8,
              background: 'var(--alv-surface)',
              userSelect: 'all',
            }}
          >
            {issued.code}
          </code>
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(issued.code)}
              style={GHOST}
            >
              Nusxa olish
            </button>
            <button type="button" onClick={() => setIssued(null)} style={GHOST}>
              Yopish
            </button>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--alv-ink-2)', lineHeight: 1.6 }}>
            Kod bazada ochiq saqlanmaydi — faqat xeshi. Bu oyna yopilgach uni hech qayerdan
            topib bo‘lmaydi.
          </p>
        </div>
      ) : null}

      <div className="alv-card" style={{ padding: 16, marginBottom: 16, display: 'grid', gap: 12 }}>
        <strong style={{ fontSize: 15 }}>Yangi sertifikat</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12.5 }}>
            <span style={{ color: 'var(--alv-muted)' }}>Nominal, so‘m</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              style={{ ...FIELD, width: 140 }}
            />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12.5 }}>
            <span style={{ color: 'var(--alv-muted)' }}>Kimga (ixtiyoriy)</span>
            <input value={name} onChange={(e) => setName(e.target.value)} style={FIELD} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12.5 }}>
            <span style={{ color: 'var(--alv-muted)' }}>Telefon (ixtiyoriy)</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} style={FIELD} />
          </label>
          <button type="button" onClick={() => void issue()} disabled={busy} style={PRIMARY(busy)}>
            {busy ? 'Chiqarilmoqda…' : 'Chiqarish'}
          </button>
        </div>
      </div>

      <p style={{ margin: '0 0 14px', color: 'var(--alv-muted)', fontSize: 14 }}>
        Jami {total} ta sertifikat
      </p>

      <DataList<GiftCardRow>
        storageKey="gift-cards"
        columns={COLUMNS}
        rows={items}
        rowKey={(c) => c.id}
        filters={filters}
        onFiltersChange={setFilters}
        loading={loading}
        bulkActions={bulkActions}
        onDone={load}
        onClearFilters={() => setFilters(EMPTY)}
        emptyTitle="Hali sertifikat yo‘q"
        emptyHint="Yuqoridagi forma bilan birinchisini chiqaring."
        noResultsTitle="Bu oxirgi belgilar bilan sertifikat topilmadi"
        filterBar={
          <input
            type="search"
            value={tail}
            onChange={(e) => setFilters({ tail: e.target.value })}
            placeholder="Kodning oxirgi 4 belgisi"
            aria-label="Sertifikat qidirish"
            style={{ ...FIELD, maxWidth: 260 }}
          />
        }
      />
    </AdminShell>
  );
}

const FIELD: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid var(--alv-line)',
  fontSize: 14,
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  minWidth: 0,
  fontFamily: 'inherit',
};

const GHOST: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 9,
  border: '1px solid var(--alv-line)',
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  fontSize: 13.5,
  cursor: 'pointer',
};

const PRIMARY = (busy: boolean): React.CSSProperties => ({
  padding: '10px 20px',
  borderRadius: 10,
  border: 'none',
  background: 'var(--alv-ink)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  cursor: busy ? 'progress' : 'pointer',
  opacity: busy ? 0.6 : 1,
});
