import Link from 'next/link';
import type { Metadata } from 'next';
import { catalogApi } from '@/lib/catalog-api';
import { ProductCardView } from '@/components/ProductCard';
import { CatalogFilters } from '@/components/CatalogFilters';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { isLocale } from '@/i18n/messages';

export const revalidate = 60;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ru' ? 'Каталог' : 'Katalog',
    description:
      locale === 'ru'
        ? 'Оригинальная косметика ALIVER: уход за волосами, лицом, телом и макияж.'
        : 'Original ALIVER kosmetikasi: soch, yuz va tana parvarishi, makiyaj.',
  };
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SP>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const sp = await searchParams;

  const page = Number(one(sp.page) ?? '1') || 1;

  const [categories, data] = await Promise.all([
    catalogApi.categories(),
    catalogApi.products({
      category: one(sp.category),
      collection: one(sp.collection),
      q: one(sp.q),
      tags: one(sp.tags),
      minPrice: one(sp.minPrice),
      maxPrice: one(sp.maxPrice),
      inStock: one(sp.inStock) === 'true',
      onSale: one(sp.onSale) === 'true',
      sort: one(sp.sort) ?? 'popular',
      page,
      perPage: 24,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.perPage));
  const activeCategory = categories.find((c) => c.slug === one(sp.category));

  const buildHref = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const val = one(v);
      if (val) next.set(k, val);
    }
    next.set('page', String(p));
    return `?${next.toString()}`;
  };

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="alv-page" style={{ paddingTop: 24 }}>
        <nav className="alv-breadcrumb" aria-label="breadcrumb">
          <Link href={`/${locale}`}>{locale === 'ru' ? 'Главная' : 'Bosh sahifa'}</Link>
          <span>›</span>
          <span style={{ color: 'var(--alv-ink)', fontWeight: 600 }}>
            {activeCategory
              ? locale === 'ru'
                ? activeCategory.nameRu
                : activeCategory.nameUz
              : locale === 'ru'
                ? 'Каталог'
                : 'Katalog'}
          </span>
        </nav>

        <h1 className="alv-h1" style={{ marginTop: 14 }}>
          {activeCategory
            ? locale === 'ru'
              ? activeCategory.nameRu
              : activeCategory.nameUz
            : locale === 'ru'
              ? 'Каталог'
              : 'Katalog'}
        </h1>
        <p className="alv-muted" style={{ marginTop: 8 }}>
          {data.total} {locale === 'ru' ? 'товаров' : 'ta mahsulot'}
        </p>

        <div className="alv-catalog-layout">
          <CatalogFilters categories={categories} locale={locale} total={data.total} />

          <div style={{ flexGrow: 1, minWidth: 0 }}>
            {data.items.length === 0 ? (
              <div className="alv-card alv-empty">
                <h2 className="alv-h3">
                  {locale === 'ru' ? 'Ничего не найдено' : 'Hech narsa topilmadi'}
                </h2>
                <p className="alv-muted" style={{ maxWidth: 420, margin: 0, lineHeight: 1.6 }}>
                  {locale === 'ru'
                    ? 'Попробуйте убрать часть фильтров или изменить диапазон цены.'
                    : 'Filtrlarning bir qismini olib tashlab yoki narx oralig‘ini o‘zgartirib ko‘ring.'}
                </p>
                <Link href={`/${locale}/katalog`} className="alv-btn alv-btn--outline alv-btn--md">
                  {locale === 'ru' ? 'Сбросить фильтры' : 'Filtrlarni tozalash'}
                </Link>
              </div>
            ) : (
              <>
                <div className="alv-grid alv-grid--3">
                  {data.items.map((p) => (
                    <ProductCardView key={p.id} product={p} locale={locale} />
                  ))}
                </div>

                {totalPages > 1 ? (
                  <nav
                    aria-label={locale === 'ru' ? 'Страницы' : 'Sahifalar'}
                    style={{
                      display: 'flex',
                      gap: 8,
                      justifyContent: 'center',
                      marginTop: 28,
                      flexWrap: 'wrap',
                    }}
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                      .map((p, idx, arr) => (
                        <span key={p} style={{ display: 'contents' }}>
                          {idx > 0 && arr[idx - 1]! < p - 1 ? (
                            <span className="alv-muted">…</span>
                          ) : null}
                          <Link
                            href={buildHref(p)}
                            className={`alv-chip${p === page ? ' alv-chip--on' : ''}`}
                            aria-current={p === page ? 'page' : undefined}
                          >
                            {p}
                          </Link>
                        </span>
                      ))}
                  </nav>
                ) : null}
              </>
            )}
          </div>
        </div>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
