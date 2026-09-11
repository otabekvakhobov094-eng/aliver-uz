import { catalogApi } from '@/lib/catalog-api';
import { ProductCardView } from '@/components/ProductCard';
import { SearchBox } from '@/components/SearchBox';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { isLocale } from '@/i18n/messages';

export const dynamic = 'force-dynamic';

const POPULAR = ['shampun', 'serum', 'krem', 'niqob', 'lab bo‘yog‘i', 'to‘plam'];

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? '';
  const ru = locale === 'ru';

  const data = q ? await catalogApi.products({ q, perPage: 24 }) : null;

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="alv-page" style={{ paddingTop: 28 }}>
        <h1 className="alv-h1">{ru ? 'Поиск' : 'Qidiruv'}</h1>
        <div style={{ marginTop: 18 }}>
          <SearchBox locale={locale} initial={q} />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
          <span className="alv-muted" style={{ fontSize: 13, alignSelf: 'center' }}>
            {ru ? 'Популярное:' : 'Ommabop:'}
          </span>
          {POPULAR.map((p) => (
            <a
              key={p}
              href={`/${locale}/qidiruv?q=${encodeURIComponent(p)}`}
              className="alv-chip"
              style={{ minHeight: 38 }}
            >
              {p}
            </a>
          ))}
        </div>

        <p className="alv-muted" style={{ fontSize: 13, marginTop: 16 }}>
          {ru
            ? 'Можно писать латиницей или кириллицей — «шампунь» и «shampun» дают одинаковый результат.'
            : 'Lotin yoki kirill yozuvida yozishingiz mumkin — «шампун» va «shampun» bir xil natija beradi.'}
        </p>

        {data ? (
          <section style={{ marginTop: 30 }}>
            <h2 className="alv-h2">
              {ru ? `Результаты: ${data.total}` : `Natijalar: ${data.total}`}
            </h2>

            {data.fuzzy ? (
              <p
                style={{
                  background: 'var(--alv-surface-3)',
                  borderRadius: 14,
                  padding: '12px 14px',
                  fontSize: 13,
                  color: '#6A4A2A',
                  marginTop: 12,
                }}
              >
                {ru
                  ? 'Точного совпадения нет — показываем самые близкие товары.'
                  : 'Aniq moslik topilmadi — eng yaqin mahsulotlar ko‘rsatilmoqda.'}
              </p>
            ) : null}

            {data.items.length > 0 ? (
              <div className="alv-grid" style={{ marginTop: 18 }}>
                {data.items.map((p) => (
                  <ProductCardView key={p.id} product={p} locale={locale} />
                ))}
              </div>
            ) : (
              <div className="alv-card alv-empty" style={{ marginTop: 18 }}>
                <h3 className="alv-h3">{ru ? 'Ничего не найдено' : 'Hech narsa topilmadi'}</h3>
                <p className="alv-muted" style={{ margin: 0, maxWidth: 420, lineHeight: 1.6 }}>
                  {ru
                    ? 'Попробуйте сократить запрос или выбрать раздел из списка выше.'
                    : 'So‘rovni qisqartirib ko‘ring yoki yuqoridagi bo‘limlardan birini tanlang.'}
                </p>
              </div>
            )}
          </section>
        ) : null}
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
