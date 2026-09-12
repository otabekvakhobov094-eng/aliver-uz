import type { MenuNode } from './content-api';

/**
 * Menyu API javob bermaganda ishlatiladigan zaxira.
 *
 * NEGA KERAK. Menyu endi bazadan keladi. Lekin API bir soniya javob
 * bermasa yoki baza hali seed qilinmagan bo'lsa, saytning sarlavhasi
 * BO'SH chiqadi — foydalanuvchi uchun bu «sayt buzilgan» degani.
 * Shuning uchun zaxira nusxa kodda qoladi va u faqat javob bo'sh
 * bo'lgandagina ko'rinadi.
 *
 * Bu ro'yxat seed'dagi menyuning aynan o'zi bo'lishi kerak;
 * `scripts/check-nav-targets.mjs` ikkalasini solishtiradi.
 */
const n = (
  labelUz: string,
  labelRu: string,
  href: string,
  extra: Partial<MenuNode> = {},
): MenuNode => ({
  id: href || 'home',
  labelUz,
  labelRu,
  noteUz: null,
  noteRu: null,
  href,
  external: false,
  highlighted: false,
  children: [],
  ...extra,
});

export const DEFAULT_HEADER_MENU: MenuNode[] = [
  n('Bosh sahifa', 'Главная', ''),
  n('Do‘kon', 'Магазин', '/katalog', {
    children: [
      n('Soch parvarishi', 'Уход за волосами', '/katalog?category=soch-parvarishi', {
        noteUz: 'Moylar, shampunlar, niqoblar',
        noteRu: 'Масла, шампуни, маски',
      }),
      n('Yuz parvarishi', 'Уход за лицом', '/katalog?category=yuz-parvarishi', {
        noteUz: 'Tozalash, namlash, serumlar',
        noteRu: 'Очищение, увлажнение, сыворотки',
      }),
      n('Tana parvarishi', 'Уход за телом', '/katalog?category=tana-parvarishi', {
        noteUz: 'Kremlar, skrablar, moylar',
        noteRu: 'Кремы, скрабы, масла',
      }),
      n('Tirnoq', 'Ногти', '/katalog?category=tirnoq', {
        noteUz: 'Gel laklar va vositalar',
        noteRu: 'Гель-лаки и средства',
      }),
      n('Vosita tanlagich', 'Подбор средства', '/tanlagich', {
        noteUz: 'Uchta savol — tayyor tanlov',
        noteRu: 'Три вопроса — готовая подборка',
      }),
      n('Barcha kategoriyalar', 'Все категории', '/kategoriyalar'),
    ],
  }),
  n('Yangi kelganlar', 'Новинки', '/katalog?collection=yangi-kelganlar'),
  n('TOP sotuvlar', 'Хиты продаж', '/katalog?collection=best-sellers'),
  n('Sovg‘a to‘plamlari', 'Наборы в подарок', '/katalog?collection=sovga-toplamlari'),
  n('Yordam', 'Помощь', '/savollar', {
    children: [
      n('Yetkazib berish', 'Доставка', '/yetkazish', { noteUz: 'Muddat va narxlar', noteRu: 'Сроки и цены' }),
      n('Buyurtmani kuzatish', 'Отследить заказ', '/kuzatuv', {
        noteUz: 'Raqam va telefon bo‘yicha',
        noteRu: 'По номеру и телефону',
      }),
      n('Savol-javob', 'Вопросы и ответы', '/savollar'),
      n('Aloqa', 'Контакты', '/aloqa'),
    ],
  }),
  n('Blog', 'Блог', '/blog'),
  n('ALIVER haqida', 'Об ALIVER', '/biz-haqimizda', {
    children: [
      n('Brend haqida', 'О бренде', '/biz-haqimizda'),
      n('Originallik kafolati', 'Гарантия оригинала', '/sahifa/originallik', {
        noteUz: 'Rasmiy diler — chek bilan',
        noteRu: 'Официальный дилер — с чеком',
      }),
      n('Bonus ballar', 'Бонусные баллы', '/kabinet/ballar', {
        noteUz: 'Har 1 000 so‘mga 1 ball',
        noteRu: 'За каждые 1 000 сум — 1 балл',
      }),
    ],
  }),
  n('Hamkor bo‘ling', 'Стать партнёром', '/hamkorlik', {
    noteUz: 'Ulgurji narxlar',
    noteRu: 'Оптовые цены',
  }),
];

export const DEFAULT_FOOTER_MENU: MenuNode[] = [
  n('Biz haqimizda', 'О нас', '/biz-haqimizda'),
  n('Yetkazish va to‘lov', 'Доставка и оплата', '/yetkazish'),
  n('Aloqa', 'Контакты', '/aloqa'),
  n('Kategoriyalar', 'Категории', '/kategoriyalar'),
  n('Ko‘p so‘raladigan savollar', 'Частые вопросы', '/savollar'),
  n('Originallik kafolati', 'Гарантия оригинальности', '/sahifa/originallik'),
  n('Blog', 'Блог', '/blog'),
  n('Hamkorlik', 'Партнёрство', '/hamkorlik'),
];
