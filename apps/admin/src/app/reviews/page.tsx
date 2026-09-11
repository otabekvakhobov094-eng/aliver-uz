'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminReview } from '@/lib/api';

/**
 * Sharhlar moderatsiyasi — TZ 51.
 *
 * Sahifa arxiv emas, **navbat**: standart holatda faqat kutayotganlar
 * ko'rinadi va ommaviy tasdiqlash mavjud, chunki kuniga o'nlab sharh
 * kelganda bittalab bosish real ish emas.
 */

const TABS = [
  { key: 'PENDING', label: 'Kutmoqda' },
  { key: 'APPROVED', label: 'Tasdiqlangan' },
  { key: 'REJECTED', label: 'Rad etilgan' },
];

function stars(n: number): string {
  return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
}

export default function ReviewsPage() {
  const [status, setStatus] = useState('PENDING');
  const [items, setItems] = useState<AdminReview[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await adminApi.reviews({ status });
      setItems(res.items);
      setCounts(res.counts);
      setSelected(new Set());
    } catch (e) {
      setError((e as Error).message);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(ok);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const action = (bg: string): React.CSSProperties => ({
    padding: '7px 16px',
    borderRadius: 9,
    border: 'none',
    background: bg,
    color: '#fff',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  });

  return (
    <AdminShell title="Sharhlar">
      {error ? (
        <div
          role="alert"
          className="alv-card"
          style={{ padding: 14, marginBottom: 16, borderLeft: '3px solid var(--alv-danger,#C0392B)' }}
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          className="alv-card"
          style={{ padding: 14, marginBottom: 16, borderLeft: '3px solid var(--alv-mint,#1F7A5C)' }}
        >
          {notice}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatus(t.key)}
            aria-pressed={t.key === status}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid var(--alv-line)',
              background: t.key === status ? 'var(--alv-ink)' : 'var(--alv-surface)',
              color: t.key === status ? '#fff' : 'var(--alv-ink)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.label}
            <span style={{ opacity: 0.7, marginLeft: 8, fontWeight: 400, fontSize: 12.5 }}>
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {selected.size > 0 ? (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            marginBottom: 14,
            background: 'var(--alv-ink)',
            color: '#fff',
            borderRadius: 12,
          }}
        >
          <strong style={{ fontSize: 14 }}>{selected.size} ta tanlandi</strong>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(
                () => adminApi.bulkModerateReviews([...selected], 'APPROVED'),
                `${selected.size} ta sharh tasdiqlandi`,
              )
            }
            style={action('var(--alv-mint,#1F7A5C)')}
          >
            Tasdiqlash
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(
                () => adminApi.bulkModerateReviews([...selected], 'REJECTED'),
                `${selected.size} ta sharh rad etildi`,
              )
            }
            style={action('var(--alv-danger,#C0392B)')}
          >
            Rad etish
          </button>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((r) => (
          <article key={r.id} className="alv-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                aria-label={`${r.product.nameUz} sharhini tanlash`}
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
                style={{ width: 17, height: 17, marginTop: 3, accentColor: 'var(--alv-brand,#D6336C)' }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: 'var(--alv-amber,#9A5A12)', fontSize: 16 }}>
                    {stars(r.rating)}
                  </span>
                  <strong style={{ fontSize: 15 }}>{r.product.nameUz}</strong>
                  {r.isVerified ? (
                    <span
                      className="alv-badge"
                      style={{
                        background: 'var(--alv-mint,#1F7A5C)',
                        color: '#fff',
                        fontSize: 10,
                        height: 18,
                      }}
                      title="Yetkazilgan buyurtma egasi"
                    >
                      tasdiqlangan xarid
                    </span>
                  ) : null}
                </div>
                <div style={{ color: 'var(--alv-muted)', fontSize: 13, margin: '4px 0 8px' }}>
                  {r.customer.fullName ?? 'Mijoz'} · {new Date(r.createdAt).toLocaleDateString('uz-UZ')}
                </div>
                {r.body ? (
                  <p style={{ margin: '0 0 10px', lineHeight: 1.6, overflowWrap: 'break-word' }}>
                    {r.body}
                  </p>
                ) : (
                  <p style={{ margin: '0 0 10px', color: 'var(--alv-muted)' }}>Faqat baho qo‘yilgan</p>
                )}

                {r.mediaUrls.length > 0 ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {r.mediaUrls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt=""
                        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }}
                      />
                    ))}
                  </div>
                ) : null}

                <input
                  value={replies[r.id] ?? r.adminReply ?? ''}
                  onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })}
                  placeholder="Javob yozish (ixtiyoriy) — saytda sharh ostida ko‘rinadi"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 9,
                    border: '1px solid var(--alv-line)',
                    fontSize: 13.5,
                    background: 'var(--alv-surface)',
                    color: 'var(--alv-ink)',
                    marginBottom: 10,
                  }}
                />

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {r.status !== 'APPROVED' ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => adminApi.moderateReview(r.id, 'APPROVED', replies[r.id] ?? r.adminReply),
                          'Tasdiqlandi',
                        )
                      }
                      style={action('var(--alv-mint,#1F7A5C)')}
                    >
                      Tasdiqlash
                    </button>
                  ) : null}
                  {r.status !== 'REJECTED' ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(() => adminApi.moderateReview(r.id, 'REJECTED'), 'Rad etildi')
                      }
                      style={action('var(--alv-danger,#C0392B)')}
                    >
                      Rad etish
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}

        {items.length === 0 ? (
          <div className="alv-card" style={{ padding: 34, textAlign: 'center', color: 'var(--alv-muted)' }}>
            {status === 'PENDING'
              ? 'Moderatsiya navbati bo‘sh — hamma sharh ko‘rib chiqilgan'
              : 'Bu holatda sharh yo‘q'}
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
