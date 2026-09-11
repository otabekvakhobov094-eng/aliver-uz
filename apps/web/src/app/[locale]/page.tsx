import Link from 'next/link';
import { Button } from '@aliver/ui';
import { catalogApi, pick } from '@/lib/catalog-api';
import { ProductCardView } from '@/components/ProductCard';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { isLocale } from '@/i18n/messages';
import { contentApi } from '@/lib/content-api';

export const revalidate = 120;

/**
 * Bosh sahifa — prototipdagi "Bosh sahifa" maketi.
 * 2-etapda katalog bloklari real ma'lumot bilan ishlaydi; hero slayder va
 * banner boshqaruvi 7-etapda (kontent moduli) admin panelga chiqadi.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';

  const [categories, best, fresh, banners] = await Promise.all([
    catalogApi.categories(),
    catalogApi.products({ collection: 'best-sellers', perPage: 4 }),
    catalogApi.products({ sort: 'newest', perPage: 4 }),
    contentApi.banners('HERO').catch(() => []),
  ]);
  const hero = banners[0];

  return (
    <>
      <SiteHeader locale={locale} />

      <main>
        <section
          style={{
            background: hero?.imageUrl ? `linear-gradient(90deg,rgba(255,255,255,.94),rgba(255,255,255,.3)),url(${hero.imageUrl}) center/cover` : 'linear-gradient(110deg,#FFE6F0 0%,#FFF4E4 100%)',
            padding: '56px 0 60px',
          }}
        >
          <div className="alv-page" style={{ maxWidth: 720 }}>
            <span className="alv-badge alv-badge--sale">
              {locale === 'ru' ? 'Официальный дилер' : 'Rasmiy diler'}
            </span>
            <h1 className="alv-h1" style={{ fontSize: 52, marginTop: 14 }}>
              {(locale === 'ru' ? hero?.titleRu : hero?.titleUz) ?? (locale === 'ru' ? 'Оригинальная косметика ALIVER' : 'Original ALIVER kosmetikasi')}
            </h1>
            <p style={{ color: 'var(--alv-ink-2)', fontSize: 17, lineHeight: 1.6, marginTop: 14 }}>
              {(locale === 'ru' ? hero?.subtitleRu : hero?.subtitleUz) ?? (locale === 'ru'
                ? 'Доставка по всему Узбекистану, оплата Click, Payme или наличными при получении.'
                : 'O‘zbekiston bo‘ylab yetkazib berish, Click, Payme yoki qabul qilganda naqd to‘lov.')}
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              <Link href={hero?.ctaUrl ?? `/${locale}/katalog`}>
                <Button variant="primary" size="lg">
                  {(locale === 'ru' ? hero?.ctaLabelRu : hero?.ctaLabelUz) ?? (locale === 'ru' ? 'Перейти в каталог' : 'Katalogga o‘tish')}
                </Button>
              </Link>
              <Link href={`/${locale}/katalog?onSale=true`}>
                <Button variant="outline" size="lg">
                  {locale === 'ru' ? 'Акции' : 'Aksiyalar'}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="alv-page" style={{ marginTop: 56 }}>
          <h2 className="alv-h2">{locale === 'ru' ? 'Категории' : 'Kategoriyalar'}</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 14,
              marginTop: 18,
            }}
          >
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/${locale}/katalog?category=${c.slug}`}
                className="alv-card"
                style={{ padding: 16, color: 'var(--alv-ink)' }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {pick(c as never, 'name', locale)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--alv-muted)', marginTop: 4 }}>
                  {c.productCount ?? 0} {locale === 'ru' ? 'товаров' : 'ta mahsulot'}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <ProductRow
          title={locale === 'ru' ? 'Хиты продаж' : 'Eng ko‘p sotilganlar'}
          href={`/${locale}/katalog?collection=best-sellers`}
          items={best.items}
          locale={locale}
        />

        <ProductRow
          title={locale === 'ru' ? 'Новинки' : 'Yangi kelganlar'}
          href={`/${locale}/katalog?sort=newest`}
          items={fresh.items}
          locale={locale}
        />
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}

function ProductRow({
  title,
  href,
  items,
  locale,
}: {
  title: string;
  href: string;
  items: Awaited<ReturnType<typeof catalogApi.products>>['items'];
  locale: 'uz' | 'ru';
}) {
  if (items.length === 0) return null;
  return (
    <section className="alv-page" style={{ marginTop: 56 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 18,
        }}
      >
        <h2 className="alv-h2">{title}</h2>
        <Link href={href} style={{ fontWeight: 700, fontSize: 14 }}>
          {locale === 'ru' ? 'Все →' : 'Hammasi →'}
        </Link>
      </div>
      <div className="alv-grid">
        {items.map((p) => (
          <ProductCardView key={p.id} product={p} locale={locale} />
        ))}
      </div>
    </section>
  );
}
