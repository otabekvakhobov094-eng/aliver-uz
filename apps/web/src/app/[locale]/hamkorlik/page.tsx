import Link from 'next/link';
import type { Metadata } from 'next';
import { PartnerForm } from '@/components/PartnerForm';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { VideoEmbed } from '@/components/VideoEmbed';
import { isLocale } from '@/i18n/messages';
import styles from './partner.module.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const ru = locale === 'ru';
  return {
    title: ru ? 'Стать партнёром — ALIVER.UZ' : 'Hamkor bo‘ling — ALIVER.UZ',
    description: ru
      ? 'Закупайте продукцию ALIVER оптом и продавайте в своём магазине или салоне красоты.'
      : 'ALIVER mahsulotlarini ulgurji narxda sotib oling va o‘z do‘koningizda yoki go‘zallik salonida soting.',
  };
}

/**
 * ALIVER distribyutorining videosi.
 *
 * Bu O'ZBEKISTONDAGI hamkorning videosi va aynan shu sababdan bu
 * yerda turadi: ulgurji xarid haqida o'ylayotgan odam uchun eng kuchli
 * dalil — xuddi shu ishni qilayotgan boshqa odam.
 *
 * Video 35-soniyadan boshlanadi: undan oldingi qism tanishtiruv
 * zastavkasi.
 */
const DISTRIBUTOR_VIDEO = { id: '4QUSZKlOgLM', start: 35 };

const BENEFITS: Array<{ uz: string; ru: string; noteUz: string; noteRu: string }> = [
  {
    uz: '15–30% chegirma',
    ru: 'Скидка 15–30%',
    noteUz: 'Buyurtma hajmiga qarab. Aniq foiz ariza ko‘rib chiqilgandan keyin aytiladi.',
    noteRu: 'В зависимости от объёма. Точный процент — после рассмотрения заявки.',
  },
  {
    uz: 'Rasmiy hujjatlar',
    ru: 'Официальные документы',
    noteUz: 'Har bir yetkazib berishga shartnoma, hisob-faktura va sertifikat.',
    noteRu: 'На каждую поставку — договор, счёт-фактура и сертификат.',
  },
  {
    uz: 'Reklama materiallari',
    ru: 'Рекламные материалы',
    noteUz: 'Bannerlar, mahsulot suratlari va tavsif matnlari — bepul.',
    noteRu: 'Баннеры, фотографии товаров и описания — бесплатно.',
  },
  {
    uz: 'Yetkazib berish',
    ru: 'Доставка',
    noteUz: 'Toshkent bo‘ylab bepul, viloyatlarga transport kompaniyasi orqali.',
    noteRu: 'По Ташкенту бесплатно, в регионы — транспортной компанией.',
  },
];

export default async function PartnershipPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const ru = locale === 'ru';
  const label = (uz: string, ruText: string) => (ru ? ruText : uz);

  return (
    <>
      <SiteHeader locale={locale} />

      <main className="alv-page" style={{ paddingTop: 36, paddingBottom: 76 }}>
        <nav className="alv-breadcrumb" aria-label="breadcrumb">
          <Link href={`/${locale}`}>{label('Bosh sahifa', 'Главная')}</Link>
          <span>›</span>
          <span style={{ color: 'var(--alv-ink)', fontWeight: 600 }}>
            {label('Hamkor bo‘ling', 'Стать партнёром')}
          </span>
        </nav>

        <section className={styles.intro}>
          <h1 className="alv-h1">
            {label('ALIVER distribyutori bo‘ling', 'Станьте дистрибьютором ALIVER')}
          </h1>
          <p className={styles.lead}>
            {label(
              'O‘z do‘koningiz, go‘zallik saloningiz yoki onlayn savdongizda ALIVER mahsulotlarini soting. Ulgurji narx, rasmiy hujjatlar va tayyor reklama materiallari bilan.',
              'Продавайте продукцию ALIVER в своём магазине, салоне красоты или онлайн. Оптовые цены, официальные документы и готовые рекламные материалы.',
            )}
          </p>
        </section>

        <section className={styles.videoRow}>
          <div className={styles.videoCopy}>
            <p className={styles.eyebrow}>
              {label('Hamkorlar tajribasi', 'Опыт партнёров')}
            </p>
            <h2 className={styles.videoTitle}>
              {label(
                'O‘zbekistondagi distribyutor nima deydi',
                'Что говорит дистрибьютор из Узбекистана',
              )}
            </h2>
            <p className={styles.videoNote}>
              {label(
                'Bir necha daqiqalik video: ish qanday boshlangani, qaysi mahsulotlar yaxshi sotilishi va nimaga e’tibor berish kerakligi haqida.',
                'Несколько минут о том, как начиналась работа, какие товары продаются лучше и на что стоит обратить внимание.',
              )}
            </p>
          </div>

          <div className={styles.videoBox}>
            <VideoEmbed
              youtubeId={DISTRIBUTOR_VIDEO.id}
              start={DISTRIBUTOR_VIDEO.start}
              locale={locale}
              title={label(
                'ALIVER distribyutorlari haqida video',
                'Видео о дистрибьюторах ALIVER',
              )}
            />
          </div>
        </section>

        <section className={styles.benefits}>
          {BENEFITS.map((b) => (
            <div key={b.uz} className={styles.benefit}>
              <strong>{label(b.uz, b.ru)}</strong>
              <p>{label(b.noteUz, b.noteRu)}</p>
            </div>
          ))}
        </section>

        <section className={styles.formBox}>
          <PartnerForm locale={locale} />
        </section>
      </main>

      <SiteFooter locale={locale} />
    </>
  );
}
