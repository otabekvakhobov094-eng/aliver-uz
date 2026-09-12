import Link from 'next/link';
import { fmtDateLong } from '@/lib/format-date';
import { catalogApi, pick } from '@/lib/catalog-api';
import { ProductCardView } from '@/components/ProductCard';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { isLocale } from '@/i18n/messages';
import { getShopFacts, sumOf } from '@/lib/shop-facts';
import { BrandStrip } from '@/components/BrandStrip';
import {
  CampaignBanner,
  LIP_CAMPAIGN,
  SUMMER_CAMPAIGN,
  fromBanner,
} from '@/components/CampaignBanner';
import { contentApi } from '@/lib/content-api';
import { HeroCanvas } from '@/components/HeroCanvas';
import { Reveal } from '@aliver/ui';
import styles from './home.module.css';
import hero_ from './hero.module.css';
import blocks from './blocks.module.css';

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
  // Va'dalardagi raqamlar — adminda va savat qoidalarida yashaydi.
  const facts = await getShopFacts();
  const sampleFrom = sumOf(facts.sampleFrom);
  const pointsPerSum = sumOf(facts.loyaltyPointsPerSum);
  const redeemPercent = facts.loyaltyMaxRedeemPercent;

  const [categories, best, fresh, banners, promos, summerItems, lipItems, facets, posts] = await Promise.all([
    catalogApi.categories().catch(() => []),
    catalogApi.products({ collection: 'best-sellers', perPage: 4 }).catch(() => ({ items: [] })),
    catalogApi.products({ sort: 'newest', perPage: 4 }).catch(() => ({ items: [] })),
    contentApi.banners('HERO').catch(() => []),
    // Aksiya bannerlari. Adminda bo'lmasa — kodda tayyor matn bor,
    // ya'ni bo'sh joy hech qachon ko'rinmaydi.
    contentApi.banners('PROMO').catch(() => []),
    // Kampaniya bannerlaridagi suratlar — HAQIQIY katalogdan.
    catalogApi.products({ category: 'soch-parvarishi', perPage: 3, inStock: true }).catch(() => ({ items: [] })),
    catalogApi.products({ category: 'makiyaj', perPage: 3, inStock: true }).catch(() => ({ items: [] })),
    // Sotuvdagi brendlar — fasetlardan, ya'ni haqiqiy katalogdan.
    catalogApi.facets(),
    // Blog bloki uchun. Xato bo'lsa blok shunchaki chizilmaydi.
    contentApi.posts().catch(() => []),
  ]);
  const hero = banners[0];
  // Ikki kampaniya: yozgi moylar va lab bo'yoqlari. Tartib adminda
  // `sortOrder` bilan boshqariladi.
  const summer = fromBanner(promos[0], SUMMER_CAMPAIGN);
  const lips = fromBanner(promos[1], LIP_CAMPAIGN);
  const toCampaign = (items: Awaited<ReturnType<typeof catalogApi.products>>['items']) =>
    items.map((p) => ({
      id: p.id,
      slug: p.slug,
      nameUz: p.nameUz,
      nameRu: p.nameRu,
      imageUrl: p.imageUrl,
    }));
  const title = (locale === 'ru' ? hero?.titleRu : hero?.titleUz) ?? (locale === 'ru' ? 'Красота, которая начинается с заботы' : 'Go‘zallik — g‘amxo‘rlikdan boshlanadi');
  const subtitle = (locale === 'ru' ? hero?.subtitleRu : hero?.subtitleUz) ?? (locale === 'ru' ? 'Оригинальная косметика ALIVER для ежедневных ритуалов красоты. Официально в Узбекистане.' : 'Kundalik go‘zallik marosimingiz uchun original ALIVER kosmetikasi. O‘zbekistonda rasmiy.');

  return <>
    <SiteHeader locale={locale} />
    <main className={styles.main}>
      {/*
        Hero — TO'LIQ kenglikdagi banner.

        Ilgari rasm o'ng tomonda kichik blok bo'lib turardi va matn
        bilan joy talashardi. Go'zallik savdosida bu ishlamaydi:
        mahsulot surati asosiy dalil va u ekranni egallashi kerak,
        matn esa uning ustida turadi.
      */}
      <section className={`${hero_.banner} ${hero?.imageUrl ? '' : hero_.plain}`}>
        {hero?.imageUrl ? (
          <div className={hero_.bannerImage} style={{ backgroundImage: `url(${hero.imageUrl})` }} />
        ) : (
          <>
            {/* Admin banner rasmi bo'lmasa — jonli shader foni. Rasm
                bo'lsa unga tegmaymiz: marketing tanlagan surat
                bezakdan ustun turadi. */}
            <HeroCanvas />
            <span className={hero_.sheen} aria-hidden />
          </>
        )}

        <div className="alv-page">
          <div className={hero_.copy}>
            <p className={hero_.eyebrow}>
              {locale === 'ru' ? 'Официальный магазин ALIVER' : 'ALIVER rasmiy do‘koni'}
            </p>
            <h1 className={hero_.title}>{title}</h1>
            <p className={hero_.lead}>{subtitle}</p>
            <div className={hero_.actions}>
              <Link className={hero_.cta} href={hero?.ctaUrl ?? `/${locale}/katalog`}>
                {(locale === 'ru' ? hero?.ctaLabelRu : hero?.ctaLabelUz) ??
                  (locale === 'ru' ? 'Смотреть каталог' : 'Katalogni ko‘rish')}
                <span aria-hidden>↗</span>
              </Link>
              <Link className={hero_.ghost} href={`/${locale}/tanlagich`}>
                {locale === 'ru' ? 'Подобрать средство' : 'Vosita tanlash'}
                <span aria-hidden>→</span>
              </Link>
            </div>
            <div className={hero_.notes}>
              <span>{locale === 'ru' ? '100% оригинал' : '100% original'}</span>
              <span>{locale === 'ru' ? 'Быстрая доставка' : 'Tezkor yetkazish'}</span>
              <span>{locale === 'ru' ? 'Click • Payme • Uzum' : 'Click • Payme • Uzum'}</span>
            </div>
          </div>
        </div>
      </section>

      <Reveal as="section" className={styles.shell} style={{ marginTop: 54 }}>
        <BrandStrip brands={facets.brands} locale={locale} />
      </Reveal>

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
          // Rasm bo'lsa u fon bo'ladi: bo'sh gradient kartochka
          // kosmetika do'konida eng yomon birinchi taassurot.
          const photo = real ? ((category as { imageUrl?: string | null }).imageUrl ?? null) : null;
          return <Link key={category.slug} href={`/${locale}/katalog?category=${category.slug}`} className={`${styles.categoryCard} ${photo ? styles['categoryCard--photo'] : ''} alv-tilt`} style={photo ? { backgroundImage: `url(${photo})` } : undefined}><span className={styles.categoryNumber}>{String(index + 1).padStart(2, '0')}</span><div><h3>{categoryTitle}</h3><p>{count === null ? (locale === 'ru' ? 'Открыть коллекцию' : 'Kolleksiyani ochish') : `${count} ${locale === 'ru' ? 'товаров' : 'ta mahsulot'}`}</p></div><span className={styles.categoryArrow}>↗</span></Link>;
        })}</div>
      </Reveal>

      <ProductRow title={locale === 'ru' ? 'Выбор покупателей' : 'Xaridorlar tanlovi'} kicker={locale === 'ru' ? 'Бестселлеры' : 'Bestsellerlar'} href={`/${locale}/katalog?collection=best-sellers`} items={best.items} locale={locale} />
      {/*
        Sodiqlik bandi — Sephora ning «Beauty Insider» naqshi.

        Sephora buni bosh sahifaning yuqorisiga qo'yadi va sababi bor:
        ball dasturi mijoz UNI BILGANDAGINA xatti-harakatni
        o'zgartiradi. Bizda dastur ishlaydi, lekin u haqida faqat
        checkout'da bilinardi — ya'ni qaror allaqachon qabul
        qilingandan keyin.
      */}
      <Reveal as="section" className={styles.shell} style={{ marginTop: 90 }}>
        <CampaignBanner copy={summer} locale={locale} products={toCampaign(summerItems.items)} />
      </Reveal>

      <Reveal as="section" className={styles.shell} style={{ marginTop: 90 }}>
        <div className="alv-loyalty-band">
          <div className="alv-loyalty-band__copy">
            <strong>
              {locale === 'ru'
                ? 'Баллы за каждую покупку'
                : 'Har bir xariddan ball'}
            </strong>
            {/*
              RAQAMLAR SERVERDAN. Ilgari «1 000», «yarmigacha» va
              «300 000» matnga yozilgan edi, haqiqiy qoidalar esa
              boshqa joyda yashaydi. Xodim chegarani o'zgartirsa,
              bosh sahifa eski va'dani takrorlashda davom etardi.
            */}
            <p>
              {locale === 'ru'
                ? `Каждые ${pointsPerSum ?? '1 000'} сум — 1 балл.${
                    redeemPercent ? ` Баллами можно оплатить до ${redeemPercent}% следующего заказа.` : ''
                  }${sampleFrom ? ` При заказе от ${sampleFrom} сум пробник в подарок.` : ''}`
                : `Har ${pointsPerSum ?? '1 000'} so‘mga 1 ball.${
                    redeemPercent
                      ? ` Ballar bilan keyingi buyurtmaning ${redeemPercent}% gacha qismini qoplash mumkin.`
                      : ''
                  }${sampleFrom ? ` ${sampleFrom} so‘mdan yuqori buyurtmaga namuna bepul.` : ''}`}
            </p>
          </div>
          <Link className={`${styles.lightAction} alv-lift`} href={`/${locale}/kabinet/ballar`}>
            {locale === 'ru' ? 'Мои баллы' : 'Ballarim'} <span aria-hidden>→</span>
          </Link>
        </div>
      </Reveal>

      {/*
        Sovg'a to'plamlari — aliver.com dagi «Gifts & Sets».

        Bo'lim saytda bor edi, lekin bosh sahifada unga YO'L YO'Q edi:
        mijoz uni faqat URL ni bilgan holda topa olardi.
      */}
      <Reveal as="section" className={styles.shell} style={{ marginTop: 90 }}>
        <div className={blocks.gifts}>
          <div className={blocks.giftsCopy}>
            {/*
              Sahifadagi `eyebrow` rangi (#b84b6b) pushti fonda 3.81:1 —
              AA dan past. Shuning uchun bu yerda tint uchun
              mo'ljallangan token: 4.98:1.
            */}
            <p className={styles.eyebrow} style={{ color: 'var(--alv-brand-on-tint)' }}>
              {locale === 'ru' ? 'Готовые наборы' : 'Tayyor to‘plamlar'}
            </p>
            <h2>
              {locale === 'ru' ? 'Подарок, который не нужно выбирать' : 'Tanlab o‘tirmaydigan sovg‘a'}
            </h2>
            <p>
              {locale === 'ru'
                ? `Собранные наборы для волос, лица и тела — в подарочной упаковке.${
                    sampleFrom ? ` При заказе от ${sampleFrom} сум добавим пробник.` : ''
                  }`
                : `Soch, yuz va tana uchun yig‘ilgan to‘plamlar — sovg‘a qutisida.${
                    sampleFrom ? ` ${sampleFrom} so‘mdan yuqori buyurtmaga namuna qo‘shamiz.` : ''
                  }`}
            </p>
            <Link
              className={`${styles.primaryAction} alv-lift`}
              href={`/${locale}/katalog?collection=sovga-toplamlari`}
              style={{ alignSelf: 'flex-start' }}
            >
              {locale === 'ru' ? 'Смотреть наборы' : 'To‘plamlarni ko‘rish'} <span aria-hidden>↗</span>
            </Link>
          </div>
          <div className={blocks.giftsArt} aria-hidden>
            <span className={blocks.box} />
            <span className={blocks.box} />
            <span className={blocks.box} />
            <span className={blocks.ribbon} />
          </div>
        </div>
      </Reveal>

      {/* Blog — aliver.com da alohida bo'lim, bizda bosh sahifada yo'q edi. */}
      {posts.length > 0 ? (
        <Reveal as="section" className={`${styles.shell} ${styles.section}`}>
          <Heading
            kicker={locale === 'ru' ? 'Журнал' : 'Jurnal'}
            title={locale === 'ru' ? 'Как ухаживать за собой' : 'O‘zingizni qanday parvarishlash'}
            href={`/${locale}/blog`}
            link={locale === 'ru' ? 'Весь блог' : 'Butun blog'}
          />
          <div className={blocks.postGrid}>
            {posts.slice(0, 3).map((post) => (
              <Link key={post.slug} href={`/${locale}/blog/${post.slug}`} className={blocks.post}>
                <div
                  className={blocks.postCover}
                  style={post.coverUrl ? { backgroundImage: `url(${post.coverUrl})` } : undefined}
                />
                <div className={blocks.postBody}>
                  {post.publishedAt ? (
                    <span className={blocks.postDate}>
{fmtDateLong(post.publishedAt, locale === 'ru')}
                    </span>
                  ) : null}
                  <h3>{locale === 'ru' ? post.titleRu : post.titleUz}</h3>
                  {post.excerptUz || post.excerptRu ? (
                    <p>{locale === 'ru' ? post.excerptRu : post.excerptUz}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </Reveal>
      ) : null}

      {/* Hamkorlik — aliver.com dagi «Become Our Distributors». */}
      <Reveal as="section" className={styles.shell} style={{ marginTop: 90 }}>
        <div className={blocks.partner}>
          <div>
            <p className={styles.eyebrow} style={{ color: '#ffd3df' }}>
              {locale === 'ru' ? 'Оптом и в розницу' : 'Ulgurji va chakana'}
            </p>
            <h2>
              {locale === 'ru' ? 'Станьте дистрибьютором ALIVER' : 'ALIVER distribyutori bo‘ling'}
            </h2>
            <p>
              {locale === 'ru'
                ? 'Салонам, магазинам и мастерам — официальные поставки, оптовые цены и поддержка по ассортименту. Заявка занимает минуту.'
                : 'Salon, do‘kon va ustalar uchun — rasmiy ta’minot, ulgurji narxlar va assortiment bo‘yicha qo‘llab-quvvatlash. Ariza bir daqiqa vaqt oladi.'}
            </p>
            <div style={{ marginTop: 26 }}>
              <Link className={`${styles.lightAction} alv-lift`} href={`/${locale}/hamkorlik`}>
                {locale === 'ru' ? 'Оставить заявку' : 'Ariza qoldirish'} <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
          <div className={blocks.partnerFacts}>
            <div className={blocks.fact}>
              <strong>{locale === 'ru' ? 'Официально' : 'Rasmiy'}</strong>
              <span>
                {locale === 'ru' ? 'Прямые поставки с чеком' : 'To‘g‘ridan-to‘g‘ri, chek bilan'}
              </span>
            </div>
            <div className={blocks.fact}>
              <strong>{locale === 'ru' ? 'Вся страна' : 'Butun respublika'}</strong>
              <span>
                {locale === 'ru' ? 'Доставка в любой регион' : 'Har qanday hududga yetkazish'}
              </span>
            </div>
            <div className={blocks.fact}>
              <strong>{locale === 'ru' ? 'Click • Payme • Uzum' : 'Click • Payme • Uzum'}</strong>
              <span>{locale === 'ru' ? 'И оплата по счёту' : 'Va hisob-faktura bo‘yicha'}</span>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal as="section" className={styles.shell} style={{ marginTop: 90 }}>
        <CampaignBanner copy={lips} locale={locale} products={toCampaign(lipItems.items)} />
      </Reveal>

      <Reveal as="section" className={`${styles.shell} ${styles.story}`}><div className={styles.storyArt}><span>ALIVER</span></div><div className={styles.storyCopy}><p className={styles.eyebrow}>{locale === 'ru' ? 'Философия ALIVER' : 'ALIVER falsafasi'}</p><h2>{locale === 'ru' ? 'Уход, созданный для вашей уверенности' : 'O‘zingizga bo‘lgan ishonch uchun yaratilgan parvarish'}</h2><p>{locale === 'ru' ? 'Красота — это ежедневное внимание к себе. Эффективные формулы, приятные текстуры и современный дизайн.' : 'Go‘zallik o‘zingizga har kuni e’tibor berishdan boshlanadi. Samarali formulalar, yoqimli teksturalar va zamonaviy dizayn.'}</p><Link className={styles.textAction} href={`/${locale}/biz-haqimizda`}>{locale === 'ru' ? 'Узнать больше' : 'Batafsil bilish'} <span>→</span></Link></div></Reveal>
      <ProductRow title={locale === 'ru' ? 'Новые открытия' : 'Yangi kashfiyotlar'} kicker={locale === 'ru' ? 'Новинки' : 'Yangi kelganlar'} href={`/${locale}/katalog?sort=newest`} items={fresh.items} locale={locale} />
      <Reveal as="section" className={`${styles.shell} ${styles.newsletter}`}><div><p className={styles.eyebrow}>ALIVER CLUB</p><h2>{locale === 'ru' ? 'Будьте ближе к миру красоты' : 'Go‘zallik olamiga yanada yaqin bo‘ling'}</h2></div><Link className={`${styles.lightAction} alv-lift`} href={`/${locale}/hamkorlik`}>{locale === 'ru' ? 'Присоединиться' : 'Hamjamiyatga qo‘shilish'} <span>→</span></Link></Reveal>
    </main>
    <SiteFooter locale={locale} />
  </>;
}

function Benefit({ icon, title, text }: { icon: string; title: string; text: string }) { return <div className={styles.promise}><span className={styles.promiseIcon}>{icon}</span><div><strong>{title}</strong><p>{text}</p></div></div>; }
function Heading({ kicker, title, href, link }: { kicker: string; title: string; href: string; link: string }) { return <div className={styles.sectionHead}><div><p className={styles.eyebrow}>{kicker}</p><h2>{title}</h2></div><Link className={styles.textAction} href={href}>{link} <span>→</span></Link></div>; }
function ProductRow({ title, kicker, href, items, locale }: { title: string; kicker: string; href: string; items: Awaited<ReturnType<typeof catalogApi.products>>['items']; locale: 'uz' | 'ru' }) { if (!items.length) return null; return <Reveal as="section" className={`${styles.shell} ${styles.section}`}><Heading kicker={kicker} title={title} href={href} link={locale === 'ru' ? 'Смотреть все' : 'Hammasini ko‘rish'} /><div className="alv-grid">{items.map((product, index) => <Reveal key={product.id} delay={(Math.min(index, 4) + 1) as 1 | 2 | 3 | 4 | 5}><ProductCardView product={product} locale={locale} /></Reveal>)}</div></Reveal>; }
