import styles from './HeroVisual.module.css';

/**
 * Bosh sahifadagi mahsulot surati.
 *
 * Surat CHAP CHETIDAN shaffoflashadi (`mask-image`) va orqadagi jonli
 * shader foniga singib ketadi. Shu sababli ikki qatlam bir butun
 * ko'rinadi: statik surat "yopishtirilgan" emas, fon esa uning atrofida
 * harakatlanadi.
 *
 * `<picture>` ishlatilgan, Next.js `<Image>` emas: suratlar allaqachon
 * kerakli o'lchamlarda tayyorlangan (1600/1100/760 WebP + JPEG zaxira),
 * ya'ni serverda har so'rovda rasm qayta ishlash shart emas. Render'ning
 * bepul tarifida bu sezilarli farq.
 *
 * Surat BEZAK: `alt=""` va `aria-hidden`. Uning mazmuni yonidagi
 * sarlavhada aytilgan, shuning uchun ekran o'quvchi uni ikki marta
 * o'qimasligi kerak.
 */
export function HeroVisual() {
  return (
    <div className={styles.wrap} aria-hidden="true">
      <picture>
        <source
          type="image/webp"
          srcSet="/hero/aliver-hero-760.webp 760w, /hero/aliver-hero-1100.webp 1100w, /hero/aliver-hero-1600.webp 1600w"
          sizes="(max-width: 960px) 100vw, 55vw"
        />
        <img
          src="/hero/aliver-hero-1600.jpg"
          alt=""
          width={1586}
          height={992}
          decoding="async"
          /*
           * Bu sahifadagi eng katta element — ya'ni LCP. U kechikkanda
           * sahifa "sekin ochilgandek" his qilinadi, shuning uchun
           * dangasa yuklash O'CHIRILGAN va ustuvorlik yuqori.
           */
          loading="eager"
          fetchPriority="high"
          className={styles.image}
        />
      </picture>
    </div>
  );
}
