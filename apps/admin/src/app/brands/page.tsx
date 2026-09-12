'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import { AdminShell } from '@/components/AdminShell';
import { EntityForm, type FormField } from '@/components/EntityForm';
import { adminApi, type AdminBrand } from '@/lib/api';

/**
 * Brendlar.
 *
 * Bu sahifa ham, uning ortidagi endpointlar ham yo'q edi: bazada
 * `Product.brandId` bor, lekin brendni yaratish yoki biriktirishning
 * yo'li yo'q edi. Mahsulot formasi uchun avval faqat ro'yxat qo'shilgan,
 * endi to'liq boshqaruv.
 *
 * O'chirish mahsulotga biriktirilgan brend uchun rad etiladi. `brandId`
 * nullable bo'lgani uchun baza buni jimgina uzib qo'yardi va yuzlab
 * mahsulot brendsiz qolardi — shuning uchun mahsulot soni ro'yxatda
 * ko'rsatiladi va o'chirish tugmasi shartli.
 */

export default function BrandsPage() {
  const [items, setItems] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await adminApi.brands());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Brendlarni yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const editing = items.find((b) => b.id === editingId) ?? null;
  const panelOpen = creating || Boolean(editing);

  // Ro'yxat kichik (o'nlab), shuning uchun qidiruv serverga bormaydi.
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (b) => b.name.toLowerCase().includes(needle) || b.slug.includes(needle),
    );
  }, [items, q]);

  const fields: FormField[] = [
    { key: 'name', label: 'Brend nomi', required: true, placeholder: 'ALIVER' },
    {
      key: 'slug',
      label: 'Slug',
      hint: 'Bo‘sh qoldirilsa nomdan yasaladi. Band bo‘lsa oxiriga raqam qo‘shiladi.',
      placeholder: 'aliver',
    },
    {
      key: 'logoUrl',
      label: 'Logotip manzili',
      hint: 'Ixtiyoriy. To‘liq URL.',
      placeholder: 'https://…/aliver.svg',
    },
  ];

  const initial = useMemo(() => {
    if (creating) return { name: '', slug: '', logoUrl: '' };
    if (!editing) return {};
    return { name: editing.name, slug: editing.slug, logoUrl: editing.logoUrl ?? '' };
  }, [creating, editing]);

  async function save(values: Record<string, unknown>) {
    setBusy(true);
    setPanelError(null);
    try {
      const body = {
        name: String(values.name ?? '').trim(),
        slug: String(values.slug ?? '').trim() || undefined,
        logoUrl: String(values.logoUrl ?? '').trim() || undefined,
      };
      if (creating) await adminApi.createBrand(body);
      else if (editingId) await adminApi.updateBrand(editingId, body);
      await load();
      close();
      setNotice(creating ? 'Brend qo‘shildi.' : 'Saqlandi.');
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : 'Saqlab bo‘lmadi');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!editing) return;
    setBusy(true);
    setPanelError(null);
    try {
      await adminApi.deleteBrand(editing.id);
      await load();
      close();
      setNotice('Brend o‘chirildi.');
    } catch (e) {
      setPanelError(e instanceof Error ? e.message : 'O‘chirib bo‘lmadi');
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setCreating(false);
    setEditingId(null);
    setPanelError(null);
  }

  return (
    <AdminShell title={t("Brendlar")}>
      {error ? (
        <div role="alert" className="alv-card" style={{ padding: 14, marginBottom: 14, borderLeft: '3px solid var(--alv-danger)' }}>
          {error}
        </div>
      ) : null}
      {notice ? (
        <div role="status" className="alv-card" style={{ padding: 14, marginBottom: 14, borderLeft: '3px solid var(--alv-mint)' }}>
          {notice}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("Brend nomi yoki slug")}
          aria-label={t("Brend qidirish")}
          style={{ ...FIELD, flex: '1 1 240px', maxWidth: 340 }}
        />
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setCreating(true);
            setPanelError(null);
          }}
          style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'var(--alv-ink)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          {t("+ Yangi brend")}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: panelOpen ? 'minmax(0,1fr) minmax(280px, 360px)' : '1fr', gap: 18, alignItems: 'start' }}>
        {loading ? (
          <p style={{ color: 'var(--alv-muted)' }}>{t("Yuklanmoqda…")}</p>
        ) : shown.length === 0 ? (
          <div className="alv-card" style={{ padding: 28, textAlign: 'center' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>
              {items.length === 0 ? t("Hali brend yo‘q") : t("Bu so‘rovga mos brend topilmadi")}
            </strong>
            <span style={{ color: 'var(--alv-muted)', fontSize: 14 }}>
              {items.length === 0
                ? t("Birinchi brendni yuqoridagi tugma bilan qo‘shing.")
                : t("Qidiruv so‘zini o‘zgartiring.")}
            </span>
          </div>
        ) : (
          <div className="alv-card" style={{ padding: 8 }}>
            {shown.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setCreating(false);
                  setEditingId(b.id);
                  setPanelError(null);
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 52,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  background: editingId === b.id ? 'var(--alv-surface-2)' : 'transparent',
                  color: 'var(--alv-ink)',
                  font: 'inherit',
                }}
              >
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.logoUrl} alt="" width={28} height={28} style={{ objectFit: 'contain', flex: 'none' }} />
                ) : (
                  <span aria-hidden style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--alv-line)', flex: 'none' }} />
                )}
                <span style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</span>
                <span style={{ color: 'var(--alv-muted)', fontSize: 12 }}>/{b.slug}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--alv-muted)' }}>
                  {b.productCount ?? 0} {t("mahsulot")}
                </span>
              </button>
            ))}
          </div>
        )}

        {panelOpen ? (
          <EntityForm
            title={creating ? 'Yangi brend' : `«${editing?.name}» ni tahrirlash`}
            fields={fields}
            initial={initial}
            busy={busy}
            error={panelError}
            onSubmit={save}
            onClose={close}
            onDelete={creating || (editing?.productCount ?? 0) > 0 ? undefined : remove}
          />
        ) : null}
      </div>

      {editing && (editing.productCount ?? 0) > 0 ? (
        <p style={{ marginTop: 14, fontSize: 13, color: 'var(--alv-muted)', lineHeight: 1.6 }}>
          {t("Bu brend")} {editing.productCount} {t("ta mahsulotda ishlatilyapti, shuning uchun o‘chirish tugmasi yo‘q. Avval o‘sha mahsulotlarning brendini almashtiring.")}
        </p>
      ) : null}
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
