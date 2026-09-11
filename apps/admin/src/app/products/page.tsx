'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Input, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminProduct } from '@/lib/api';

const STATUS_TONE: Record<string, 'mint' | 'neutral' | 'low' | 'new'> = {
  ACTIVE: 'mint',
  DRAFT: 'neutral',
  HIDDEN: 'neutral',
  OUT_OF_STOCK: 'low',
  ARCHIVED: 'neutral',
};

const STATUS_FILTERS = [
  { value: '', label: 'Hammasi' },
  { value: 'ACTIVE', label: 'Faol' },
  { value: 'DRAFT', label: 'Qoralama' },
  { value: 'HIDDEN', label: 'Yashirilgan' },
  { value: 'OUT_OF_STOCK', label: 'Tugagan' },
];

export default function ProductsPage() {
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.products({ q: q || undefined, status: status || undefined });
      setItems(res.items);
      setTotal(res.total);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const bulk = async (newStatus: string) => {
    await adminApi.bulkStatus([...selected], newStatus);
    await load();
  };

  return (
    <AdminShell title="Mahsulotlar">
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          marginBottom: 18,
        }}
      >
        <div style={{ minWidth: 280 }}>
          <Input
            name="q"
            label="Qidiruv"
            placeholder="Nom, SKU yoki barcode — kirill ham ishlaydi"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              className={`alv-chip${status === s.value ? ' alv-chip--on' : ''}`}
              onClick={() => setStatus(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--alv-muted)', fontSize: 13 }}>
          Jami: {total}
        </span>
      </div>

      {selected.size > 0 ? (
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: 'var(--alv-surface-2)',
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 14,
          }}
        >
          <strong style={{ fontSize: 14 }}>{selected.size} ta tanlandi</strong>
          <Button size="sm" variant="outline" onClick={() => void bulk('ACTIVE')}>
            Faollashtirish
          </Button>
          <Button size="sm" variant="outline" onClick={() => void bulk('HIDDEN')}>
            Yashirish
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Bekor qilish
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" style={{ color: 'var(--alv-brand-deep)', fontWeight: 600 }}>
          {error}
        </p>
      ) : null}

      <div className="alv-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
          <thead>
            <tr style={{ textAlign: 'left', fontSize: 12, color: 'var(--alv-muted)' }}>
              <th style={{ padding: '14px 16px', width: 44 }} />
              <th style={{ padding: '14px 8px' }}>Nomi</th>
              <th style={{ padding: '14px 8px' }}>Status</th>
              <th style={{ padding: '14px 8px' }}>IKPU</th>
              <th style={{ padding: '14px 8px' }}>QQS</th>
              <th style={{ padding: '14px 8px' }}>Narx</th>
              <th style={{ padding: '14px 8px' }}>Variant</th>
              <th style={{ padding: '14px 16px' }}>Qoldiq</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 24, color: 'var(--alv-muted)' }}>
                  Yuklanmoqda…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 24, color: 'var(--alv-muted)' }}>
                  Mahsulot topilmadi. Import orqali qo‘shishingiz mumkin.
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid var(--alv-line)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      className={`alv-check${selected.has(p.id) ? ' alv-check--on' : ''}`}
                      style={{ minHeight: 32, width: 'auto' }}
                      onClick={() => toggle(p.id)}
                      aria-label={`${p.nameUz} ni tanlash`}
                      aria-pressed={selected.has(p.id)}
                    >
                      <span className="alv-check__box">{selected.has(p.id) ? '✓' : ''}</span>
                    </button>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nameUz}</div>
                    <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>/{p.slug}</div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <Badge tone={STATUS_TONE[p.status] ?? 'neutral'}>{p.status}</Badge>
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: 12, fontFamily: 'monospace' }}>
                    {p.ikpuCode}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: 13 }}>{p.vatRate}%</td>
                  <td style={{ padding: '12px 8px', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {formatTiyin(p.minPrice)}
                    {p.minPrice !== p.maxPrice ? ` – ${formatTiyin(p.maxPrice)}` : ''}
                    {p.hasSale ? ' 🏷' : ''}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: 13 }}>{p.variantsCount}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge tone={p.inStock ? 'mint' : 'low'}>{p.inStock ? 'Bor' : 'Yo‘q'}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: 'var(--alv-muted)', marginTop: 14, lineHeight: 1.6 }}>
        Mahsulot tahrirlash oynasi keyingi iteratsiyada qo‘shiladi. Hozircha yaratish va yangilash
        API (<code>POST /api/admin/catalog/products</code>) va Excel import orqali bajariladi.
      </p>
    </AdminShell>
  );
}
