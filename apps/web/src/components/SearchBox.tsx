'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { catalogApi, type Suggestion } from '@/lib/catalog-api';
import type { Locale } from '@/i18n/messages';

/**
 * Qidiruv maydoni va avtoto'ldirish (TZ 23).
 *
 * Kirill yozuvi ham ishlaydi: server so'rovni normallashtiradi, shuning uchun
 * "шампун" va "shampun" bir xil natija beradi (ekspertiza B-14).
 */
export function SearchBox({ locale, initial = '' }: { locale: Locale; initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }

    // Har bosishda so'rov yubormaymiz — 250 ms kutamiz.
    const timer = setTimeout(() => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      catalogApi
        .suggest(q, controller.signal)
        .then((res) => {
          setItems(res);
          setOpen(true);
        })
        .catch(() => undefined);
    }, 250);

    return () => clearTimeout(timer);
  }, [value]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q) router.push(`/${locale}/qidiruv?q=${encodeURIComponent(q)}`);
  };

  return (
    <div style={{ position: 'relative', maxWidth: 720 }}>
      <form onSubmit={submit} role="search">
        <input
          className="alv-input"
          style={{ height: 60, fontSize: 16, fontWeight: 600, paddingLeft: 20 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={locale === 'ru' ? 'Шампунь, сыворотка, крем…' : 'Shampun, serum, krem…'}
          aria-label={locale === 'ru' ? 'Поиск' : 'Qidiruv'}
          autoComplete="off"
        />
      </form>

      {open && items.length > 0 ? (
        <ul
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 68,
            zIndex: 10,
            listStyle: 'none',
            margin: 0,
            padding: 8,
            background: 'var(--alv-surface)',
            borderRadius: 18,
            boxShadow: 'var(--alv-shadow-md)',
          }}
        >
          {items.map((s) => (
            <li key={s.id}>
              <Link
                href={`/${locale}/mahsulot/${s.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 52,
                  padding: '0 14px',
                  borderRadius: 12,
                  color: 'var(--alv-ink)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14, flexGrow: 1 }}>
                  {locale === 'ru' ? s.nameRu : s.nameUz}
                </span>
                <span style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                  {s.category ? (locale === 'ru' ? s.category.nameRu : s.category.nameUz) : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
