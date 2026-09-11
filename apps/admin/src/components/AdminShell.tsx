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
  const [open, setOpen] = useState(false);

  // Sahifa almashganda mobil menyu yopiladi: aks holda bosgandan keyin
  // u ochiq qolib, yangi sahifani to'sib turadi.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
    <div className={`alv-adm${open ? ' alv-adm--open' : ''}`}>
      <div className="alv-adm__bar">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="alv-adm-nav"
          aria-label={open ? 'Menyuni yopish' : 'Menyuni ochish'}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: '1px solid var(--alv-line)',
            background: 'var(--alv-surface)',
            color: 'var(--alv-ink)',
            fontSize: 18,
            cursor: 'pointer',
            flex: 'none',
          }}
        >
          {open ? '\u2715' : '\u2630'}
        </button>
        <strong style={{ fontSize: 15, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </strong>
      </div>

      <button
        type="button"
        className="alv-adm__scrim"
        aria-label="Menyuni yopish"
        onClick={() => setOpen(false)}
      />

      <aside id="alv-adm-nav" className="alv-adm__side">
        <Link
          href="/"
          style={{ fontFamily: 'var(--alv-font-display)', fontSize: 20, color: 'var(--alv-ink)' }}
        >
          ALIVER<span style={{ color: 'var(--alv-brand)' }}>.UZ</span>
        </Link>
        <div style={{ fontSize: 12, color: 'var(--alv-muted)', margin: '4px 0 16px' }}>{role}</div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((item) => {
            const active = pathname === item.href || pathname === item.href.split('#')[0];
            const { ready } = item;
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
                  padding: '0 10px',
                  gap: 8,
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: active ? 700 : 600,
                  background: active ? 'var(--alv-ink)' : 'transparent',
                  color: active ? '#fff' : ready ? 'var(--alv-ink)' : 'var(--alv-muted)',
                  pointerEvents: ready ? 'auto' : 'none',
                }}
              >
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.label}
                </span>
                {!ready ? (
                  <span
                    className="alv-badge alv-badge--neutral"
                    style={{ height: 18, fontSize: 9, padding: '0 6px', letterSpacing: '.04em', whiteSpace: 'nowrap', flex: 'none' }}
                    title="Bu bo'lim hali yozilmagan"
                  >
                    tez orada
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="alv-adm__main">
        <h1 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 30, margin: '0 0 22px' }}>
          {title}
        </h1>
        {children}
      </main>
    </div>
  );
}
