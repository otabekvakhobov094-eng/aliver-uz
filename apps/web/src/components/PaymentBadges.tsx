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
 * 3. Logotip balandligi HAR BIRI UCHUN alohida sozlangan. Hammasini
 *    bir xil pikselga qo'ysa, natija teng ko'rinmaydi: EMU tik
 *    (vertikal) lokap, BTS esa ostida shiori bor keng lokap. Ko'z
 *    balandlikni emas, EGALLANGAN MAYDONNI taqqoslaydi — shuning
 *    uchun tik logotip pastroq, keng logotip balandroq qo'yiladi.
 */

interface Logo {
  slug: string;
  name: string;
  /** Plitka ichidagi balandlik, px. Optik muvozanat uchun. */
  h: number;
  /** Brend talab qiladigan fon. Berilmasa — oq. */
  bg?: string;
}

const PAYMENTS: Logo[] = [
  { slug: 'click', name: 'Click', h: 23 },
  { slug: 'payme', name: 'Payme', h: 21 },
  { slug: 'uzum', name: 'Uzum Bank', h: 29 },
];

const CARRIERS: Logo[] = [
  // EMU logotipidagi «EXPRESS POCHTA» yozuvi OQ. Oq plitkada u
  // ko'rinmay qolardi, shuning uchun bu plitka brendning o'z to'q
  // sariq rangida.
  { slug: 'emu', name: 'EMU Express Pochta', h: 42, bg: '#F5821F' },
  // Rasmiy lokapdagi ruscha shior kesilgan: u belgini ikki barobar
  // kengaytirib, qatorda o'qib bo'lmas darajada kichraytirardi.
  { slug: 'bts', name: 'BTS', h: 26 },
];

function Row({ title, items }: { title: string; items: Logo[] }) {
  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>{title}</div>
      <ul className={styles.list}>
        {items.map((logo) => (
          <li
            key={logo.slug}
            className={styles.tile}
            style={logo.bg ? { background: logo.bg } : undefined}
          >
            <img
              src={`/logos/${logo.slug}.png`}
              alt={logo.name}
              /* `height` atributi ham beriladi: rasm yuklanguncha joy
                 band bo'lib turadi va footer sakramaydi. */
              height={logo.h}
              style={{ height: logo.h }}
              loading="lazy"
              decoding="async"
            />
          </li>
        ))}
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
