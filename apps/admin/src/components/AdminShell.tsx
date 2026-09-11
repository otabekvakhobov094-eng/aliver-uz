'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { adminApi } from '@/lib/api';
import { visibleNav, type NavItem } from '@/lib/nav';

/** Admin panel qobig'i: sidebar huquqlar bo'yicha quriladi (TZ 58, 74). */
export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<NavItem[]>([]);
  const [role, setRole] = useState('');
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
          width: 240,
          flex: 'none',
          background: 'var(--alv-surface)',
          borderRight: '1px solid var(--alv-line)',
          padding: 16,
        }}
      >
        <Link
          href="/"
          style={{ fontFamily: 'var(--alv-font-display)', fontSize: 20, color: 'var(--alv-ink)' }}
        >
          ALIVER<span style={{ color: 'var(--alv-brand)' }}>.UZ</span>
        </Link>
        <div style={{ fontSize: 12, color: 'var(--alv-muted)', margin: '4px 0 16px' }}>{role}</div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((item) => {
            const active = pathname === item.href;
            const ready = item.stage <= 2;
            return (
              <Link
                key={item.href}
                href={ready ? item.href : '#'}
                aria-disabled={!ready}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 40,
                  padding: '0 12px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: active ? 700 : 600,
                  background: active ? 'var(--alv-ink)' : 'transparent',
                  color: active ? '#fff' : ready ? 'var(--alv-ink)' : 'var(--alv-muted)',
                  pointerEvents: ready ? 'auto' : 'none',
                }}
              >
                {item.label}
                {!ready ? (
                  <span
                    className="alv-badge alv-badge--neutral"
                    style={{ height: 20, fontSize: 10 }}
                  >
                    {item.stage}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main style={{ flexGrow: 1, padding: 32, minWidth: 0 }}>
        <h1 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 30, margin: '0 0 22px' }}>
          {title}
        </h1>
        {children}
      </main>
    </div>
  );
}
