'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@aliver/ui';
import type { CatalogFacets, CategoryNode } from '@/lib/catalog-api';
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
  facets,
}: {
  categories: CategoryNode[];
  locale: Locale;
  total: number;
  facets: CatalogFacets;
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

  const activeCount = [
    'category',
    'brand',
    'tags',
    'color',
    'volume',
    'onSale',
    'inStock',
    'minPrice',
    'maxPrice',
  ].filter((k) => Boolean(params.get(k))).length;

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

      {/*
        Brend filtri. aliverbeauty.eu da ALIVER dan tashqari ELAIMEI,
        SEFUDUN va ONE1X ham sotiladi — ular import qilingan zahoti bu
        guruh O'ZI paydo bo'ladi, chunki ro'yxat bazadagi haqiqiy
        brendlardan quriladi. Bitta brend bo'lsa guruh ko'rinmaydi:
        tanlovi yo'q filtr faqat joy egallaydi.
      */}
      {facets.brands.length > 1 ? (
        <div className="alv-filter-group">
          <div className="alv-filter-group__title">{locale === 'ru' ? 'Бренд' : 'Brend'}</div>
          {facets.brands.map((b) => (
            <Check
              key={b.slug}
              label={b.name}
              count={b.count}
              on={has('brand', b.slug)}
              onClick={() => toggleInList('brand', b.slug)}
            />
          ))}
        </div>
      ) : null}

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

      {facets.colors.length > 0 ? (
        <div className="alv-filter-group">
          <div className="alv-filter-group__title">{locale === 'ru' ? 'Цвет' : 'Rang'}</div>
          <div className="alv-swatches">
            {facets.colors.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`alv-swatch${has('color', c.value) ? ' alv-swatch--on' : ''}`}
                onClick={() => toggleInList('color', c.value)}
                aria-pressed={has('color', c.value)}
                title={`${c.value} (${c.count})`}
              >
                {/*
                  Rang doirasi nom bo'yicha taxmin qilinadi. Taxmin
                  ishlamasa NEYTRAL doira chiqadi va yozuv baribir
                  o'qiladi — noto'g'ri rang ko'rsatishdan ko'ra rangsiz
                  ko'rsatish yaxshiroq.
                */}
                <span className="alv-swatch__dot" style={swatchStyle(c.value)} aria-hidden />
                <span>{c.value}</span>
                <span className="alv-check__count">{c.count}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {facets.sizes.length > 0 ? (
        <div className="alv-filter-group">
          <div className="alv-filter-group__title">{locale === 'ru' ? 'Объём' : 'Hajm'}</div>
          <div className="alv-swatches">
            {facets.sizes.map((v) => (
              <button
                key={v.value}
                type="button"
                className={`alv-chip${has('volume', v.value) ? ' alv-chip--on' : ''}`}
                onClick={() => toggleInList('volume', v.value)}
                aria-pressed={has('volume', v.value)}
              >
                {v.value}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {/*
        Mobil boshqaruv paneli.

        Bu yerda `style={{ display: 'flex' }}` YOZILMAYDI. Ilgari shunday
        edi va inline uslub `.alv-mobile-only { display: none }` ni yengib,
        panel katta ekranda ham chizilardi — katalog flex qatorida ortiqcha
        ustun paydo bo'lib, butun sahifa yon tomonga surilardi.
      */}
      <div className="alv-catalog-bar">
        <Button variant="dark" size="md" onClick={() => setOpen(true)}>
          {locale === 'ru' ? 'Фильтр' : 'Filtr'} {activeCount > 0 ? `(${activeCount})` : ''}
        </Button>
        <SortSelect
          locale={locale}
          value={params.get('sort') ?? 'popular'}
          onChange={(v) => setParam('sort', v)}
        />
      </div>

      <aside className="alv-catalog-side">
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
    <label className="alv-sort">
      <span className="alv-muted" style={{ fontSize: 13 }}>
        {locale === 'ru' ? 'Сортировка' : 'Saralash'}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {locale === 'ru' ? s.ru : s.uz}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Rang NOMIDAN doira rangini taxmin qiladi.
 *
 * Ranglar variant `options` ida erkin matn: «Rose Nude», «03 ESPRESSO»,
 * «Ivory White». CSS `color` qiymati sifatida ular ishlamaydi, shuning
 * uchun tanilgan so'zlar bo'yicha moslik qidiriladi. Topilmasa —
 * neytral doira: noto'g'ri rang ko'rsatish umuman rang ko'rsatmaslikdan
 * yomonroq, chunki mijoz unga ishonadi.
 */
const COLOR_WORDS: Array<[RegExp, string]> = [
  [/\b(oq|white|ivory|белый|молочн)\b/i, '#f5f2ee'],
  [/\b(qora|black|espresso|чёрн|черн)\b/i, '#2a2024'],
  [/\b(qizil|red|ruby|красн)\b/i, '#c8102e'],
  [/\b(pushti|pink|rose|blush|розов)\b/i, '#e8879f'],
  [/\b(nude|beige|bej|бежев)\b/i, '#d9bda2'],
  [/\b(coral|marjon|корал)\b/i, '#f2705a'],
  [/\b(sariq|yellow|gold|oltin|жёлт|желт|золот)\b/i, '#e0a63c'],
  [/\b(yashil|green|mint|зелён|зелен)\b/i, '#4e9a7a'],
  [/\b(kok|ko'k|blue|син|голуб)\b/i, '#3f6fb5'],
  [/\b(binafsha|violet|purple|lilac|фиолет|сирен)\b/i, '#8a5fbf'],
  [/\b(jigarrang|brown|tan|caramel|корич|карамел)\b/i, '#8a5a3b'],
  [/\b(kulrang|grey|gray|сер)\b/i, '#9a9298'],
  [/\b(kumush|silver|серебр)\b/i, '#c3c7cc'],
];

function swatchStyle(name: string): React.CSSProperties {
  for (const [re, color] of COLOR_WORDS) {
    if (re.test(name)) return { background: color };
  }
  return { background: 'var(--alv-line-2)' };
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


/**
 * Grid ustidagi qator: chapda mahsulot soni, o'ngda saralash.
 *
 * aliver.com dagi joylashuv aynan shunday va u to'g'ri: saralash
 * natijaga TEGISHLI, shuning uchun natijaning ustida turadi. Ilgari u
 * chapdagi filtr ustunining tepasida edi va uni odam qidirib topardi.
 */
export function CatalogToolbar({ locale, total }: { locale: Locale; total: number }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <div className="alv-catalog-toolbar">
      <span className="alv-muted" style={{ fontSize: 14 }}>
        {total} {locale === 'ru' ? 'товаров' : 'ta mahsulot'}
      </span>
      <SortSelect
        locale={locale}
        value={params.get('sort') ?? 'popular'}
        onChange={(v) => {
          const next = new URLSearchParams(params.toString());
          if (v) next.set('sort', v);
          else next.delete('sort');
          next.delete('page');
          router.push(`?${next.toString()}`, { scroll: false });
        }}
      />
    </div>
  );
}
