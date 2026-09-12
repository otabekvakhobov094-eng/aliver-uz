import type { Metadata } from 'next';
import Link from 'next/link';
import { catalogApi, pick } from '@/lib/catalog-api';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { isLocale } from '@/i18n/messages';

export const revalidate = 300;

/*
 * SARLAVHASIZ sahifa brauzer yorlig'ida ham, qidiruv natijasida ham
 * shunchaki «ALIVER.UZ» bo'lib chiqadi — ya'ni boshqa har qanday
 * sahifadan farq qilmaydi. Xatcho'plar ham shunday saqlanadi.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const ru = (isLocale(raw) ? raw : 'uz') === 'ru';
  return {
    title: ru ? 'Весь каталог' : 'Butun katalog',
    description: ru
      ? 'Все разделы и подразделы каталога ALIVER.'
      : 'ALIVER katalogining barcha bo‘limlari va ichki bo‘limlari.',
  };
}

/** Kategoriyalar sahifasi — prototipdagi "Kategoriyalar" maketi. Maksimal 3 daraja. */
export default async function CategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const tree = await catalogApi.categories().catch(() => []);
  const ru = locale === 'ru';

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="alv-page" style={{ paddingTop: 28 }}>
        <h1 className="alv-h1">{ru ? 'Весь каталог' : 'Butun katalog'}</h1>
        <p className="alv-muted" style={{ marginTop: 10 }}>
          {ru
            ? 'Разделы и подразделы. Максимум три уровня — так остаются понятными URL, навигация и SEO.'
            : 'Bo‘limlar va ichki bo‘limlar. Maksimal uch daraja — shunda URL, navigatsiya va SEO tushunarli qoladi.'}
        </p>

        {tree.length === 0 ? <div className="alv-empty alv-card" style={{ marginTop: 26 }}><p>{ru ? 'Категории появятся после обновления каталога.' : 'Kategoriyalar katalog yangilangach ko‘rinadi.'}</p></div> : <div className="alv-grid alv-grid--3" style={{ marginTop: 26 }}>
          {tree.map((c) => (
            <div key={c.id} className="alv-card" style={{ padding: 22 }}>
              <Link
                href={`/${locale}/katalog?category=${c.slug}`}
                style={{ color: 'var(--alv-ink)' }}
              >
                <h2 className="alv-h3">{pick(c as never, 'name', locale)}</h2>
              </Link>
              <div className="alv-muted" style={{ fontSize: 13, marginTop: 4 }}>
                {c.productCount ?? 0} {ru ? 'товаров' : 'ta mahsulot'}
              </div>

              {c.children.length > 0 ? (
                <div style={{ height: 1, background: 'var(--alv-line)', margin: '14px 0' }} />
              ) : null}

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {c.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/${locale}/katalog?category=${child.slug}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      minHeight: 44,
                      color: 'var(--alv-ink)',
                      fontSize: 14,
                    }}
                  >
                    <span>{pick(child as never, 'name', locale)}</span>
                    <span className="alv-muted" style={{ fontSize: 12 }}>
                      {child.productCount ?? 0}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>}
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
