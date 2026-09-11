'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminCollection } from '@/lib/api';

/**
 * Kolleksiyalar — TZ 12.
 *
 * Backend to'liq tayyor edi (`/admin/collections` CRUD va mahsulot
 * biriktirish), faqat sahifa yozilmagan edi.
 */

const EMPTY = { slug: '', nameUz: '', nameRu: '', descUz: '', descRu: '', sortOrder: 0 };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ʻʼ‘’']/g, '')
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CollectionsPage() {
  const [items, setItems] = useState<AdminCollection[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await adminApi.collections());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

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
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = {
    padding: '9px 12px',
    borderRadius: 10,
    border: '1px solid var(--alv-line)',
    fontSize: 14,
    background: 'var(--alv-surface)',
    color: 'var(--alv-ink)',
    minWidth: 0,
  };

  return (
    <AdminShell title="Kolleksiyalar">
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

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 14 }}>
          Kolleksiya — marketing to‘plami (masalan «Yangi kelganlar»). Kategoriya bilan
          almashtirmang: mahsulot bitta kategoriyaga tegishli, kolleksiyaga esa nechtasiga ham
          kirishi mumkin.
        </p>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--alv-brand,#D6336C)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {open ? 'Yopish' : 'Yangi kolleksiya'}
        </button>
      </div>

      {open ? (
        <form
          className="alv-card"
          style={{ padding: 20, marginBottom: 22, display: 'grid', gap: 12 }}
          onSubmit={async (e) => {
            e.preventDefault();
            const done = await run(
              () =>
                adminApi.createCollection({
                  ...form,
                  slug: form.slug || slugify(form.nameUz),
                  sortOrder: Number(form.sortOrder) || 0,
                }),
              'Kolleksiya yaratildi',
            );
            if (done) {
              setForm(EMPTY);
              setOpen(false);
            }
          }}
        >
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}
          >
            <input
              required
              placeholder="Nomi (o‘zbekcha)"
              value={form.nameUz}
              onChange={(e) => setForm({ ...form, nameUz: e.target.value })}
              style={input}
            />
            <input
              required
              placeholder="Nomi (ruscha)"
              value={form.nameRu}
              onChange={(e) => setForm({ ...form, nameRu: e.target.value })}
              style={input}
            />
            <input
              placeholder="Manzil (bo‘sh = nomdan yasaladi)"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              style={input}
            />
            <input
              type="number"
              placeholder="Tartib"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
              style={input}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            style={{
              justifySelf: 'start',
              padding: '10px 22px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--alv-ink)',
              color: '#fff',
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            Yaratish
          </button>
        </form>
      ) : null}

      <div className="alv-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              {['Nomi', 'Manzil', 'Mahsulot', 'Holat', ''].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--alv-line)',
                    fontSize: 11,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: 'var(--alv-muted)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--alv-line)' }}>
                  <strong>{c.nameUz}</strong>
                  <div style={{ color: 'var(--alv-muted)', fontSize: 13 }}>{c.nameRu}</div>
                </td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--alv-line)' }}>
                  <code style={{ fontSize: 13 }}>/{c.slug}</code>
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--alv-line)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {c.productCount ?? 0}
                </td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--alv-line)' }}>
                  <span
                    className="alv-badge"
                    style={{
                      background: c.isActive ? 'var(--alv-mint,#1F7A5C)' : 'var(--alv-muted)',
                      color: '#fff',
                      fontSize: 11,
                    }}
                  >
                    {c.isActive ? 'Faol' : 'Yashirilgan'}
                  </span>
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--alv-line)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      void run(
                        () =>
                          adminApi.updateCollection(c.id, {
                            nameUz: c.nameUz,
                            nameRu: c.nameRu,
                            slug: c.slug,
                            isActive: !c.isActive,
                          }),
                        c.isActive ? 'Yashirildi' : 'Faollashtirildi',
                      )
                    }
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--alv-line)',
                      background: 'transparent',
                      color: 'var(--alv-ink)',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    {c.isActive ? 'Yashirish' : 'Faollashtirish'}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 28, textAlign: 'center', color: 'var(--alv-muted)' }}>
                  Hali kolleksiya yo‘q
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
