'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminMenuItem, type MenuOptions } from '@/lib/api';

/**
 * Sayt menyusi — TZ 41.
 *
 * Ilgari menyu saytning kodida, `SiteHeader.tsx` ichidagi massivda
 * edi: yangi bo'lim qo'shish uchun dasturchi va deploy kerak bo'lardi.
 *
 * Bu yerdagi asosiy qaror — bandga oddiy `href` yozdirmaslik. Agar
 * admin manzilni qo'lda yozsa, xato havola sayt uchun 404 ham
 * bermaydi: `/katalog?category=tirnoqlar` shunchaki BO'SH katalogni
 * ochadi va hech kim sezmaydi. Shuning uchun band NISHON turini
 * tanlaydi, server esa saqlashdan oldin o'sha kategoriya/kolleksiya/
 * sahifa haqiqatan mavjudligini tekshiradi va yo'q bo'lsa rad etadi.
 */

const TYPE_LABELS: Record<string, string> = {
  HOME: 'Bosh sahifa',
  CATEGORY: 'Kategoriya',
  COLLECTION: 'Kolleksiya',
  PAGE: 'Sahifa',
  BLOG: 'Blog',
  ROUTE: 'Sayt bo‘limi',
  URL: 'Tashqi havola',
};

const VALUE_HINTS: Record<string, string> = {
  CATEGORY: 'Kategoriya slugi, masalan: soch-parvarishi',
  COLLECTION: 'Kolleksiya slugi, masalan: best-sellers',
  PAGE: 'Nashr qilingan sahifa slugi, masalan: originallik',
  BLOG: 'Bo‘sh qoldirilsa — blog ro‘yxati. Slug yozilsa — bitta maqola',
  URL: 'https:// bilan boshlanadigan to‘liq manzil',
};

const EMPTY = {
  labelUz: '',
  labelRu: '',
  noteUz: '',
  noteRu: '',
  targetType: 'ROUTE',
  targetValue: '',
  parentId: '',
  isActive: true,
  isHighlighted: false,
};

type Draft = typeof EMPTY;

export default function MenuPage() {
  const [location, setLocation] = useState<'HEADER' | 'FOOTER'>('HEADER');
  const [items, setItems] = useState<AdminMenuItem[]>([]);
  const [options, setOptions] = useState<MenuOptions | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await adminApi.menu(location));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [location]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    adminApi
      .menuOptions()
      .then(setOptions)
      .catch(() => setOptions(null));
  }, []);

  const parents = useMemo(() => items.filter((i) => !i.parentId), [items]);
  const childrenOf = useCallback(
    (id: string) => items.filter((i) => i.parentId === id),
    [items],
  );

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

  function body(d: Draft) {
    return {
      location,
      parentId: d.parentId || undefined,
      labelUz: d.labelUz.trim(),
      labelRu: d.labelRu.trim(),
      noteUz: d.noteUz.trim() || undefined,
      noteRu: d.noteRu.trim() || undefined,
      targetType: d.targetType,
      targetValue: d.targetValue.trim() || undefined,
      isActive: d.isActive,
      isHighlighted: d.isHighlighted,
    };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const ok = editingId
      ? await run(() => adminApi.updateMenuItem(editingId, body(draft)), 'Band yangilandi')
      : await run(() => adminApi.createMenuItem(body(draft)), 'Band qo‘shildi');
    if (ok) {
      setDraft(EMPTY);
      setEditingId(null);
    }
  }

  function startEdit(item: AdminMenuItem) {
    setEditingId(item.id);
    setDraft({
      labelUz: item.labelUz,
      labelRu: item.labelRu,
      noteUz: item.noteUz ?? '',
      noteRu: item.noteRu ?? '',
      targetType: item.targetType,
      targetValue: item.targetValue ?? '',
      parentId: item.parentId ?? '',
      isActive: item.isActive,
      isHighlighted: item.isHighlighted,
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Bandni bir pog'ona yuqoriga/pastga — aka-ukalari orasida. */
  async function move(item: AdminMenuItem, delta: number) {
    const siblings = items
      .filter((i) => i.parentId === item.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((i) => i.id === item.id);
    const next = index + delta;
    if (next < 0 || next >= siblings.length) return;
    const reordered = [...siblings];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(next, 0, moved!);
    await run(() => adminApi.reorderMenu(reordered.map((i) => i.id)), 'Tartib saqlandi');
  }

  const input: React.CSSProperties = {
    padding: '9px 12px',
    borderRadius: 10,
    border: '1px solid var(--alv-line)',
    fontSize: 14,
    background: 'var(--alv-surface)',
    color: 'var(--alv-ink)',
    minWidth: 0,
    width: '100%',
  };

  const needsValue = draft.targetType !== 'HOME';
  const brokenCount = items.filter((i) => i.broken).length;

  function row(item: AdminMenuItem, depth: number) {
    return (
      <div
        key={item.id}
        className="alv-card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) auto',
          gap: 12,
          alignItems: 'center',
          padding: '12px 14px',
          marginLeft: depth * 24,
          borderLeft: item.broken ? '3px solid var(--alv-danger,#C0392B)' : undefined,
          opacity: item.isActive ? 1 : 0.55,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong>{item.labelUz}</strong>
            <span style={{ fontSize: 12, color: 'var(--alv-muted)' }}>{item.labelRu}</span>
            {item.isHighlighted ? (
              <span style={{ fontSize: 11, color: 'var(--alv-brand)' }}>ajratilgan</span>
            ) : null}
            {!item.isActive ? (
              <span style={{ fontSize: 11, color: 'var(--alv-muted)' }}>o‘chirilgan</span>
            ) : null}
          </div>
          <div
            style={{
              fontSize: 12,
              color: item.broken ? 'var(--alv-danger,#C0392B)' : 'var(--alv-muted)',
              marginTop: 3,
              overflowWrap: 'anywhere',
            }}
          >
            {TYPE_LABELS[item.targetType] ?? item.targetType}
            {item.targetValue ? ` · ${item.targetValue}` : ''} → {item.href || '/'}
            {item.broken ? ' · nishon topilmadi, saytda ko‘rinmaydi' : ''}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => void move(item, -1)} disabled={busy} aria-label="Yuqoriga" style={btn}>
            ↑
          </button>
          <button type="button" onClick={() => void move(item, 1)} disabled={busy} aria-label="Pastga" style={btn}>
            ↓
          </button>
          <button type="button" onClick={() => startEdit(item)} disabled={busy} style={btn}>
            Tahrirlash
          </button>
          <button
            type="button"
            disabled={busy}
            style={{ ...btn, color: 'var(--alv-danger,#C0392B)' }}
            onClick={() => {
              const kids = childrenOf(item.id).length;
              const message = kids
                ? `«${item.labelUz}» va uning ${kids} ta ichki bandi o‘chiriladi. Davom etamizmi?`
                : `«${item.labelUz}» o‘chiriladi. Davom etamizmi?`;
              if (window.confirm(message)) void run(() => adminApi.deleteMenuItem(item.id), 'Band o‘chirildi');
            }}
          >
            O‘chirish
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminShell title="Sayt menyusi">
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
        <div role="status" className="alv-card" style={{ padding: 14, marginBottom: 16 }}>
          {notice}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {(['HEADER', 'FOOTER'] as const).map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => {
              setLocation(loc);
              setEditingId(null);
              setDraft(EMPTY);
            }}
            style={{
              ...btn,
              background: location === loc ? 'var(--alv-ink)' : 'var(--alv-surface)',
              color: location === loc ? 'var(--alv-surface)' : 'var(--alv-ink)',
            }}
          >
            {loc === 'HEADER' ? 'Sarlavha menyusi' : 'Footer menyusi'}
          </button>
        ))}
      </div>

      {brokenCount > 0 ? (
        <div
          role="alert"
          className="alv-card"
          style={{ padding: 14, marginBottom: 16, borderLeft: '3px solid var(--alv-danger,#C0392B)' }}
        >
          {brokenCount} ta bandning nishoni topilmadi. Ular saytda ko‘rsatilmayapti — nishonini
          tuzating yoki bandni o‘chiring.
        </div>
      ) : null}

      <form
        onSubmit={submit}
        className="alv-card"
        style={{ display: 'grid', gap: 12, padding: 18, marginBottom: 22 }}
      >
        <strong>{editingId ? 'Bandni tahrirlash' : 'Yangi band'}</strong>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          <label style={lbl}>
            Nomi (uz)
            <input required maxLength={60} style={input} value={draft.labelUz} onChange={(e) => setDraft({ ...draft, labelUz: e.target.value })} />
          </label>
          <label style={lbl}>
            Nomi (ru)
            <input required maxLength={60} style={input} value={draft.labelRu} onChange={(e) => setDraft({ ...draft, labelRu: e.target.value })} />
          </label>

          <label style={lbl}>
            Nishon turi
            <select
              style={input}
              value={draft.targetType}
              onChange={(e) => setDraft({ ...draft, targetType: e.target.value, targetValue: '' })}
            >
              {(options?.targetTypes ?? Object.keys(TYPE_LABELS)).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </label>

          {needsValue ? (
            <label style={lbl}>
              Nishon
              {draft.targetType === 'ROUTE' ? (
                <select style={input} value={draft.targetValue} onChange={(e) => setDraft({ ...draft, targetValue: e.target.value })} required>
                  <option value="">— tanlang —</option>
                  {(options?.routes ?? []).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  style={input}
                  value={draft.targetValue}
                  placeholder={VALUE_HINTS[draft.targetType] ?? ''}
                  onChange={(e) => setDraft({ ...draft, targetValue: e.target.value })}
                  required={draft.targetType !== 'BLOG'}
                />
              )}
              <span style={{ fontSize: 11, color: 'var(--alv-muted)', fontWeight: 400 }}>
                {VALUE_HINTS[draft.targetType] ?? ''}
              </span>
            </label>
          ) : null}

          <label style={lbl}>
            Ota band
            <select style={input} value={draft.parentId} onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}>
              <option value="">— yuqori daraja —</option>
              {parents
                .filter((p) => p.id !== editingId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.labelUz}
                  </option>
                ))}
            </select>
          </label>

          <label style={lbl}>
            Izoh (uz)
            <input maxLength={120} style={input} value={draft.noteUz} onChange={(e) => setDraft({ ...draft, noteUz: e.target.value })} />
            <span style={{ fontSize: 11, color: 'var(--alv-muted)', fontWeight: 400 }}>
              Ochiluvchi menyuda nom ostida chiqadi
            </span>
          </label>
          <label style={lbl}>
            Izoh (ru)
            <input maxLength={120} style={input} value={draft.noteRu} onChange={(e) => setDraft({ ...draft, noteRu: e.target.value })} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
            Saytda ko‘rsatilsin
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input type="checkbox" checked={draft.isHighlighted} onChange={(e) => setDraft({ ...draft, isHighlighted: e.target.checked })} />
            Ajratib ko‘rsatilsin
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={busy} style={{ ...btn, background: 'var(--alv-ink)', color: 'var(--alv-surface)' }}>
            {editingId ? 'Saqlash' : 'Qo‘shish'}
          </button>
          {editingId ? (
            <button
              type="button"
              style={btn}
              onClick={() => {
                setEditingId(null);
                setDraft(EMPTY);
              }}
            >
              Bekor qilish
            </button>
          ) : null}
        </div>
      </form>

      <div style={{ display: 'grid', gap: 8 }}>
        {parents.length === 0 ? (
          <p style={{ color: 'var(--alv-muted)' }}>Bu joylashuvda hali band yo‘q.</p>
        ) : null}
        {parents.map((p) => (
          <div key={p.id} style={{ display: 'grid', gap: 8 }}>
            {row(p, 0)}
            {childrenOf(p.id).map((c) => row(c, 1))}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}

const btn: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid var(--alv-line)',
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  fontSize: 13,
  cursor: 'pointer',
};

const lbl: React.CSSProperties = { display: 'grid', gap: 5, fontSize: 13, fontWeight: 600, minWidth: 0 };
