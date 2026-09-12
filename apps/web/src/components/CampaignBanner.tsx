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

/** Bannerda ko'rsatiladigan mahsulot. */
export interface CampaignProduct {
  id: string;
  slug: string;
  nameUz: string;
  nameRu: string;
  imageUrl: string | null;
}

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

export function CampaignBanner({
  copy,
  locale,
  products = [],
}: {
  copy: CampaignCopy;
  locale: Locale;
  /** Kampaniyaga tegishli mahsulotlar — suratlari bannerda chiqadi. */
  products?: CampaignProduct[];
}) {
  const offer = pick(locale, copy.offerUz, copy.offerRu);
  const lead = pick(locale, copy.leadUz, copy.leadRu);
  // Surati yo'q mahsulot bannerda bo'sh joy qoldiradi — tashlab ketamiz.
  const shown = products.filter((p) => p.imageUrl);

  return (
    <section className={`${styles.banner} ${styles[copy.tone]}`}>
      {copy.imageUrl ? (
        /*
          Marketing tayyor banner suratini yuklagan bo'lsa — u ustun.
          Dizayner qilgan kompozitsiya avtomatik yig'ilganidan doim
          yaxshiroq.
        */
        <div
          className={styles.photo}
          style={{ backgroundImage: `url(${copy.imageUrl})` }}
          aria-hidden
        />
      ) : (
        <div className={styles.scene} aria-hidden>
          <span className={styles.halo} />
          {shown.length > 0 ? (
            /*
              HAQIQIY mahsulot suratlari — katalogdan.
              
              Ilgari bu yerda mavhum shisha shakllari chizilardi va
              banner «namuna» bo'lib ko'rinardi. Endi kampaniyaga
              tegishli mahsulotlar o'z suratlari bilan turadi: aksiya
              qaysi mahsulotlarga tegishli ekani BIR QARASHDA ko'rinadi.

              Har bir surat shaffof «tokcha» ustida turadi — namunadagi
              akril bloklar kabi. Bu shakl ataylab tanlangan: katalog
              suratlarining bir qismi oq fonli, bir qismi kesilgan
              bo'lishi mumkin, tokcha esa ikkalasini ham joyida
              ko'rsatadi.
            */
            shown.slice(0, 3).map((product, i) => (
              <span key={product.id} className={`${styles.stand} ${styles[`stand${i + 1}`]}`}>
                <img
                  src={product.imageUrl ?? ''}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </span>
            ))
          ) : (
            <>
              <span className={styles.bottle} />
              <span className={styles.bottle} />
              <span className={styles.bottle} />
            </>
          )}
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
  /*
   * CHEGIRMA VA'DASI OLIB TASHLANDI.
   *
   * Bu yerda «3 ta oling — 20% chegirma» yozilgan edi, lekin bunday
   * qoida chegirmalar modulida YO'Q: xaridor uchta moy solib,
   * savatda hech qanday chegirma ko'rmasdi. Bu shunchaki xato emas
   * — bu bajarilmaydigan va'da, va u bannerni adminda o'zgartirish
   * bilan ham o'chmasdi, chunki `fromBanner` bu maydonni
   * ko'chirmaydi.
   *
   * Haqiqiy aksiya «Chegirmalar» bo'limida yaratiladi va savatda
   * o'zi ko'rinadi. Bannerda esa faqat mavzu qoladi.
   */
  ctaUz: 'Moylarni ko‘rish',
  ctaRu: 'Смотреть масла',
  href: '/katalog?category=soch-parvarishi',
};

/** Lab bo'yoqlari aksiyasi. */
export const LIP_CAMPAIGN: CampaignCopy = {
  tone: 'warm',
  eyebrowUz: 'Lab bo‘yoqlari',
  eyebrowRu: 'Тинты для губ',
  titleUz: 'Wine Lip Tint — ipakdek matn',
  titleRu: 'Wine Lip Tint — шелковистая текстура',
  leadUz: 'Ipakdek yumshoq, to‘yingan rang. Kun bo‘yi ushlab turadi.',
  leadRu: 'Шелковистая текстура и насыщенный цвет. Держится весь день.',
  // Foiz yozilmaydi: haqiqiy chegirmani «Chegirmalar» bo'limi beradi.
  ctaUz: 'Tanlash',
  ctaRu: 'Выбрать',
  href: '/katalog?category=makiyaj',
};
