import Link from 'next/link';
import type { Banner } from '@/lib/content-api';
import type { Locale } from '@/i18n/messages';
import styles from './CampaignBanner.module.css';

/**
 * Kampaniya banneri — aksiya e'loni.
 *
 * NEGA RASM EMAS, KOMPONENT.
 *
 * Tayyor rasmli banner ikki sababdan yomon:
 *
 *   1. Matn rasm ichida bo'lsa, uni tarjima qilib bo'lmaydi. Bizga esa
 *      har bir banner O'ZBEK va RUS tilida kerak — ya'ni ikki xil rasm
 *      buyurtirish va ikkalasini sinxron saqlash kerak bo'lardi.
 *   2. Rasmdagi matnni na qidiruv tizimi o'qiydi, na ekran o'quvchi.
 *
 * Shuning uchun bu yerda MATN — matn, fon esa alohida. Marketing
 * suratini `imageUrl` ga qo'yadi, yozuvlar esa ikki tilda adminda
 * tahrirlanadi va ustida chiziladi. Surat bo'lmasa ham banner to'liq
 * ko'rinadi: fon gradient bilan chiziladi.
 *
 * `tone` — kampaniyaning kayfiyati. «cool» yozgi salqin (moylar,
 * dengiz), «warm» iliq pushti (lab bo'yoqlari, shirinlik).
 */

export interface CampaignCopy {
  eyebrowUz: string;
  eyebrowRu: string;
  titleUz: string;
  titleRu: string;
  leadUz?: string;
  leadRu?: string;
  /** «BUY 3 GET 20% OFF» kabi katta yozuv. */
  offerUz?: string;
  offerRu?: string;
  ctaUz: string;
  ctaRu: string;
  href: string;
  /** «JUN. 8 — AUG. 8» kabi muddat. */
  dates?: string;
  tone: 'cool' | 'warm';
  imageUrl?: string | null;
}

const pick = (locale: Locale, uz: string | undefined, ru: string | undefined) =>
  (locale === 'ru' ? ru : uz) ?? '';

export function CampaignBanner({ copy, locale }: { copy: CampaignCopy; locale: Locale }) {
  const offer = pick(locale, copy.offerUz, copy.offerRu);
  const lead = pick(locale, copy.leadUz, copy.leadRu);

  return (
    <section className={`${styles.banner} ${styles[copy.tone]}`}>
      {copy.imageUrl ? (
        <div
          className={styles.photo}
          style={{ backgroundImage: `url(${copy.imageUrl})` }}
          aria-hidden
        />
      ) : (
        // Surat yo'q bo'lsa — shishalar siluetidan qurilgan sahna.
        // Bo'sh to'rtburchakdan ko'ra shu yaxshi, va u hech qanday
        // so'rov talab qilmaydi.
        <div className={styles.scene} aria-hidden>
          <span className={styles.bottle} />
          <span className={styles.bottle} />
          <span className={styles.bottle} />
          <span className={styles.halo} />
        </div>
      )}

      <div className={`alv-page ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{pick(locale, copy.eyebrowUz, copy.eyebrowRu)}</p>
          <h2 className={styles.title}>{pick(locale, copy.titleUz, copy.titleRu)}</h2>
          {lead ? <p className={styles.lead}>{lead}</p> : null}
          {offer ? <p className={styles.offer}>{offer}</p> : null}
          <div className={styles.actions}>
            <Link href={`/${locale}${copy.href}`} className={styles.cta}>
              {pick(locale, copy.ctaUz, copy.ctaRu)}
              <span aria-hidden>→</span>
            </Link>
            {copy.dates ? <span className={styles.dates}>{copy.dates}</span> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Admin bannerini kampaniya matniga o'giradi.
 *
 * Adminda banner bo'lsa — u ustun. Bo'lmasa quyidagi sukut matnlari
 * ishlatiladi: sayt hech qachon bo'sh joy ko'rsatmaydi.
 */
export function fromBanner(banner: Banner | undefined, fallback: CampaignCopy): CampaignCopy {
  if (!banner) return fallback;
  return {
    ...fallback,
    titleUz: banner.titleUz ?? fallback.titleUz,
    titleRu: banner.titleRu ?? fallback.titleRu,
    leadUz: banner.subtitleUz ?? fallback.leadUz,
    leadRu: banner.subtitleRu ?? fallback.leadRu,
    ctaUz: banner.ctaLabelUz ?? fallback.ctaUz,
    ctaRu: banner.ctaLabelRu ?? fallback.ctaRu,
    href: banner.ctaUrl ?? fallback.href,
    imageUrl: banner.imageUrl,
  };
}

/** Yozgi moylar aksiyasi. */
export const SUMMER_CAMPAIGN: CampaignCopy = {
  tone: 'cool',
  eyebrowUz: 'Yozgi aksiya',
  eyebrowRu: 'Летняя акция',
  titleUz: 'Yozda soch va teri uchun salqin moylar',
  titleRu: 'Освежающие масла для волос и кожи',
  leadUz: 'Rozmarin, batana, kastor va qovoq urug‘i moylari — issiqda ham yengil.',
  leadRu: 'Розмарин, батана, касторовое и тыквенное масла — лёгкие даже в жару.',
  offerUz: '3 ta oling — 20% chegirma',
  offerRu: 'Купите 3 — скидка 20%',
  ctaUz: 'Moylarni ko‘rish',
  ctaRu: 'Смотреть масла',
  href: '/katalog?category=soch-parvarishi',
};

/** Lab bo'yoqlari aksiyasi. */
export const LIP_CAMPAIGN: CampaignCopy = {
  tone: 'warm',
  eyebrowUz: 'Lab bo‘yoqlari',
  eyebrowRu: 'Тинты для губ',
  titleUz: '25% chegirma — Wine Lip Tint',
  titleRu: 'Скидка 25% — Wine Lip Tint',
  leadUz: 'Ipakdek yumshoq, to‘yingan rang. Kun bo‘yi ushlab turadi.',
  leadRu: 'Шелковистая текстура и насыщенный цвет. Держится весь день.',
  offerUz: '25% chegirma',
  offerRu: 'Скидка 25%',
  ctaUz: 'Tanlash',
  ctaRu: 'Выбрать',
  href: '/katalog?category=makiyaj',
};
