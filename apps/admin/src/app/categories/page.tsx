'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminCategory } from '@/lib/api';

export default function CategoriesPage() {
  const [tree, setTree] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .categories()
      .then(setTree)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title="Kategoriyalar">
      <p
        style={{
          color: 'var(--alv-muted)',
          marginTop: -10,
          marginBottom: 20,
          maxWidth: 640,
          lineHeight: 1.6,
        }}
      >
        Ierarxiya maksimal uch daraja. To‘rtinchi darajani qo‘shishga urinish API darajasida rad
        etiladi — bu URL, breadcrumb va SEO ni tushunarli saqlaydi.
      </p>

      {loading ? (
        <p style={{ color: 'var(--alv-muted)' }}>Yuklanmoqda…</p>
      ) : (
        <div className="alv-card" style={{ padding: 8 }}>
          {tree.map((c) => (
            <Node key={c.id} node={c} level={0} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function Node({ node, level }: { node: AdminCategory; level: number }) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minHeight: 48,
          padding: `0 12px 0 ${12 + level * 24}px`,
          borderRadius: 10,
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
      </div>
      {node.children.map((child) => (
        <Node key={child.id} node={child} level={level + 1} />
      ))}
    </>
  );
}
