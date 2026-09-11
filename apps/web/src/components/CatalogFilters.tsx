'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@aliver/ui';
import type { CategoryNode } from '@/lib/catalog-api';
import { pick } from '@/lib/catalog-api';
import type { Locale } from '@/i18n/messages';

const SORTS: Array<{ value: string; uz: string; ru: string }> = [
  { value: 'popular', uz: 'Ommabop', ru: 'Популярные' },
  { value: 'newest', uz: 'Yangi kelganlar', ru: 'Новинки' },
  { value: 'price_asc', uz: 'Arzondan qimmatga', ru: 'Сначала дешевле' },
  { value: 'price_desc', uz: 'Qimmatdan arzonga', ru: 'Сначала дороже' },
  { value: 'rating', uz: 'Reyting bo‘yicha', ru: 'По рейтингу' },
];

const TAGS: Array<{ slug: string; uz: string; ru: string }> = [
  { slug: 'soch-tokilishi', uz: 'Soch to‘kilishi', ru: 'Выпадение волос' },
  { slug: 'quruqlik', uz: 'Quruqlik', ru: 'Сухость' },
  { slug: 'bolinish', uz: 'Uchlarining bo‘linishi', ru: 'Секущиеся кончики' },
  { slug: 'yoglanish', uz: 'Yog‘lanish', ru: 'Жирность' },
];

/**
 * Filtr paneli. Holat URL da saqlanadi (TZ 102): sahifani yangilash yoki
 * havolani ulashish filtrni yo'qotmaydi.
 */
export function CatalogFilters({
  categories,
  locale,
  total,
}: {
  categories: CategoryNode[];
  locale: Locale;
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  /*
   * Narx maydonlari MANZILDAN boshqariladi.
   *
   * `useState(...)` boshlang'ich qiymati faqat birinchi chizishda
   * o'qiladi, shuning uchun manzil o'zgarganda (masalan "Tozalash"
   * bosilganda) maydonlar `useEffect` orqali yangilanadi — komponent
   * qayta yaratilmaydi, chunki `router.push` uni remount qilmaydi.
   */
  const urlMin = params.get('minPrice') ?? '';
  const urlMax = params.get('maxPrice') ?? '';
  const [minPrice, setMinPrice] = useState(urlMin);
  const [maxPrice, setMaxPrice] = useState(urlMax);

  useEffect(() => {
    setMinPrice(urlMin);
    setMaxPrice(urlMax);
  }, [urlMin, urlMax]);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
      next.delete('page'); // filtr o'zgarsa birinchi sahifaga qaytamiz
      router.push(`?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const toggleInList = useCallback(
    (key: string, value: string) => {
      const current = (params.get(key) ?? '').split(',').filter(Boolean);
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setParam(key, next.join(','));
    },
    [params, setParam],
  );

  const has = (key: string, value: string) =>
    (params.get(key) ?? '').split(',').filter(Boolean).includes(value);

  const activeCount = ['category', 'tags', 'onSale', 'inStock', 'minPrice', 'maxPrice'].filter(
    (k) => Boolean(params.get(k)),
  ).length;

  const clearAll = () => router.push('?', { scroll: false });

  const body = (
    <div className="alv-filters">
      <div className="alv-filter-group">
        <div className="alv-filter-group__title">
          {locale === 'ru' ? 'Категория' : 'Kategoriya'}
        </div>
        {categories.map((c) => (
          <Check
            key={c.id}
            label={pick(c as never, 'name', locale)}
            count={c.productCount}
            on={params.get('category') === c.slug}
            onClick={() => setParam('category', params.get('category') === c.slug ? null : c.slug)}
          />
        ))}
      </div>

      <div className="alv-filter-group">
        <div className="alv-filter-group__title">{locale === 'ru' ? 'Наличие' : 'Mavjudlik'}</div>
        <Check
          label={locale === 'ru' ? 'Только в наличии' : 'Sotuvda bor'}
          on={params.get('inStock') === 'true'}
          onClick={() => setParam('inStock', params.get('inStock') === 'true' ? null : 'true')}
        />
        <Check
          label={locale === 'ru' ? 'Со скидкой' : 'Aksiyada'}
          on={params.get('onSale') === 'true'}
          onClick={() => setParam('onSale', params.get('onSale') === 'true' ? null : 'true')}
        />
      </div>

      <div className="alv-filter-group">
        <div className="alv-filter-group__title">{locale === 'ru' ? 'Проблема' : 'Muammo'}</div>
        {TAGS.map((t) => (
          <Check
            key={t.slug}
            label={locale === 'ru' ? t.ru : t.uz}
            on={has('tags', t.slug)}
            onClick={() => toggleInList('tags', t.slug)}
          />
        ))}
      </div>

      <div className="alv-filter-group">
        <div className="alv-filter-group__title">
          {locale === 'ru' ? 'Цена, сум' : 'Narx, so‘m'}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="alv-input"
            style={{ height: 44 }}
            inputMode="numeric"
            // Boshqariladigan maydon: `defaultValue` bilan "Tozalash" bosilganda
            // DOM dagi eski qiymat qolib ketardi va mijoz filtr hali
            // ishlayapti deb o'ylardi.
            value={minPrice}
            onChange={(e) => setMinPrice(e.currentTarget.value)}
            placeholder="0"
            aria-label={locale === 'ru' ? 'Минимальная цена' : 'Eng past narx'}
            onBlur={(e) => setParam('minPrice', e.target.value.replace(/\D/g, '') || null)}
          />
          <span className="alv-muted">—</span>
          <input
            className="alv-input"
            style={{ height: 44 }}
            inputMode="numeric"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.currentTarget.value)}
            placeholder="500000"
            aria-label={locale === 'ru' ? 'Максимальная цена' : 'Eng yuqori narx'}
            onBlur={(e) => setParam('maxPrice', e.target.value.replace(/\D/g, '') || null)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobil boshqaruv paneli */}
      <div className="alv-mobile-only" style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <Button variant="dark" size="sm" fullWidth onClick={() => setOpen(true)}>
          {locale === 'ru' ? 'Фильтр' : 'Filtr'} {activeCount > 0 ? `(${activeCount})` : ''}
        </Button>
        <SortSelect
          locale={locale}
          value={params.get('sort') ?? 'popular'}
          onChange={(v) => setParam('sort', v)}
        />
      </div>

      <aside className="alv-desktop-only" style={{ width: 264, flex: 'none' }}>
        {/*
          Saralash DESKTOPDA ham kerak.

          Ilgari `SortSelect` faqat mobil panelda chizilardi, ya'ni 900px
          dan keng ekranda saralashni o'zgartirishning yagona yo'li
          manzilga `?sort=` ni qo'lda yozish edi.
        */}
        <div style={{ marginBottom: 18 }}>
          <strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
            {locale === 'ru' ? 'Сортировка' : 'Saralash'}
          </strong>
          <SortSelect
            locale={locale}
            value={params.get('sort') ?? 'popular'}
            onChange={(v) => setParam('sort', v)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <strong style={{ fontSize: 14 }}>{locale === 'ru' ? 'Фильтры' : 'Filtrlar'}</strong>
          {activeCount > 0 ? (
            <button
              onClick={clearAll}
              style={{
                background: 'none',
                border: 0,
                color: 'var(--alv-brand)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {locale === 'ru' ? 'Сбросить' : 'Tozalash'}
            </button>
          ) : null}
        </div>
        {body}
      </aside>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={locale === 'ru' ? 'Фильтры' : 'Filtrlar'}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'var(--alv-bg)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              height: 60,
              background: 'var(--alv-surface)',
              borderBottom: '1px solid var(--alv-line)',
            }}
          >
            <strong>{locale === 'ru' ? 'Фильтры' : 'Filtrlar'}</strong>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {locale === 'ru' ? 'Закрыть' : 'Yopish'}
            </Button>
          </div>
          {/* Ekspertiza: mobil filtr oynasi aylanishi shart */}
          <div style={{ flexGrow: 1, overflowY: 'auto', padding: 16 }}>{body}</div>
          <div
            style={{
              padding: 16,
              background: 'var(--alv-surface)',
              borderTop: '1px solid var(--alv-line)',
            }}
          >
            <Button variant="primary" size="lg" fullWidth onClick={() => setOpen(false)}>
              {locale === 'ru' ? `Показать (${total})` : `Ko‘rsatish (${total})`}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function SortSelect({
  locale,
  value,
  onChange,
}: {
  locale: Locale;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span className="alv-muted" style={{ fontSize: 13 }}>
        {locale === 'ru' ? 'Сортировка' : 'Saralash'}
      </span>
      <select
        className="alv-chip"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ paddingRight: 12 }}
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {locale === 'ru' ? s.ru : s.uz}
          </option>
        ))}
      </select>
    </label>
  );
}

function Check({
  label,
  count,
  on,
  onClick,
}: {
  label: string;
  count?: number;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`alv-check${on ? ' alv-check--on' : ''}`}
      onClick={onClick}
      aria-pressed={on}
    >
      <span className="alv-check__box">{on ? '✓' : ''}</span>
      <span style={{ fontSize: 14, fontWeight: on ? 700 : 500 }}>{label}</span>
      {count !== undefined ? <span className="alv-check__count">{count}</span> : null}
    </button>
  );
}
