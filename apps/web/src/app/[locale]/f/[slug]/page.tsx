import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { catalogApi } from '@/lib/catalog-api';
import { LANDING_PAGES, findLanding } from '@/lib/landing-pages';
import { ProductCardView } from '@/components/ProductCard';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { isLocale } from '@/i18n/messages';

/**
 * Filtr uchun SEO sahifasi — TZ-3.
 *
 * Katalogdagi `?category=…&tags=…` so'rovi qidiruv tizimi uchun yomon:
 * u indekslanmaydi, havola qilinmaydi va sarlavhasi «Katalog» bo'lib
 * qoladi. Bu sahifa esa aniq bitta so'rovga javob beradi, o'z matni va
 * o'z meta teglariga ega.
 *
 * Sahifalar ro'yxati QO'LDA tuzilgan — sababi `landing-pages.ts` da.
 */

export const revalidate = 300;

export function generateStaticParams() {
  return ['uz', 'ru'].flatMap((locale) =>
    LANDING_PAGES.map((p) => ({ locale, slug: p.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const page = findLanding(slug);
  if (!page) return { title: locale === 'ru' ? 'Страница не найдена' : 'Sahifa topilmadi' };

  const ru = locale === 'ru';
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aliver.uz';

  return {
    title: ru ? page.titleRu : page.titleUz,
    description: ru ? page.introRu : page.introUz,
    alternates: {
      canonical: `${base}/${locale}/f/${page.slug}`,
      // Ikki tilli sayt uchun majburiy: busiz Google ikkala versiyani
      // bir-birining nusxasi deb hisoblashi mumkin.
      languages: {
        uz: `${base}/uz/f/${page.slug}`,
        ru: `${base}/ru/f/${page.slug}`,
      },
    },
    openGraph: {
      title: ru ? page.titleRu : page.titleUz,
      description: ru ? page.introRu : page.introUz,
      url: `${base}/${locale}/f/${page.slug}`,
      type: 'website',
    },
  };
}

export default async function LandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const ru = locale === 'ru';
  const page = findLanding(slug);
  if (!page) notFound();

  const sp = await searchParams;
  const pageNum = Number(Array.isArray(sp.page) ? sp.page[0] : (sp.page ?? '1')) || 1;

  // Katalog bilan bir xil himoya: API yiqilsa sahifa oq ekran bermaydi.
  const data = await catalogApi
    .products({ ...page.filters, page: pageNum, perPage: 24 })
    .catch(() => null);

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ paddingBlock: 28 }}>
        <nav aria-label="breadcrumb" style={{ fontSize: 13.5, marginBottom: 14 }}>
          <Link href={`/${locale}`} style={{ color: 'var(--alv-muted)' }}>
            {ru ? 'Главная' : 'Bosh sahifa'}
          </Link>
          <span style={{ color: 'var(--alv-muted)', margin: '0 8px' }}>›</span>
          <Link href={`/${locale}/katalog`} style={{ color: 'var(--alv-muted)' }}>
            {ru ? 'Каталог' : 'Katalog'}
          </Link>
          <span style={{ color: 'var(--alv-muted)', margin: '0 8px' }}>›</span>
          <span>{ru ? page.headingRu : page.headingUz}</span>
        </nav>

        <h1
          style={{
            fontFamily: 'var(--alv-font-display)',
            fontWeight: 400,
            fontSize: 'clamp(26px, 5vw, 38px)',
            letterSpacing: '-0.02em',
            margin: '0 0 12px',
            textWrap: 'balance',
          }}
        >
          {ru ? page.headingRu : page.headingUz}
        </h1>

        <p
          style={{
            margin: '0 0 26px',
            maxWidth: '62ch',
            color: 'var(--alv-ink-2)',
            lineHeight: 1.7,
            fontSize: 15.5,
          }}
        >
          {ru ? page.introRu : page.introUz}
        </p>

        {!data ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--alv-muted)', marginBottom: 20 }}>
              {ru ? 'Товары не загрузились.' : 'Mahsulotlar yuklanmadi.'}
            </p>
            <Link href={`/${locale}/katalog`} className="alv-btn alv-btn--primary alv-btn--md">
              {ru ? 'Открыть каталог' : 'Katalogni ochish'}
            </Link>
          </div>
        ) : data.items.length === 0 ? (
          <div style={{ padding: '40px 0' }}>
            <p style={{ color: 'var(--alv-ink-2)', marginBottom: 18 }}>
              {ru
                ? 'Сейчас в этой подборке нет товаров в наличии.'
                : 'Hozir bu to‘plamda sotuvdagi mahsulot yo‘q.'}
            </p>
            <Link href={`/${locale}/katalog`} className="alv-btn alv-btn--outline alv-btn--md">
              {ru ? 'Весь каталог' : 'Butun katalog'}
            </Link>
          </div>
        ) : (
          <>
            <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--alv-muted)' }}>
              {data.total} {ru ? 'товаров' : 'ta mahsulot'}
            </p>
            <div className="alv-grid-cards">
              {data.items.map((p) => (
                <ProductCardView key={p.id} product={p} locale={locale} />
              ))}
            </div>
          </>
        )}

        {/* Ichki havolalar: qidiruv tizimi sahifalarni shu orqali
            topadi va ular bir-biriga vazn uzatadi. */}
        <section style={{ marginTop: 48, paddingTop: 26, borderTop: '1px solid var(--alv-line)' }}>
          <h2 style={{ fontSize: 17, margin: '0 0 14px' }}>
            {ru ? 'Смотрите также' : 'Yana qarang'}
          </h2>
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {LANDING_PAGES.filter((p) => p.slug !== page.slug).map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/${locale}/f/${p.slug}`}
                  style={{
                    display: 'inline-block',
                    padding: '8px 14px',
                    borderRadius: 999,
                    border: '1px solid var(--alv-line-2)',
                    fontSize: 13.5,
                    color: 'var(--alv-ink)',
                  }}
                >
                  {ru ? p.headingRu : p.headingUz}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
