'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { EntityForm, type FormField } from '@/components/EntityForm';
import { adminApi, type AdminCategory } from '@/lib/api';

/**
 * Kategoriyalar — TZ 22.
 *
 * Ilgari bu sahifa faqat daraxtni CHIZARDI. Yaratish, tahrirlash va
 * o'chirish API da allaqachon bor edi, ularga yetib boradigan yo'l yo'q
 * edi — ya'ni katalog tuzilmasini o'zgartirish uchun dasturchi kerak
 * bo'lardi.
 *
 * Ierarxiya uch daraja bilan cheklangan va bu API darajasida ushlab
 * turiladi. Shuning uchun ota-kategoriya ro'yxatida uchinchi darajali
 * yozuvlar KO'RSATILMAYDI: aks holda foydalanuvchi to'rtinchi darajani
 * yaratishga urinib, faqat saqlagandan keyin xato oladi.
 */

interface Flat {
  id: string;
  label: string;
  depth: number;
}

function flatten(nodes: AdminCategory[], depth = 0): Flat[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${'— '.repeat(depth)}${n.nameUz}`, depth },
    ...flatten(n.children ?? [], depth + 1),
  ]);
}

function findNode(nodes: AdminCategory[], id: string): AdminCategory | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children ?? [], id);
    if (hit) return hit;
  }
  return null;
}

/** Kategoriyaning daraxtdagi otasi — tahrirlashda formani to'ldirish uchun. */
function findParentId(nodes: AdminCategory[], id: string, parent: string = ''): string {
  for (const n of nodes) {
    if (n.id === id) return parent;
    const hit = findParentId(n.children ?? [], id, n.id);
    if (hit) return hit;
  }
  return '';
}

export default function CategoriesPage() {
  const [tree, setTree] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTree(await adminApi.categories());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kategoriyalarni yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flat = useMemo(() => flatten(tree), [tree]);
  const editing = editingId ? findNode(tree, editingId) : null;

  /**
   * Ota bo'la oladiganlar: faqat 0 va 1-daraja. Tahrirlashda kategoriya
   * o'zi va o'z avlodlari ham chiqarib tashlanadi — aks holda o'zini
   * o'ziga ota qilib qo'yish mumkin bo'lardi va daraxt halqaga aylanardi.
   */
  const parentOptions = useMemo(() => {
    const banned = new Set<string>();
    if (editing) {
      const collect = (n: AdminCategory) => {
        banned.add(n.id);
        (n.children ?? []).forEach(collect);
      };
      collect(editing);
    }
    return [
      { value: '', label: '— yuqori daraja —' },
      ...flat
        .filter((f) => f.depth < 2 && !banned.has(f.id))
        .map((f) => ({ value: f.id, label: f.label })),
    ];
  }, [flat, editing]);

  const fields: FormField[] = [
    { key: 'nameUz', label: 'Nomi (o‘zbekcha)', required: true },
    { key: 'nameRu', label: 'Nomi (ruscha)', required: true },
    {
      key: 'slug',
      label: 'Slug',
      hint: 'Bo‘sh qoldirilsa nomdan avtomatik yasaladi. O‘zgartirish eski havolalarni buzadi.',
    },
    { key: 'parentId', label: 'Ota kategoriya', type: 'select', options: parentOptions },
    { key: 'sortOrder', label: 'Tartib raqami', type: 'number' },
    { key: 'isActive', label: 'Holat', type: 'checkbox', hint: 'Saytda ko‘rinsin' },
    { key: 'descUz', label: 'Tavsif (o‘zb.)', type: 'textarea' },
    { key: 'descRu', label: 'Tavsif (rus.)', type: 'textarea' },
    { key: 'seoTitleUz', label: 'SEO sarlavha (o‘zb.)' },
    { key: 'seoTitleRu', label: 'SEO sarlavha (rus.)' },
  ];

  const initial = useMemo(() => {
    if (creating) {
      return { nameUz: '', nameRu: '', slug: '', parentId: '', sortOrder: 0, isActive: true, descUz: '', descRu: '', seoTitleUz: '', seoTitleRu: '' };
    }
    if (!editing) return {};
    return {
      nameUz: editing.nameUz ?? '',
      nameRu: editing.nameRu ?? '',
      slug: editing.slug ?? '',
      parentId: findParentId(tree, editing.id),
      sortOrder: 0,
      isActive: editing.isActive,
      descUz: '',
      descRu: '',
      seoTitleUz: '',
      seoTitleRu: '',
    };
  }, [creating, editing, tree]);

  async function save(values: Record<string, unknown>) {
    setBusy(true);
    setPanelError(null);
    try {
      const body = {
        nameUz: String(values.nameUz ?? '').trim(),
        nameRu: String(values.nameRu ?? '').trim(),
        slug: String(values.slug ?? '').trim() || undefined,
        parentId: String(values.parentId ?? '') || undefined,
        sortOrder: Number(values.sortOrder ?? 0) || 0,
        isActive: Boolean(values.isActive),
        descUz: String(values.descUz ?? '').trim() || undefined,
        descRu: String(values.descRu ?? '').trim() || undefined,
        seoTitleUz: String(values.seoTitleUz ?? '').trim() || undefined,
        seoTitleRu: String(values.seoTitleRu ?? '').trim() || undefined,
      };
      if (creating) await adminApi.createCategory(body);
      else if (editingId) await adminApi.updateCategory(editingId, body);
      await load();
      close();
      setNotice(creating ? 'Kategoriya yaratildi.' : 'Saqlandi.');
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
      await adminApi.deleteCategory(editing.id);
      await load();
      close();
      setNotice('Kategoriya o‘chirildi.');
    } catch (e) {
      // Ichida mahsulot yoki bola kategoriya bo'lsa server rad etadi va
      // sababini aytadi — biz uni yashirmaymiz.
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

  const panelOpen = creating || Boolean(editing);

  return (
    <AdminShell title="Kategoriyalar">
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
        <p style={{ color: 'var(--alv-muted)', margin: 0, maxWidth: 620, lineHeight: 1.6 }}>
          Ierarxiya maksimal uch daraja. To‘rtinchi darajani qo‘shishga urinish API
          darajasida rad etiladi — bu URL, breadcrumb va SEO ni tushunarli saqlaydi.
        </p>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setCreating(true);
            setPanelError(null);
          }}
          style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: 'var(--alv-ink)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          + Yangi kategoriya
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: panelOpen ? 'minmax(0,1fr) minmax(280px, 360px)' : '1fr', gap: 18, alignItems: 'start' }}>
        {loading ? (
          <p style={{ color: 'var(--alv-muted)' }}>Yuklanmoqda…</p>
        ) : tree.length === 0 ? (
          <div className="alv-card" style={{ padding: 28, textAlign: 'center' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Hali kategoriya yo‘q</strong>
            <span style={{ color: 'var(--alv-muted)', fontSize: 14 }}>
              Birinchi kategoriyani yuqoridagi tugma bilan yarating.
            </span>
          </div>
        ) : (
          <div className="alv-card" style={{ padding: 8 }}>
            {tree.map((c) => (
              <Node key={c.id} node={c} level={0} activeId={editingId} onPick={(id) => { setCreating(false); setEditingId(id); setPanelError(null); }} />
            ))}
          </div>
        )}

        {panelOpen ? (
          <EntityForm
            title={creating ? 'Yangi kategoriya' : `«${editing?.nameUz}» ni tahrirlash`}
            fields={fields}
            initial={initial}
            busy={busy}
            error={panelError}
            onSubmit={save}
            onClose={close}
            onDelete={creating ? undefined : remove}
          />
        ) : null}
      </div>
    </AdminShell>
  );
}

function Node({
  node,
  level,
  activeId,
  onPick,
}: {
  node: AdminCategory;
  level: number;
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  const active = activeId === node.id;
  return (
    <>
      <button
        type="button"
        onClick={() => onPick(node.id)}
        style={{
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 48,
          padding: `0 12px 0 ${12 + level * 24}px`,
          borderRadius: 10,
          border: 'none',
          cursor: 'pointer',
          background: active ? 'var(--alv-surface-2)' : 'transparent',
          color: 'var(--alv-ink)',
          font: 'inherit',
        }}
      >
        <span style={{ color: 'var(--alv-muted)', fontSize: 12, width: 16 }}>
          {level > 0 ? '└' : ''}
        </span>
        <span style={{ fontWeight: level === 0 ? 700 : 600, fontSize: 14 }}>{node.nameUz}</span>
        <span style={{ color: 'var(--alv-muted)', fontSize: 12 }}>/{node.slug}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
            {node.productCount ?? 0} mahsulot
          </span>
          <Badge tone={node.isActive ? 'mint' : 'neutral'}>
            {node.isActive ? 'Faol' : 'O‘chiq'}
          </Badge>
        </span>
      </button>
      {node.children.map((child) => (
        <Node key={child.id} node={child} level={level + 1} activeId={activeId} onPick={onPick} />
      ))}
    </>
  );
}
