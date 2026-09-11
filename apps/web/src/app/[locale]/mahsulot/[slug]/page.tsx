import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Rating } from '@aliver/ui';
import { catalogApi, pick } from '@/lib/catalog-api';
import { ProductBuyBox } from '@/components/ProductBuyBox';
import { ProductTabs } from '@/components/ProductTabs';
import { ProductCardView } from '@/components/ProductCard';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { isLocale } from '@/i18n/messages';

export const revalidate = 120;

async function load(slug: string) {
  try {
    return await catalogApi.product(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await load(slug);
  if (!product) return { title: 'Mahsulot topilmadi' };

  const ru = locale === 'ru';
  const title =
    (ru ? product.seo.titleRu : product.seo.titleUz) ?? (ru ? product.nameRu : product.nameUz);
  const description =
    (ru ? product.seo.descRu : product.seo.descUz) ??
    (ru ? product.shortDescRu : product.shortDescUz) ??
    '';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.images[0]?.url ? [product.images[0]!.url] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const product = await load(slug);
  if (!product) notFound();

  const name = pick(product as never, 'name', locale);
  const ru = locale === 'ru';

  // TZ 82 — mahsulot uchun structured data (SEO). 7-etapda kengaytiriladi.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: (ru ? product.shortDescRu : product.shortDescUz) ?? '',
    sku: product.variants[0]?.sku,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    aggregateRating:
      product.ratingCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAvg.toFixed(1),
            reviewCount: product.ratingCount,
          }
        : undefined,
    offers: product.variants.map((v) => ({
      '@type': 'Offer',
      sku: v.sku,
      price: (BigInt(v.price) / 100n).toString(),
      priceCurrency: 'UZS',
      availability:
        v.availableStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    })),
  };

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="alv-page" style={{ paddingTop: 22 }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <nav className="alv-breadcrumb" aria-label="breadcrumb">
          <Link href={`/${locale}`}>{ru ? 'Главная' : 'Bosh sahifa'}</Link>
          {product.breadcrumb.map((b) => (
            <span key={b.id} style={{ display: 'contents' }}>
              <span>›</span>
              <Link href={`/${locale}/katalog?category=${b.slug}`}>{ru ? b.nameRu : b.nameUz}</Link>
            </span>
          ))}
          <span>›</span>
          <span style={{ color: 'var(--alv-ink)', fontWeight: 600 }}>{name}</span>
        </nav>

        <div
          style={{
            display: 'flex',
            gap: 48,
            alignItems: 'flex-start',
            marginTop: 24,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 420px', minWidth: 280, maxWidth: 560 }}>
            <div
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 26,
                overflow: 'hidden',
                background: 'var(--alv-surface-2)',
                boxShadow: 'var(--alv-shadow-sm)',
              }}
            >
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[0].url}
                  alt={(ru ? product.images[0].altRu : product.images[0].altUz) ?? name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    height: '100%',
                    color: 'var(--alv-muted)',
                    fontSize: 14,
                  }}
                >
                  {ru ? 'Фото добавляется' : 'Rasm qo‘shilmoqda'}
                </div>
              )}
            </div>

            {product.images.length > 1 ? (
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                {product.images.slice(1, 6).map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={img.url}
                    alt={(ru ? img.altRu : img.altUz) ?? name}
                    style={{ width: 78, height: 78, borderRadius: 14, objectFit: 'cover' }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div
            style={{
              flex: '1 1 380px',
              minWidth: 280,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <div>
              {product.brand ? (
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--alv-brand)' }}>
                  {product.brand.name}
                </div>
              ) : null}
              <h1 className="alv-h1" style={{ fontSize: 34, marginTop: 8 }}>
                {name}
              </h1>
              <div style={{ marginTop: 10 }}>
                <Rating value={product.ratingAvg} count={product.ratingCount} size={16} />
              </div>
            </div>

            <ProductBuyBox variants={product.variants} locale={locale} />

            <div className="alv-card" style={{ padding: '4px 20px' }}>
              {[
                [
                  ru ? 'Доставка по Ташкенту — 1 день' : 'Toshkent bo‘ylab — 1 kun',
                  ru ? 'Свыше 400 000 сум бесплатно' : '400 000 so‘mdan yuqori bepul',
                ],
                [
                  ru ? '100% оригинал' : '100% original',
                  ru ? 'Официальный дилер ALIVER Uzbekistan' : 'ALIVER Uzbekistan rasmiy dileri',
                ],
                [
                  ru ? 'Возврат в течение 14 дней' : '14 kun ichida qaytarish',
                  ru ? 'Для неоткрытых товаров' : 'Ochilmagan mahsulot uchun',
                ],
              ].map(([title, sub], i) => (
                <div
                  key={title}
                  style={{
                    padding: '14px 0',
                    borderTop: i > 0 ? '1px solid var(--alv-line)' : 'none',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 56 }}>
          <ProductTabs
            tabs={[
              {
                key: 'desc',
                label: ru ? 'Описание' : 'Tavsif',
                body: ru ? product.descRu : product.descUz,
              },
              {
                key: 'benefits',
                label: ru ? 'Польза' : 'Foydasi',
                body: ru ? product.benefitsRu : product.benefitsUz,
              },
              {
                key: 'ingredients',
                label: ru ? 'Состав' : 'Tarkibi',
                body: ru ? product.ingredientsRu : product.ingredientsUz,
              },
              {
                key: 'how',
                label: ru ? 'Применение' : 'Qanday ishlatiladi',
                body: ru ? product.howToUseRu : product.howToUseUz,
              },
              {
                key: 'warnings',
                label: ru ? 'Предупреждения' : 'Ogohlantirish',
                body: ru ? product.warningsRu : product.warningsUz,
              },
            ]}
          />
        </div>

        {product.related.length > 0 ? (
          <section style={{ marginTop: 56 }}>
            <h2 className="alv-h2" style={{ marginBottom: 18 }}>
              {ru ? 'Похожие товары' : 'O‘xshash mahsulotlar'}
            </h2>
            <div className="alv-grid">
              {product.related.map((p) => (
                <ProductCardView key={p.id} product={p} locale={locale} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
