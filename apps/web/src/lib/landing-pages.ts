/**
 * Filtr uchun SEO sahifalari — TZ-3.
 *
 * Ro'yxat QO'LDA tuzilgan va bu ataylab. Har bir filtr kombinatsiyasi
 * uchun avtomatik sahifa yaratish katta xato bo'lardi: minglab yupqa
 * va bir-biriga o'xshash sahifa paydo bo'ladi, Google ularni
 * takrorlanuvchi kontent deb baholaydi va BUTUN domenning reytingi
 * tushadi. Bu SEO da eng ko'p uchraydigan o'z-o'ziga zarar.
 *
 * Shuning uchun har bir sahifa aniq QIDIRUV SO'ROVIGA javob beradi va
 * o'z matniga ega. O'nta sahifa yaxshi yozilgani mingta avtomatik
 * sahifadan ko'p trafik beradi.
 *
 * Yangi sahifa qo'shish: shu ro'yxatga bitta yozuv. Marshrut, meta
 * teglar, sitemap va ichki havolalar avtomatik yangilanadi.
 */

export interface LandingPage {
  /** URL: /uz/f/<slug> */
  slug: string;
  /**
   * Sarlavha BREND NOMISIZ yoziladi: layout shabloni «%s — ALIVER.UZ»
   * ni o'zi qo'shadi. Ilgari bu yerda ham brend bor edi va natijada
   * «… | ALIVER — ALIVER.UZ» chiqardi — uzun va takroriy, ikkalasi
   * ham qidiruvda zarar.
   */
  titleUz: string;
  titleRu: string;
  /** H1 — sarlavhadan farq qilishi mumkin. */
  headingUz: string;
  headingRu: string;
  /** Meta tavsif va sahifa ustidagi matn. */
  introUz: string;
  introRu: string;
  /** Katalogga uzatiladigan filtrlar. */
  filters: {
    category?: string;
    collection?: string;
    tags?: string;
    q?: string;
    minPrice?: string;
    maxPrice?: string;
    onSale?: boolean;
    inStock?: boolean;
    sort?: string;
  };
}

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: 'quruq-soch-uchun-moy',
    titleUz: 'Quruq soch uchun moy',
    titleRu: 'Масло для сухих волос',
    headingUz: 'Quruq soch uchun moylar',
    headingRu: 'Масла для сухих волос',
    introUz:
      'Quruq va sinuvchan soch uchun ozuqa moylari. Har birining tarkibi va vazifasi ' +
      'mahsulot sahifasida oddiy tilda yozilgan — INCI ro‘yxatini o‘zingiz tahlil ' +
      'qilishingiz shart emas.',
    introRu:
      'Питательные масла для сухих и ломких волос. Состав и его назначение описаны ' +
      'простым языком на странице каждого товара.',
    filters: { category: 'soch-parvarishi', tags: 'moy', inStock: true },
  },
  {
    slug: 'batana-moyi',
    titleUz: 'Batana moyi — original, Gonduras',
    titleRu: 'Масло батана — оригинал, Гондурас',
    headingUz: 'Batana moyi',
    headingRu: 'Масло батана',
    introUz:
      'Gonduras batana yong‘og‘idan olingan moy. ALIVER Uzbekistan rasmiy dileri — ' +
      'har bir shisha original va chek bilan beriladi.',
    introRu:
      'Масло из ореха батана, Гондурас. ALIVER Uzbekistan — официальный дилер, ' +
      'каждый флакон оригинальный и с чеком.',
    filters: { q: 'batana', inStock: true },
  },
  {
    slug: 'sezgir-teri-uchun',
    titleUz: 'Sezgir teri uchun kosmetika',
    titleRu: 'Косметика для чувствительной кожи',
    headingUz: 'Sezgir teri uchun',
    headingRu: 'Для чувствительной кожи',
    introUz:
      'Sezgir teriga mo‘ljallangan vositalar. Har bir mahsulotda ogohlantirish va ' +
      'to‘liq tarkib ko‘rsatilgan — alerjiya bo‘lsa oldindan tekshirib olasiz.',
    introRu:
      'Средства для чувствительной кожи. У каждого товара указаны предупреждения и ' +
      'полный состав — аллергию можно проверить заранее.',
    filters: { category: 'yuz-parvarishi', tags: 'sezgir-teri', inStock: true },
  },
  {
    slug: 'gel-lak',
    titleUz: 'Gel lak — to‘liq ranglar palitrasi',
    titleRu: 'Гель-лак — полная палитра',
    headingUz: 'Gel laklar',
    headingRu: 'Гель-лаки',
    introUz:
      'Gel laklar to‘liq palitrada. Kartochkada nechta soya borligi ko‘rsatiladi, ' +
      'shuning uchun mahsulotni ochmasdan tanlov kengligini bilasiz.',
    introRu:
      'Гель-лаки во всей палитре. На карточке видно количество оттенков — не нужно ' +
      'открывать товар, чтобы понять выбор.',
    /*
     * `gel-lak` — bu TEG emas, `seed-catalog` dagi KATEGORIYA slugi.
     * Teg sifatida u hech bir mahsulotga mos kelmasdi va sahifa
     * doim bo'sh chiqardi. Sahifa tirnoq kategoriyasi va qidiruv
     * so'zi bilan to'ldiriladi.
     */
    filters: { category: 'tirnoq', q: 'gel lak', inStock: true },
  },
  {
    slug: 'chegirmadagi-mahsulotlar',
    titleUz: 'Chegirmadagi kosmetika va aksiyalar',
    titleRu: 'Косметика со скидкой и акции',
    headingUz: 'Chegirmadagi mahsulotlar',
    headingRu: 'Товары со скидкой',
    introUz:
      'Ayni paytdagi chegirmalar. Narxlar avtomatik yangilanadi — aksiya tugagach ' +
      'mahsulot bu sahifadan chiqib ketadi.',
    introRu:
      'Действующие скидки. Цены обновляются автоматически — после окончания акции ' +
      'товар уходит с этой страницы.',
    filters: { onSale: true, inStock: true, sort: 'popular' },
  },
  {
    slug: 'sochni-tiklash',
    titleUz: 'Sochni tiklash vositalari',
    titleRu: 'Средства для восстановления волос',
    headingUz: 'Sochni tiklash',
    headingRu: 'Восстановление волос',
    introUz:
      'Bo‘yalgan, tarashdan charchagan va uchi yorilgan soch uchun. Natija haqidagi ' +
      'da’volar mahsulot sahifasida sinov ma’lumoti bilan birga beriladi.',
    introRu:
      'Для окрашенных, повреждённых волос и секущихся кончиков. Заявленный результат ' +
      'указан вместе с данными испытаний.',
    filters: { category: 'soch-parvarishi', tags: 'tiklash', inStock: true },
  },
  {
    slug: 'arzon-kosmetika-100000-gacha',
    titleUz: '100 000 so‘mgacha kosmetika',
    titleRu: 'Косметика до 100 000 сум',
    headingUz: '100 000 so‘mgacha',
    headingRu: 'До 100 000 сум',
    introUz:
      'Byudjetga mos original mahsulotlar. Narx pastligi originallikka ta’sir ' +
      'qilmaydi — hammasi rasmiy yetkazib beruvchidan.',
    introRu:
      'Оригинальные товары в бюджете. Низкая цена не означает иное происхождение — ' +
      'всё от официального поставщика.',
    filters: { maxPrice: '100000', inStock: true, sort: 'price_asc' },
  },
  {
    slug: 'sovgaga-kosmetika',
    titleUz: 'Sovg‘aga kosmetika to‘plami',
    titleRu: 'Косметика в подарок',
    headingUz: 'Sovg‘aga',
    headingRu: 'В подарок',
    introUz:
      'Sovg‘a uchun mos to‘plamlar va mahsulotlar. 300 000 so‘mdan yuqori ' +
      'buyurtmaga namuna bepul qo‘shiladi.',
    introRu:
      'Наборы и товары, которые уместно подарить. При заказе от 300 000 сум ' +
      'пробник в подарок.',
    filters: { collection: 'sovga-toplamlari', inStock: true },
  },
];

export function findLanding(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find((p) => p.slug === slug);
}
