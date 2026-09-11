'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/i18n/messages';

const NAV: Array<{ href: string; uz: string; ru: string }> = [
  { href: '', uz: 'Profil', ru: 'Профиль' },
  { href: '/buyurtmalar', uz: 'Buyurtmalar', ru: 'Заказы' },
  { href: '/qaytarishlar', uz: 'Qaytarishlar', ru: 'Возвраты' },
  { href: '/manzillar', uz: 'Manzillar', ru: 'Адреса' },
  { href: '/sevimlilar', uz: 'Sevimlilar', ru: 'Избранное' },
];

/** Kabinetning umumiy karkasi: chapda menyu, o'ngda tarkib. */
export function AccountShell({
  locale,
  title,
  children,
}: {
  locale: Locale;
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const base = `/${locale}/kabinet`;

  return (
    <div className="alv-shop-grid" style={{ gridTemplateColumns: '240px minmax(0, 1fr)' }}>
      <nav
        style={{
          background: 'var(--alv-surface)',
          borderRadius: 'var(--alv-radius-lg)',
          padding: 12,
          boxShadow: 'var(--alv-shadow-sm)',
          display: 'grid',
          gap: 4,
          alignSelf: 'start',
        }}
      >
        {NAV.map((item) => {
          const href = `${base}${item.href}`;
          const active = pathname === href || (item.href === '' && pathname === base);
          return (
            <Link
              key={item.href}
              href={href}
              style={{
                display: 'block',
                minHeight: 44,
                lineHeight: '44px',
                padding: '0 14px',
                borderRadius: 12,
                fontWeight: active ? 700 : 600,
                fontSize: 14,
                background: active ? 'var(--alv-brand-soft)' : 'transparent',
                color: active ? 'var(--alv-brand-deep)' : 'var(--alv-ink)',
              }}
            >
              {locale === 'ru' ? item.ru : item.uz}
            </Link>
          );
        })}
      </nav>

      <div>
        <h1
          style={{
            fontFamily: 'var(--alv-font-display)',
            fontSize: 26,
            letterSpacing: '-0.03em',
            margin: '0 0 18px',
          }}
        >
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}

export function AccountCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--alv-surface)',
        borderRadius: 'var(--alv-radius-lg)',
        padding: 20,
        boxShadow: 'var(--alv-shadow-sm)',
        display: 'grid',
        gap: 14,
        marginBottom: 16,
      }}
    >
      {title ? (
        <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 17, margin: 0 }}>{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

export function AccountAlert({
  tone,
  children,
}: {
  tone: 'danger' | 'mint' | 'warn';
  children: React.ReactNode;
}) {
  const colors = {
    danger: ['var(--alv-danger-soft)', 'var(--alv-danger)'],
    mint: ['var(--alv-mint-soft)', 'var(--alv-mint)'],
    warn: ['var(--alv-warn-soft)', 'var(--alv-warn)'],
  }[tone];

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      style={{
        padding: '12px 16px',
        borderRadius: 14,
        background: colors[0],
        color: colors[1],
        fontSize: 13.5,
        fontWeight: 600,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

/** Kabinet formalaridagi standart maydon. */
export const accountField: React.CSSProperties = {
  width: '100%',
  minHeight: 48,
  padding: '12px 14px',
  borderRadius: 12,
  border: 0,
  boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
  font: 'inherit',
  background: 'var(--alv-surface)',
};
