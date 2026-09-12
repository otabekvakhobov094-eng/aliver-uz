import Link from 'next/link';
import type { Metadata } from 'next';
import { catalogApi } from '@/lib/catalog-api';
import { ApiAsleepError } from '@/lib/server-get';
import { ProductCardView } from '@/components/ProductCard';
import { CatalogFilters, CatalogToolbar } from '@/components/CatalogFilters';
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

  /*
   * API xatosi sahifani YIQITMAYDI.
   *
   * Ilgari bu chaqiruvlar istisno tashlardi va mijoz Next.js ning
   * yalang'och "Application error" ekranini ko'rardi — sarlavhasiz,
   * footersiz, qaytish yo'lisiz. Noto'g'ri `?sort=` qiymati ham shu
   * holatga olib borardi.
   *
   * Endi xato tushunarli xabarga aylanadi va sayt ochiq qoladi.
   */
  const [categories, facets, result] = await Promise.all([
    catalogApi.categories().catch(() => []),
    catalogApi.facets({ category: one(sp.category), collection: one(sp.collection) }),
    catalogApi.products({
      category: one(sp.category),
      collection: one(sp.collection),
      brand: one(sp.brand),
      q: one(sp.q),
      tags: one(sp.tags),
      minPrice: one(sp.minPrice),
      maxPrice: one(sp.maxPrice),
      inStock: one(sp.inStock) === 'true',
      onSale: one(sp.onSale) === 'true',
      sort: one(sp.sort) ?? 'popular',
      page,
      perPage: 24,
    })
      .then((r) => ({ ok: true as const, data: r }))
      .catch((e: unknown) => ({ ok: false as const, asleep: e instanceof ApiAsleepError })),
  ]);

  const data = result.ok ? result.data : null;
  const asleep = !result.ok && result.asleep;

  if (!data) {
    return (
      <>
        <SiteHeader locale={locale} />
        <main className="alv-page" style={{ padding: '64px 0', textAlign: 'center' }}>
          {/*
            IKKI XIL HOLAT, ikki xil xabar.

            Ilgari ikkalasiga bitta matn chiqardi va u mijozni
            adashtirardi: server uxlab qolgan paytda «filtr noto'g'ri»
            deb turardi, filtrda esa hech qanday ayb yo'q edi.
          */}
          <h1 className="alv-h2" style={{ marginBottom: 10 }}>
            {asleep
              ? locale === 'ru'
                ? 'Сервер просыпается'
                : 'Server uyg‘onmoqda'
              : locale === 'ru'
                ? 'Каталог не загрузился'
                : 'Katalog yuklanmadi'}
          </h1>
          <p style={{ color: 'var(--alv-muted)', marginBottom: 22 }}>
            {asleep
              ? locale === 'ru'
                ? 'Это занимает до минуты. Обновите страницу через несколько секунд.'
                : 'Bu bir daqiqagacha ketishi mumkin. Bir necha soniyadan so‘ng sahifani yangilang.'
              : locale === 'ru'
                ? 'Не удалось связаться с сервером или фильтр указан неверно.'
                : 'Server bilan bog‘lanib bo‘lmadi yoki filtr noto‘g‘ri ko‘rsatilgan.'}
          </p>
          <Link
            href={asleep ? `/${locale}/katalog?t=${Date.now()}` : `/${locale}/katalog`}
            className="alv-btn alv-btn--primary alv-btn--md"
          >
            {asleep
              ? locale === 'ru'
                ? 'Обновить'
                : 'Yangilash'
              : locale === 'ru'
                ? 'Сбросить фильтры'
                : 'Filtrlarni tozalash'}
          </Link>
        </main>
        <SiteFooter locale={locale} />
      </>
    );
  }

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
        <div className="alv-catalog-layout">
          <CatalogFilters
            categories={categories}
            locale={locale}
            total={data.total}
            facets={facets}
          />

          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <CatalogToolbar locale={locale} total={data.total} />

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
