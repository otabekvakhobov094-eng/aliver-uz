import Link from 'next/link';
import { catalogApi, pick } from '@/lib/catalog-api';
import { ProductCardView } from '@/components/ProductCard';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { isLocale } from '@/i18n/messages';
import { contentApi } from '@/lib/content-api';
import { HeroCanvas } from '@/components/HeroCanvas';
import { HeroVisual } from '@/components/HeroVisual';
import { Reveal } from '@aliver/ui';
import styles from './home.module.css';

export const revalidate = 120;

const FALLBACK = [
  { slug: 'yuz-parvarishi', uz: 'Yuz parvarishi', ru: 'Уход за лицом' },
  { slug: 'makiyaj', uz: 'Makiyaj', ru: 'Макияж' },
  { slug: 'soch-parvarishi', uz: 'Soch parvarishi', ru: 'Уход за волосами' },
  { slug: 'tana-parvarishi', uz: 'Tana parvarishi', ru: 'Уход за телом' },
];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const [categories, best, fresh, banners] = await Promise.all([
    catalogApi.categories().catch(() => []),
    catalogApi.products({ collection: 'best-sellers', perPage: 4 }).catch(() => ({ items: [] })),
    catalogApi.products({ sort: 'newest', perPage: 4 }).catch(() => ({ items: [] })),
    contentApi.banners('HERO').catch(() => []),
  ]);
  const hero = banners[0];
  const title = (locale === 'ru' ? hero?.titleRu : hero?.titleUz) ?? (locale === 'ru' ? 'Красота, которая начинается с заботы' : 'Go‘zallik — g‘amxo‘rlikdan boshlanadi');
  const subtitle = (locale === 'ru' ? hero?.subtitleRu : hero?.subtitleUz) ?? (locale === 'ru' ? 'Оригинальная косметика ALIVER для ежедневных ритуалов красоты. Официально в Узбекистане.' : 'Kundalik go‘zallik marosimingiz uchun original ALIVER kosmetikasi. O‘zbekistonda rasmiy.');

  return <>
    <SiteHeader locale={locale} />
    <main className={styles.main}>
      <section className={`${styles.hero} ${hero?.imageUrl ? '' : 'alv-hero-fallback'}`}>
        {hero?.imageUrl ? (
          <div className={styles.heroImage} style={{ backgroundImage: `url(${hero.imageUrl})` }} />
        ) : (
          /*
           * Admin banner rasmi bo'lmasa — jonli shader foni.
           * Rasm bo'lsa unga tegmaymiz: marketing tanlagan surat
           * bezakdan ustun turadi.
           */
          <HeroCanvas />
        )}
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{locale === 'ru' ? 'Официальный магазин ALIVER' : 'ALIVER rasmiy do‘koni'}</p>
            <h1>{title}</h1><p className={styles.lead}>{subtitle}</p>
            <div className={styles.actions}>
              <Link className={`${styles.primaryAction} alv-lift`} href={hero?.ctaUrl ?? `/${locale}/katalog`}>{(locale === 'ru' ? hero?.ctaLabelRu : hero?.ctaLabelUz) ?? (locale === 'ru' ? 'Смотреть каталог' : 'Katalogni ko‘rish')} <span>↗</span></Link>
              <Link className={styles.textAction} href={`/${locale}/katalog?collection=best-sellers`}>{locale === 'ru' ? 'Бестселлеры' : 'Bestsellerlar'} <span>→</span></Link>
            </div>
            <div className={styles.heroNotes}><span>{locale === 'ru' ? '100% оригинал' : '100% original'}</span><span>{locale === 'ru' ? 'Быстрая доставка' : 'Tezkor yetkazish'}</span><span>{locale === 'ru' ? 'Удобная оплата' : 'Qulay to‘lov'}</span></div>
          </div>
          {/*
            Admin panelda banner surati bo'lsa — u fon bo'lib to'liq
            ekranni egallaydi va bu yerda hech narsa chizilmaydi.
            Aks holda standart ALIVER mahsulot surati ko'rsatiladi.
          */}
          {!hero?.imageUrl ? <HeroVisual /> : null}
        </div>
      </section>

      <Reveal as="section" className={`${styles.shell} ${styles.promises}`}>
        <Benefit icon="✦" title={locale === 'ru' ? 'Только оригинал' : 'Faqat original'} text={locale === 'ru' ? 'Прямые официальные поставки' : 'Rasmiy va to‘g‘ridan-to‘g‘ri ta’minot'} />
        <Benefit icon="◇" title={locale === 'ru' ? 'Доставка по стране' : 'Respublika bo‘ylab'} text={locale === 'ru' ? 'Бережно и в срок' : 'Ehtiyotkor va o‘z vaqtida'} />
        <Benefit icon="○" title={locale === 'ru' ? 'Помощь в выборе' : 'Tanlashda yordam'} text={locale === 'ru' ? 'Консультация по продуктам' : 'Mahsulot bo‘yicha maslahat'} />
      </Reveal>

      <Reveal as="section" className={`${styles.shell} ${styles.section}`}>
        <Heading kicker={locale === 'ru' ? 'Найдите своё' : 'O‘zingiznikini toping'} title={locale === 'ru' ? 'Красота в каждой детали' : 'Har bir detalda go‘zallik'} href={`/${locale}/kategoriyalar`} link={locale === 'ru' ? 'Все категории' : 'Barcha kategoriyalar'} />
        <div className={styles.categoryGrid}>{(categories.length ? categories.slice(0, 4) : FALLBACK).map((category, index) => {
          const real = 'id' in category;
          const categoryTitle = real ? pick(category as never, 'name', locale) : category[locale];
          const count = real ? category.productCount ?? 0 : null;
          return <Link key={category.slug} href={`/${locale}/katalog?category=${category.slug}`} className={`${styles.categoryCard} alv-tilt`}><span className={styles.categoryNumber}>{String(index + 1).padStart(2, '0')}</span><div><h3>{categoryTitle}</h3><p>{count === null ? (locale === 'ru' ? 'Открыть коллекцию' : 'Kolleksiyani ochish') : `${count} ${locale === 'ru' ? 'товаров' : 'ta mahsulot'}`}</p></div><span className={styles.categoryArrow}>↗</span></Link>;
        })}</div>
      </Reveal>

      <ProductRow title={locale === 'ru' ? 'Выбор покупателей' : 'Xaridorlar tanlovi'} kicker={locale === 'ru' ? 'Бестселлеры' : 'Bestsellerlar'} href={`/${locale}/katalog?collection=best-sellers`} items={best.items} locale={locale} />
      <Reveal as="section" className={`${styles.shell} ${styles.story}`}><div className={styles.storyArt}><span>ALIVER</span></div><div className={styles.storyCopy}><p className={styles.eyebrow}>{locale === 'ru' ? 'Философия ALIVER' : 'ALIVER falsafasi'}</p><h2>{locale === 'ru' ? 'Уход, созданный для вашей уверенности' : 'O‘zingizga bo‘lgan ishonch uchun yaratilgan parvarish'}</h2><p>{locale === 'ru' ? 'Красота — это ежедневное внимание к себе. Эффективные формулы, приятные текстуры и современный дизайн.' : 'Go‘zallik o‘zingizga har kuni e’tibor berishdan boshlanadi. Samarali formulalar, yoqimli teksturalar va zamonaviy dizayn.'}</p><Link className={styles.textAction} href={`/${locale}/sahifa/biz-haqimiz`}>{locale === 'ru' ? 'Узнать больше' : 'Batafsil bilish'} <span>→</span></Link></div></Reveal>
      <ProductRow title={locale === 'ru' ? 'Новые открытия' : 'Yangi kashfiyotlar'} kicker={locale === 'ru' ? 'Новинки' : 'Yangi kelganlar'} href={`/${locale}/katalog?sort=newest`} items={fresh.items} locale={locale} />
      <Reveal as="section" className={`${styles.shell} ${styles.newsletter}`}><div><p className={styles.eyebrow}>ALIVER CLUB</p><h2>{locale === 'ru' ? 'Будьте ближе к миру красоты' : 'Go‘zallik olamiga yanada yaqin bo‘ling'}</h2></div><Link className={`${styles.lightAction} alv-lift`} href={`/${locale}/hamkorlik`}>{locale === 'ru' ? 'Присоединиться' : 'Hamjamiyatga qo‘shilish'} <span>→</span></Link></Reveal>
    </main>
    <SiteFooter locale={locale} />
  </>;
}

function Benefit({ icon, title, text }: { icon: string; title: string; text: string }) { return <div className={styles.promise}><span className={styles.promiseIcon}>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></div>; }
function Heading({ kicker, title, href, link }: { kicker: string; title: string; href: string; link: string }) { return <div className={styles.sectionHead}><div><p className={styles.eyebrow}>{kicker}</p><h2>{title}</h2></div><Link className={styles.textAction} href={href}>{link} <span>→</span></Link></div>; }
function ProductRow({ title, kicker, href, items, locale }: { title: string; kicker: string; href: string; items: Awaited<ReturnType<typeof catalogApi.products>>['items']; locale: 'uz' | 'ru' }) { if (!items.length) return null; return <Reveal as="section" className={`${styles.shell} ${styles.section}`}><Heading kicker={kicker} title={title} href={href} link={locale === 'ru' ? 'Смотреть все' : 'Hammasini ko‘rish'} /><div className="alv-grid">{items.map((product, index) => <Reveal key={product.id} delay={(Math.min(index, 4) + 1) as 1 | 2 | 3 | 4 | 5}><ProductCardView product={product} locale={locale} /></Reveal>)}</div></Reveal>; }
