import type { Locale } from '@/i18n/messages';
import styles from './PaymentBadges.module.css';

/**
 * Footerdagi to'lov va yetkazib berish logotiplari.
 *
 * Fayllar `public/logos/` da: foni olib tashlangan, chetlari kesilgan
 * shaffof PNG lar.
 *
 * UCHTA QARORNI IZOHLASH KERAK.
 *
 * 1. Logotiplar OQ plitka ustida turadi. Footer to'q rangda, Click va
 *    Payme yozuvlari esa qora — to'q fonda ular deyarli ko'rinmasdi.
 *    Har bir brendning o'z rangini saqlashning yagona to'g'ri yo'li —
 *    ularga och fon berish.
 *
 * 2. Plitkalar BIR XIL balandlikda va bir chiziqda. Ilgari elementlar
 *    har xil balandlikda bo'lib, qator «sakrab» turardi.
 *
 * 3. Logotip balandligi HAR BIRI UCHUN alohida hisoblangan. Hammasini
 *    bir xil pikselga qo'ysa, natija teng ko'rinmaydi: EMU tik
 *    (vertikal) lokap, Payme esa juda keng. Ko'z balandlikni emas,
 *    EGALLANGAN MAYDONNI taqqoslaydi.
 *
 *    Shuning uchun balandlik ko'z bilan emas, formula bilan olingan:
 *    maydon teng bo'lishi uchun  h = sqrt(A / nisbat),  bu yerda
 *    nisbat = kenglik/balandlik, A esa hamma uchun bir xil (1100 px²).
 *
 *      click  2.46 → 21px      emu   0.88 → 35px
 *      payme  3.43 → 18px      bts   2.52 → 21px
 *      uzum   2.71 → 20px
 *
 *    Yangi logotip qo'shilganda shu formuladan foydalaning, aks holda
 *    qator yana notekis ko'rinadi.
 */

interface Logo {
  slug: string;
  name: string;
  /** Rasmning haqiqiy nisbati (kenglik / balandlik). */
  ratio: number;
  /** Brend talab qiladigan fon. Berilmasa — oq. */
  bg?: string;
}

/** Hamma logotip uchun bir xil optik maydon, px². */
const TARGET_AREA = 1100;

/** Maydon teng bo'ladigan balandlik. */
const heightFor = (ratio: number) => Math.round(Math.sqrt(TARGET_AREA / ratio));

const PAYMENTS: Logo[] = [
  { slug: 'click', name: 'Click', ratio: 2.46 },
  { slug: 'payme', name: 'Payme', ratio: 3.43 },
  { slug: 'uzum', name: 'Uzum Bank', ratio: 2.71 },
];

const CARRIERS: Logo[] = [
  // EMU logotipidagi «EXPRESS POCHTA» yozuvi OQ. Oq plitkada u
  // ko'rinmay qolardi, shuning uchun bu plitka brendning o'z to'q
  // sariq rangida.
  { slug: 'emu', name: 'EMU Express Pochta', ratio: 0.88, bg: '#F5821F' },
  // Rasmiy lokapdagi ruscha shior kesilgan: u belgini ikki barobar
  // kengaytirib, qatorda o'qib bo'lmas darajada kichraytirardi.
  { slug: 'bts', name: 'BTS', ratio: 2.52 },
];

function Row({ title, items }: { title: string; items: Logo[] }) {
  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>{title}</div>
      <ul className={styles.list}>
        {items.map((logo) => {
          const h = heightFor(logo.ratio);
          return (
            <li
              key={logo.slug}
              className={styles.tile}
              style={logo.bg ? { background: logo.bg } : undefined}
            >
              <img
                src={`/logos/${logo.slug}.png`}
                alt={logo.name}
                /* O'lchamlar oldindan beriladi: rasm yuklanguncha joy
                   band bo'lib turadi va footer sakramaydi. */
                width={Math.round(h * logo.ratio)}
                height={h}
                style={{ height: h, width: 'auto' }}
                loading="lazy"
                decoding="async"
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PaymentBadges({ locale }: { locale: Locale }) {
  const ru = locale === 'ru';
  return (
    <div className={styles.wrap}>
      <Row title={ru ? 'Оплата' : 'To‘lov'} items={PAYMENTS} />
      <Row title={ru ? 'Доставка' : 'Yetkazib berish'} items={CARRIERS} />
    </div>
  );
}
