import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { isLocale } from '@/i18n/messages';

/**
 * Biz haqimizda — TZ-3, 3.1.
 *
 * aliver.com dagi shu nomdagi sahifa aslida faqat aloqa formasi va
 * tahrirlanmagan andoza matni edi. Bu yerda brend hikoyasi, kafolat va
 * raqamlar bor.
 *
 * MUHIM: aliver.com o'z sahifalarida uchta bir-biriga zid tashkil
 * etilish tarixini aytadi ("2012, AQSh", "2013, Xitoy", 7 yillik
 * yubiley). Shuning uchun bu yerda sana umuman yozilmagan — noto'g'ri
 * sanani chop etishdan ko'ra yozmagan yaxshi. Rasmiy versiya
 * tasdiqlangach qo'shiladi.
 */

export const metadata = {
  title: 'Biz haqimizda',
  description:
    'ALIVER — tirnoq, soch, teri va pardoz uchun original kosmetika. O‘zbekiston bo‘ylab yetkazib berish.',
};

const PROMISES = [
  {
    titleUz: 'Original mahsulot',
    titleRu: 'Оригинальная продукция',
    bodyUz: 'Barcha mahsulotlar rasmiy kanal orqali keladi. Har bir partiyaning hujjati bor.',
    bodyRu: 'Вся продукция поступает по официальному каналу. На каждую партию есть документы.',
  },
  {
    titleUz: 'Butun mamlakat bo‘ylab',
    titleRu: 'По всей стране',
    bodyUz: 'Toshkentga bir kunda, viloyatlarga 1–4 kunda yetkazamiz.',
    bodyRu: 'В Ташкент за день, в регионы за 1–4 дня.',
  },
  {
    titleUz: 'Olayotganda tekshiring',
    titleRu: 'Проверка при получении',
    bodyUz: 'Kuryer oldida ko‘rib chiqasiz va faqat qabul qilgan mahsulotingiz uchun to‘laysiz.',
    bodyRu: 'Осматриваете при курьере и платите только за принятый товар.',
  },
  {
    titleUz: 'Qulay to‘lov',
    titleRu: 'Удобная оплата',
    bodyUz: 'Click, Payme, Uzum yoki naqd. Karta ma’lumotlari bizda saqlanmaydi.',
    bodyRu: 'Click, Payme, Uzum или наличные. Данные карты у нас не хранятся.',
  },
];

/**
 * SLUG'LAR KATALOGDAGIDEK.
 *
 * Ilgari bu yerda `pardoz`, `soch`, `teri` turgan edi — bunday
 * kategoriya hech qachon bo'lmagan. Ustiga havola `?kategoriya=`
 * deb yozilgandi, katalog esa `?category=` ni o'qiydi. Ya'ni har
 * bir chipka butun katalogni ochardi va xaridor «bu do'konda
 * bo'lim yo'q ekan» deb o'ylardi. 404 ham bermasdi.
 */
const CATEGORIES = [
  { uz: 'Tirnoq', ru: 'Ногти', slug: 'tirnoq' },
  { uz: 'Makiyaj', ru: 'Макияж', slug: 'makiyaj' },
  { uz: 'Soch parvarishi', ru: 'Уход за волосами', slug: 'soch-parvarishi' },
  { uz: 'Yuz parvarishi', ru: 'Уход за лицом', slug: 'yuz-parvarishi' },
  { uz: 'Tana parvarishi', ru: 'Уход за телом', slug: 'tana-parvarishi' },
];

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const ru = locale === 'ru';

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ maxWidth: 900, paddingTop: 42, paddingBottom: 70 }}>
        <h1 className="alv-h1">{ru ? 'О нас' : 'Biz haqimizda'}</h1>

        <div style={{ maxWidth: '64ch', marginTop: 18 }}>
          <p style={{ fontSize: 17.5, lineHeight: 1.75, color: 'var(--alv-ink-2)' }}>
            {ru
              ? 'ALIVER — косметика для ногтей, волос, кожи и макияжа. Мы начинали с простой мысли: качественный уход не должен быть сложным или недоступным.'
              : 'ALIVER — tirnoq, soch, teri va pardoz uchun kosmetika. Biz oddiy fikrdan boshladik: sifatli parvarish murakkab ham, qimmat ham bo‘lmasligi kerak.'}
          </p>
          <p style={{ fontSize: 17.5, lineHeight: 1.75, color: 'var(--alv-ink-2)', marginTop: 16 }}>
            {ru
              ? 'Сегодня ALIVER.UZ — это официальный интернет-магазин бренда в Узбекистане: тот же ассортимент, местная доставка, оплата привычными способами и поддержка на узбекском и русском.'
              : 'Bugun ALIVER.UZ — brendning O‘zbekistondagi rasmiy onlayn do‘koni: o‘sha assortiment, mahalliy yetkazish, odatiy to‘lov usullari va o‘zbek hamda rus tilida qo‘llab-quvvatlash.'}
          </p>
        </div>

        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 22, margin: '0 0 14px' }}>
            {ru ? 'Что мы обещаем' : 'Nimaga kafolat beramiz'}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
            }}
          >
            {PROMISES.map((p) => (
              <div key={p.titleUz} className="alv-card" style={{ padding: 20 }}>
                <strong style={{ fontSize: 16 }}>{ru ? p.titleRu : p.titleUz}</strong>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 14.5,
                    color: 'var(--alv-ink-2)',
                    lineHeight: 1.65,
                  }}
                >
                  {ru ? p.bodyRu : p.bodyUz}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 22, margin: '0 0 14px' }}>
            {ru ? 'Что у нас есть' : 'Nimalarimiz bor'}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/${locale}/katalog?category=${c.slug}`}
                className="alv-card"
                style={{
                  padding: '12px 20px',
                  textDecoration: 'none',
                  color: 'var(--alv-ink)',
                  fontWeight: 600,
                }}
              >
                {ru ? c.ru : c.uz}
              </Link>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 22, margin: '0 0 14px' }}>
            {ru ? 'Сотрудничество' : 'Hamkorlik'}
          </h2>
          <div className="alv-card" style={{ padding: 22 }}>
            <p style={{ margin: '0 0 14px', color: 'var(--alv-ink-2)', lineHeight: 1.7 }}>
              {ru
                ? 'Салонам, магазинам и оптовым покупателям — отдельные условия и цены.'
                : 'Salon, do‘kon va ulgurji xaridorlar uchun alohida shartlar va narxlar.'}
            </p>
            <Link
              href={`/${locale}/hamkorlik`}
              style={{
                display: 'inline-block',
                padding: '11px 24px',
                borderRadius: 999,
                background: 'var(--alv-brand)',
                color: '#fff',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {ru ? 'Условия партнёрства' : 'Hamkorlik shartlari'}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
