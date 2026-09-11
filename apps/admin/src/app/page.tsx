'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@aliver/ui';
import { adminApi } from '@/lib/api';
import { visibleNav, type NavItem } from '@/lib/nav';

/**
 * Admin qobig'i. 1-etapda: kirish, huquqlar bo'yicha sidebar va audit log.
 * Modullar keyingi etaplarda shu qobiqqa qo'shiladi.
 */
export default function AdminHome() {
  const router = useRouter();
  const [items, setItems] = useState<NavItem[]>([]);
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .permissions()
      .then((res) => {
        setRole(res.role);
        setItems(visibleNav(res.permissions, res.role));
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <main style={{ padding: 40 }}>Yuklanmoqda…</main>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 250,
          background: 'var(--alv-surface)',
          borderRight: '1px solid var(--alv-line)',
          padding: 16,
        }}
      >
        <div style={{ fontFamily: 'var(--alv-font-display)', fontSize: 20, marginBottom: 4 }}>
          ALIVER<span style={{ color: 'var(--alv-brand)' }}>.UZ</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--alv-muted)', marginBottom: 16 }}>{role}</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((item) => (
            <span
              key={item.href}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: 40,
                padding: '0 12px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                color: item.stage === 1 ? 'var(--alv-ink)' : 'var(--alv-muted)',
              }}
            >
              {item.label}
              {item.stage > 1 ? (
                <span className="alv-badge alv-badge--neutral" style={{ height: 20, fontSize: 10 }}>
                  {item.stage}-etap
                </span>
              ) : null}
            </span>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 32 }}>
        <h1 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 32, margin: '0 0 8px' }}>
          Admin panel
        </h1>
        <p style={{ color: 'var(--alv-muted)', margin: '0 0 24px' }}>
          1-etap yakunlandi: autentifikatsiya, rollar va huquqlar, audit log ishlaydi. Sidebardagi
          bo‘limlar o‘z etapida ochiladi.
        </p>
        <Card style={{ padding: 24, maxWidth: 640 }}>
          <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 18, margin: '0 0 10px' }}>
            Keyingi qadam
          </h2>
          <p style={{ margin: 0, color: 'var(--alv-ink-2)', lineHeight: 1.7 }}>
            2-etap — katalog: mahsulot, variant, kategoriya, kolleksiya, media, qidiruv va Excel
            import. Prototipdagi «Bosh sahifa», «Katalog», «Mahsulot» va «Qidiruv» ekranlari shu
            etapda ishga tushadi.
          </p>
        </Card>
      </main>
    </div>
  );
}
