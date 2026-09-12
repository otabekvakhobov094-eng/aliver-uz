import type { PrismaClient } from '@prisma/client';

/**
 * Saytning MATN qismi: brend sahifalari, savol-javob, blog va menyu.
 *
 * Huquqiy sahifalar (oferta, maxfiylik siyosati) bu yerda EMAS va
 * ataylab nashr qilinmagan holda qoladi: ularning matnini yurist
 * beradi, o'rniga o'ylab topilgan matn qo'yish do'kon uchun haqiqiy
 * xavf. Quyidagilar esa do'konning o'z gapi — ularni yozish mumkin.
 */

interface PageSeed {
  slug: string;
  titleUz: string;
  titleRu: string;
  bodyUz: string;
  bodyRu: string;
  seoDescUz?: string;
  seoDescRu?: string;
}

const PAGES: PageSeed[] = [
  {
    slug: 'originallik',
    titleUz: 'Originallik kafolati',
    titleRu: 'Гарантия оригинальности',
    seoDescUz: 'ALIVER.UZ — rasmiy do‘kon. Har bir buyurtma chek bilan, mahsulot original.',
    seoDescRu: 'ALIVER.UZ — официальный магазин. Каждый заказ с чеком, продукция оригинальная.',
    bodyUz: `ALIVER.UZ — ALIVER mahsulotlarining O‘zbekistondagi rasmiy onlayn do‘koni.

Nima kafolatlanadi

Do‘kondagi har bir mahsulot ishlab chiqaruvchidan to‘g‘ridan-to‘g‘ri keladi. Oraliq bozorlar, qayta sotuvchilar va noma’lum yetkazuvchilar yo‘q.

Har bir buyurtmaga fiskal chek ilova qilinadi. Chekda mahsulot nomi, IKPU kodi va to‘langan summa ko‘rsatiladi — bu hujjat sizda qoladi.

Mahsulot qadog‘i yopiq holda yetkaziladi. Qadoq ochilgan yoki shikastlangan bo‘lsa, kuryerdan qabul qilmang va biz almashtiramiz.

Agar mahsulot original emas deb hisoblasangiz

Buyurtma raqamini va qadoq rasmini +998 (78) 113-11-33 raqamiga yoki aloqa sahifasi orqali yuboring. Tekshiruv uch ish kunida o‘tkaziladi. Shubha tasdiqlansa, mahsulot qiymati to‘liq qaytariladi va yetkazish haqi ham bizning hisobimizdan bo‘ladi.

Nima uchun narx bozordagidan farq qiladi

Bozorda va marketpleyslarda ko‘rgan narxingiz ba’zan pastroq bo‘lishi mumkin. Sababi odatda bitta: u yerdagi mahsulotning kelib chiqishi noma’lum yoki saqlash muddati tugayotgan bo‘ladi. Kosmetika saqlash sharoitiga sezgir — noto‘g‘ri saqlangan krem terini davolamaydi, ta’sir qiladi.`,
    bodyRu: `ALIVER.UZ — официальный интернет-магазин продукции ALIVER в Узбекистане.

Что гарантируется

Каждый товар в магазине поступает напрямую от производителя. Без промежуточных рынков, перекупщиков и неизвестных поставщиков.

К каждому заказу прилагается фискальный чек. В нём указаны наименование, код ИКПУ и уплаченная сумма — документ остаётся у вас.

Товар доставляется в запечатанной упаковке. Если упаковка вскрыта или повреждена, не принимайте её у курьера — мы заменим товар.

Если вы считаете, что товар неоригинальный

Отправьте номер заказа и фото упаковки на +998 (78) 113-11-33 или через страницу контактов. Проверка занимает три рабочих дня. Если сомнения подтвердятся, стоимость возвращается полностью, доставка — за наш счёт.

Почему цена отличается от рыночной

На рынке или маркетплейсе цена иногда ниже. Причина обычно одна: происхождение товара неизвестно либо срок годности заканчивается. Косметика чувствительна к условиям хранения — неправильно хранившийся крем не ухаживает за кожей, а действует на неё.`,
  },
  {
    slug: 'hamkorlik-shartlari',
    titleUz: 'Hamkorlik shartlari',
    titleRu: 'Условия партнёрства',
    bodyUz: `ALIVER mahsulotlarini ulgurji narxda sotib olish va o‘z do‘koningizda sotish mumkin.

Kim uchun

Kosmetika do‘konlari, go‘zallik salonlari, sartaroshxonalar va onlayn sotuvchilar.

Shartlar

Birinchi buyurtma eng kami 5 000 000 so‘m. Keyingi buyurtmalar uchun chegara yo‘q.

Chegirma buyurtma hajmiga qarab 15% dan 30% gacha. Aniq foiz ariza ko‘rib chiqilgandan keyin aytiladi.

Toshkent bo‘ylab yetkazish bepul, viloyatlarga — transport kompaniyasi orqali.

Reklama materiallari (bannerlar, mahsulot rasmlari, tavsif matnlari) bepul beriladi.

Qanday boshlash kerak

Hamkorlik sahifasidagi arizani to‘ldiring. Menejer ikki ish kuni ichida bog‘lanadi.`,
    bodyRu: `Продукцию ALIVER можно закупать оптом и продавать в своём магазине.

Кому подходит

Магазины косметики, салоны красоты, парикмахерские и онлайн-продавцы.

Условия

Первый заказ — от 5 000 000 сум. Для последующих заказов минимума нет.

Скидка от 15% до 30% в зависимости от объёма. Точный процент называется после рассмотрения заявки.

Доставка по Ташкенту бесплатная, в регионы — через транспортную компанию.

Рекламные материалы (баннеры, фотографии товаров, описания) предоставляются бесплатно.

Как начать

Заполните заявку на странице партнёрства. Менеджер свяжется в течение двух рабочих дней.`,
  },
];

const FAQS: Array<[string, string, string, string, string]> = [
  [
    'yetkazish',
    'Buyurtma qancha vaqtda yetadi?',
    'Сколько идёт доставка?',
    'Toshkent bo‘yicha — 1 ish kuni, viloyatlarga — 2–4 ish kuni. Buyurtma tasdiqlangandan keyin SMS orqali kuzatuv raqami yuboriladi.',
    'По Ташкенту — 1 рабочий день, в регионы — 2–4 рабочих дня. После подтверждения заказа трек-номер приходит по SMS.',
  ],
  [
    'yetkazish',
    'Yetkazib berish qancha turadi?',
    'Сколько стоит доставка?',
    '500 000 so‘mdan yuqori buyurtmalar uchun bepul. Undan past bo‘lsa, narx hududga qarab hisoblanadi va buyurtma rasmiylashtirishda ko‘rinadi.',
    'Бесплатно при заказе от 500 000 сум. При меньшей сумме стоимость рассчитывается по региону и видна при оформлении.',
  ],
  [
    'tolov',
    'Qanday to‘lov usullari bor?',
    'Какие способы оплаты?',
    'Click, Payme, Uzum orqali onlayn yoki kuryerga naqd pul bilan. Onlayn to‘lovda chek elektron pochtaga ham yuboriladi.',
    'Онлайн через Click, Payme, Uzum или наличными курьеру. При онлайн-оплате чек дублируется на электронную почту.',
  ],
  [
    'qaytarish',
    'Mahsulotni qaytarish mumkinmi?',
    'Можно ли вернуть товар?',
    'Qadog‘i ochilmagan mahsulotni 14 kun ichida qaytarish mumkin. Ochilgan kosmetika, gigiyena talablariga ko‘ra, faqat nuqsonli bo‘lsa qaytariladi.',
    'Товар в невскрытой упаковке можно вернуть в течение 14 дней. Вскрытая косметика по гигиеническим требованиям возвращается только при браке.',
  ],
  [
    'mahsulot',
    'Mahsulot original ekanini qanday bilaman?',
    'Как узнать, что товар оригинальный?',
    'Har bir buyurtmaga IKPU kodi ko‘rsatilgan fiskal chek ilova qilinadi. Batafsil — «Originallik kafolati» sahifasida.',
    'К каждому заказу прилагается фискальный чек с кодом ИКПУ. Подробнее — на странице «Гарантия оригинальности».',
  ],
  [
    'ballar',
    'Bonus ballar qanday ishlaydi?',
    'Как работают бонусные баллы?',
    'Har 1 000 so‘mlik xarid uchun 1 ball. 1 ball = 1 so‘m va keyingi buyurtma summasining 30% gacha qismini qoplaydi. Ballar 12 oydan keyin kuyadi.',
    'За каждые 1 000 сум покупки — 1 балл. 1 балл = 1 сум и покрывает до 30% суммы следующего заказа. Баллы сгорают через 12 месяцев.',
  ],
];

const POSTS: Array<{ slug: string; uz: string; ru: string; exUz: string; exRu: string; bodyUz: string; bodyRu: string }> = [
  {
    slug: 'soch-tokilishiga-qarshi-nima-yordam-beradi',
    uz: 'Soch to‘kilishiga qarshi nima yordam beradi',
    ru: 'Что помогает от выпадения волос',
    exUz: 'Kuniga 50–100 tola to‘kilishi me’yor. Qachon tashvishlanish kerak va nima qilish mumkin.',
    exRu: 'Выпадение 50–100 волос в день — норма. Когда стоит беспокоиться и что делать.',
    bodyUz: `Kuniga 50 dan 100 tagacha soch to‘kilishi normal hisoblanadi. Yostiqda yoki dush panjarasida bir necha tola ko‘rish — hali muammo emas.

Qachon e’tibor berish kerak

Soch ajratmasi kengaysa, dumcha sezilarli ingichkalashsa yoki bir necha hafta ichida to‘kilish keskin ko‘paysa — sabab tashqarida emas, ichkarida bo‘lishi mumkin: temir yoki D vitamini yetishmasligi, qalqonsimon bez, stress, homiladorlikdan keyingi davr.

Tashqi parvarish nima qila oladi

Skalp — bu teri, va u ham quruqlashadi. Rozmarin, biotin va pantenol asosidagi vositalar skalpga qon oqimini oshiradi va tolani mustahkamlaydi. Ta’sir bir kechada ko‘rinmaydi: yangi tola o‘sishi uchun eng kami 8–12 hafta kerak.

Amaliy tartib

Moyni quruq skalpga hafta davomida 2–3 marta suring, barmoq uchi bilan bir daqiqa massaj qiling, 30 daqiqadan kamida ushlab turing va shampun bilan yuvib tashlang.

Issiq suv va kunlik yuvish tolani zaiflashtiradi. Iliq suv va haftasiga 3–4 marta yuvish ko‘pchilikka yetarli.`,
    bodyRu: `Выпадение от 50 до 100 волос в день считается нормой. Несколько волос на подушке или в сливе душа — ещё не проблема.

Когда стоит обратить внимание

Если пробор расширяется, хвост заметно истончился или выпадение резко усилилось за несколько недель — причина может быть не снаружи, а внутри: дефицит железа или витамина D, щитовидная железа, стресс, период после беременности.

Что может внешний уход

Кожа головы — это кожа, и она тоже пересыхает. Средства на основе розмарина, биотина и пантенола усиливают приток крови к коже головы и укрепляют волос. Эффект не виден за ночь: новому волосу нужно минимум 8–12 недель.

Практический порядок

Наносите масло на сухую кожу головы 2–3 раза в неделю, минуту массируйте подушечками пальцев, держите не менее 30 минут и смывайте шампунем.

Горячая вода и ежедневное мытьё ослабляют волос. Тёплая вода и мытьё 3–4 раза в неделю подходят большинству.`,
  },
  {
    slug: 'yuz-parvarishi-tartibi-qadamma-qadam',
    uz: 'Yuz parvarishi tartibi: qaysi vosita qaysi navbatda',
    ru: 'Уход за лицом: в каком порядке наносить средства',
    exUz: 'Serum kremdan oldinmi yoki keyin? Tartib noto‘g‘ri bo‘lsa, vositalar ishlamaydi.',
    exRu: 'Сыворотка до крема или после? При неверном порядке средства не работают.',
    bodyUz: `Qoida oddiy: suyuqroq vosita oldin, quyuqroq keyin. Quyuq krem ostidagi serum teriga yetib bormaydi.

Ertalab

Tozalash — yumshoq gel yoki shunchaki suv. Keyin antioksidant serum (C vitamini). Undan keyin namlovchi krem. Oxirida quyoshdan himoya — bulutli kunda ham.

Kechqurun

Makiyaj bo‘lsa — ikki bosqichli tozalash: avval moy asosidagi vosita, keyin gel. Keyin faol vosita (retinol yoki kislota — bir kechada bittasi, ikkalasi birga emas). Oxirida namlovchi krem.

Yangi vositani qanday kiritish kerak

Bir vaqtning o‘zida bitta yangi vosita. Ikkitasini birga boshlasangiz, teri reaksiya bersa qaysi biri sabab bo‘lganini bilmaysiz. Kamida ikki hafta kuzating.

Nima natija bermaydi

Kuniga bir necha marta skrab. Terining o‘z himoya qatlami buziladi va quruqlik kuchayadi. Skrab haftasiga bir marta yetarli.`,
    bodyRu: `Правило простое: сначала более жидкое, потом более плотное. Сыворотка под плотным кремом до кожи не дойдёт.

Утром

Очищение — мягкий гель или просто вода. Затем антиоксидантная сыворотка (витамин C). После — увлажняющий крем. В конце защита от солнца, в том числе в пасмурный день.

Вечером

Если был макияж — двухэтапное очищение: сначала средство на масляной основе, затем гель. Потом активное средство (ретинол или кислота — что-то одно за вечер, не вместе). В конце увлажняющий крем.

Как вводить новое средство

По одному новому средству за раз. Если начать сразу с двух, при реакции кожи будет непонятно, какое из них виновато. Наблюдайте минимум две недели.

Что не даёт результата

Скраб несколько раз в день. Защитный барьер кожи разрушается, и сухость усиливается. Скраба раз в неделю достаточно.`,
  },
  {
    slug: 'qish-oylarida-teri-quruqlashsa',
    uz: 'Qish oylarida teri quruqlashsa nima qilish kerak',
    ru: 'Что делать, если зимой сохнет кожа',
    exUz: 'Isitish mavsumida havo quruq bo‘ladi va odatiy krem yetmay qoladi.',
    exRu: 'В отопительный сезон воздух сухой, и привычного крема уже не хватает.',
    bodyUz: `Isitish yoqilganda xonadagi namlik 20–30% gacha tushadi. Teri uchun bu cho‘l sharoiti.

Birinchi navbatda o‘zgartiriladigan narsa

Yuvinish harorati. Issiq dush terining yog‘ qatlamini yuvib ketadi — shuning uchun dushdan keyin terining tortishishi seziladi. Iliq suv va 10 daqiqadan qisqa dush farqni bir haftada ko‘rsatadi.

Krem qachon suriladi

Nam teriga, dushdan keyin uch daqiqa ichida. Quruq teriga surilgan krem namlikni ushlab qololmaydi, chunki ushlab qoladigan narsaning o‘zi yo‘q.

Tarkibda nima bo‘lishi kerak

Gliserin va gialuron kislotasi namlikni tortadi, skvalan va shea moyi uni ushlab turadi. Faqat birinchisi bo‘lsa, quruq havoda krem namlikni terining o‘zidan tortib olishi mumkin — shuning uchun ikkalasi ham kerak.

Lab va qo‘l

Eng avval shular yoriladi, chunki ularda yog‘ bezi kam. Qo‘l kremini har yuvinishdan keyin surish odat bo‘lishi kerak, aks holda yozgacha tuzalmaydi.`,
    bodyRu: `Когда включают отопление, влажность в комнате падает до 20–30%. Для кожи это условия пустыни.

Что менять в первую очередь

Температуру воды. Горячий душ смывает липидный слой — отсюда стянутость после ванной. Тёплая вода и душ короче 10 минут дают разницу за неделю.

Когда наносить крем

На влажную кожу, в течение трёх минут после душа. На сухой коже крему нечего удерживать.

Что должно быть в составе

Глицерин и гиалуроновая кислота притягивают влагу, сквалан и масло ши её удерживают. Если есть только первое, в сухом воздухе крем может тянуть влагу из самой кожи — поэтому нужны оба.

Губы и руки

Трескаются первыми: там мало сальных желёз. Крем для рук после каждого мытья должен стать привычкой, иначе до лета не заживёт.`,
  },
];

/**
 * Sayt menyusi. Ilgari bu massiv `SiteHeader.tsx` ichida edi va uni
 * o'zgartirish uchun deploy kerak bo'lardi.
 */
interface MenuSeed {
  labelUz: string;
  labelRu: string;
  targetType: string;
  targetValue?: string;
  noteUz?: string;
  noteRu?: string;
  children?: MenuSeed[];
}

const HEADER_MENU: MenuSeed[] = [
  { labelUz: 'Bosh sahifa', labelRu: 'Главная', targetType: 'HOME' },
  {
    labelUz: 'Do‘kon',
    labelRu: 'Магазин',
    targetType: 'ROUTE',
    targetValue: '/katalog',
    children: [
      { labelUz: 'Soch parvarishi', labelRu: 'Уход за волосами', targetType: 'CATEGORY', targetValue: 'soch-parvarishi', noteUz: 'Moylar, shampunlar, niqoblar', noteRu: 'Масла, шампуни, маски' },
      { labelUz: 'Yuz parvarishi', labelRu: 'Уход за лицом', targetType: 'CATEGORY', targetValue: 'yuz-parvarishi', noteUz: 'Tozalash, namlash, serumlar', noteRu: 'Очищение, увлажнение, сыворотки' },
      { labelUz: 'Tana parvarishi', labelRu: 'Уход за телом', targetType: 'CATEGORY', targetValue: 'tana-parvarishi', noteUz: 'Kremlar, skrablar, moylar', noteRu: 'Кремы, скрабы, масла' },
      { labelUz: 'Tirnoq', labelRu: 'Ногти', targetType: 'CATEGORY', targetValue: 'tirnoq', noteUz: 'Gel laklar va vositalar', noteRu: 'Гель-лаки и средства' },
      { labelUz: 'Vosita tanlagich', labelRu: 'Подбор средства', targetType: 'ROUTE', targetValue: '/tanlagich', noteUz: 'Uchta savol — tayyor tanlov', noteRu: 'Три вопроса — готовая подборка' },
      { labelUz: 'Barcha kategoriyalar', labelRu: 'Все категории', targetType: 'ROUTE', targetValue: '/kategoriyalar' },
    ],
  },
  { labelUz: 'Yangi kelganlar', labelRu: 'Новинки', targetType: 'COLLECTION', targetValue: 'yangi-kelganlar' },
  { labelUz: 'TOP sotuvlar', labelRu: 'Хиты продаж', targetType: 'COLLECTION', targetValue: 'best-sellers' },
  { labelUz: 'Sovg‘a to‘plamlari', labelRu: 'Наборы в подарок', targetType: 'COLLECTION', targetValue: 'sovga-toplamlari' },
  {
    labelUz: 'Yordam',
    labelRu: 'Помощь',
    targetType: 'ROUTE',
    targetValue: '/savollar',
    children: [
      { labelUz: 'Yetkazib berish', labelRu: 'Доставка', targetType: 'ROUTE', targetValue: '/yetkazish', noteUz: 'Muddat va narxlar', noteRu: 'Сроки и цены' },
      { labelUz: 'Buyurtmani kuzatish', labelRu: 'Отследить заказ', targetType: 'ROUTE', targetValue: '/kuzatuv', noteUz: 'Raqam va telefon bo‘yicha', noteRu: 'По номеру и телефону' },
      { labelUz: 'Savol-javob', labelRu: 'Вопросы и ответы', targetType: 'ROUTE', targetValue: '/savollar' },
      { labelUz: 'Aloqa', labelRu: 'Контакты', targetType: 'ROUTE', targetValue: '/aloqa' },
    ],
  },
  { labelUz: 'Blog', labelRu: 'Блог', targetType: 'BLOG' },
  {
    labelUz: 'ALIVER haqida',
    labelRu: 'Об ALIVER',
    targetType: 'ROUTE',
    targetValue: '/biz-haqimizda',
    children: [
      { labelUz: 'Brend haqida', labelRu: 'О бренде', targetType: 'ROUTE', targetValue: '/biz-haqimizda' },
      { labelUz: 'Originallik kafolati', labelRu: 'Гарантия оригинала', targetType: 'PAGE', targetValue: 'originallik', noteUz: 'Rasmiy diler — chek bilan', noteRu: 'Официальный дилер — с чеком' },
      { labelUz: 'Bonus ballar', labelRu: 'Бонусные баллы', targetType: 'ROUTE', targetValue: '/kabinet/ballar', noteUz: 'Har 1 000 so‘mga 1 ball', noteRu: 'За каждые 1 000 сум — 1 балл' },
    ],
  },
  { labelUz: 'Hamkor bo‘ling', labelRu: 'Стать партнёром', targetType: 'ROUTE', targetValue: '/hamkorlik', noteUz: 'Ulgurji narxlar', noteRu: 'Оптовые цены' },
];

const FOOTER_MENU: MenuSeed[] = [
  { labelUz: 'Biz haqimizda', labelRu: 'О нас', targetType: 'ROUTE', targetValue: '/biz-haqimizda' },
  { labelUz: 'Yetkazish va to‘lov', labelRu: 'Доставка и оплата', targetType: 'ROUTE', targetValue: '/yetkazish' },
  { labelUz: 'Aloqa', labelRu: 'Контакты', targetType: 'ROUTE', targetValue: '/aloqa' },
  { labelUz: 'Kategoriyalar', labelRu: 'Категории', targetType: 'ROUTE', targetValue: '/kategoriyalar' },
  { labelUz: 'Ko‘p so‘raladigan savollar', labelRu: 'Частые вопросы', targetType: 'ROUTE', targetValue: '/savollar' },
  { labelUz: 'Originallik kafolati', labelRu: 'Гарантия оригинальности', targetType: 'PAGE', targetValue: 'originallik' },
  { labelUz: 'Blog', labelRu: 'Блог', targetType: 'BLOG' },
  { labelUz: 'Hamkorlik', labelRu: 'Партнёрство', targetType: 'ROUTE', targetValue: '/hamkorlik' },
];

/**
 * Aksiya bannerlari.
 *
 * Matn RASMDA emas, bazada — shuning uchun u ikki tilda bo'la oladi va
 * marketing uni deploysiz o'zgartiradi. Surat qo'shilsa (`imageUrl`),
 * u matnning ORTIGA tushadi; suratsiz ham banner to'liq ko'rinadi.
 */
const PROMOS: Array<{
  key: string;
  titleUz: string;
  titleRu: string;
  subtitleUz: string;
  subtitleRu: string;
  ctaUz: string;
  ctaRu: string;
  ctaUrl: string;
}> = [
  {
    key: 'yozgi-moylar',
    titleUz: 'Yozda soch va teri uchun salqin moylar',
    titleRu: 'Освежающие масла для волос и кожи',
    subtitleUz: 'Rozmarin, batana, kastor va qovoq urug‘i moylari — issiqda ham yengil.',
    subtitleRu: 'Розмарин, батана, касторовое и тыквенное масла — лёгкие даже в жару.',
    ctaUz: 'Moylarni ko‘rish',
    ctaRu: 'Смотреть масла',
    ctaUrl: '/katalog?category=soch-parvarishi',
  },
  {
    key: 'wine-lip-tint',
    /*
     * FOIZ YOZILMAYDI. Seed'dagi banner «25% chegirma» deb va'da
     * berardi, chegirmalar modulida esa bunday qoida yo'q edi:
     * xaridor savatda hech qanday chegirma ko'rmasdi. Haqiqiy
     * aksiyani admin «Chegirmalar» bo'limida yaratadi va u savatda
     * o'zi qo'llanadi.
     */
    titleUz: 'Wine Lip Tint — ipakdek matn',
    titleRu: 'Wine Lip Tint — шелковистая текстура',
    subtitleUz: 'Ipakdek yumshoq, to‘yingan rang. Kun bo‘yi ushlab turadi.',
    subtitleRu: 'Шелковистая текстура и насыщенный цвет. Держится весь день.',
    ctaUz: 'Tanlash',
    ctaRu: 'Выбрать',
    ctaUrl: '/katalog?category=makiyaj',
  },
];

export async function seedContent(prisma: PrismaClient): Promise<void> {
  for (const p of PAGES) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: { titleUz: p.titleUz, titleRu: p.titleRu, bodyUz: p.bodyUz, bodyRu: p.bodyRu },
      create: { ...p, isPublished: true },
    });
  }
  console.log(`  brend sahifalari: ${PAGES.length} ta`);

  // FAQ da `slug` yo'q — takrorlanmasligi uchun savol matni bo'yicha
  // qidiramiz.
  let faqCount = 0;
  for (const [category, qUz, qRu, aUz, aRu] of FAQS) {
    const existing = await prisma.faq.findFirst({ where: { questionUz: qUz } });
    if (existing) {
      await prisma.faq.update({
        where: { id: existing.id },
        data: { answerUz: aUz, answerRu: aRu, category },
      });
    } else {
      await prisma.faq.create({
        data: {
          category,
          questionUz: qUz,
          questionRu: qRu,
          answerUz: aUz,
          answerRu: aRu,
          sortOrder: faqCount,
          isActive: true,
        },
      });
    }
    faqCount += 1;
  }
  console.log(`  savol-javob: ${faqCount} ta`);

  for (const [i, post] of POSTS.entries()) {
    // Nashr sanalari turlicha bo'lsin — blog ro'yxati sana bo'yicha
    // saralanadi va hammasi bir xil bo'lsa tartib tasodifiy chiqadi.
    const publishedAt = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: { titleUz: post.uz, titleRu: post.ru, bodyUz: post.bodyUz, bodyRu: post.bodyRu },
      create: {
        slug: post.slug,
        titleUz: post.uz,
        titleRu: post.ru,
        excerptUz: post.exUz,
        excerptRu: post.exRu,
        bodyUz: post.bodyUz,
        bodyRu: post.bodyRu,
        author: 'ALIVER',
        isPublished: true,
        publishedAt,
      },
    });
  }
  console.log(`  blog maqolalari: ${POSTS.length} ta`);

  // Banner'da `slug` yo'q — takrorlanmaslik uchun sarlavha bo'yicha
  // qidiramiz. Mavjud banner TEGILMAYDI: marketing uni o'zgartirgan
  // bo'lishi mumkin.
  for (const [i, promo] of PROMOS.entries()) {
    const existing = await prisma.banner.findFirst({
      where: { placement: 'PROMO', titleUz: promo.titleUz },
    });
    if (existing) continue;
    await prisma.banner.create({
      data: {
        placement: 'PROMO',
        titleUz: promo.titleUz,
        titleRu: promo.titleRu,
        subtitleUz: promo.subtitleUz,
        subtitleRu: promo.subtitleRu,
        ctaLabelUz: promo.ctaUz,
        ctaLabelRu: promo.ctaRu,
        ctaUrl: promo.ctaUrl,
        sortOrder: i,
        isActive: true,
      },
    });
  }
  console.log(`  aksiya bannerlari: ${PROMOS.length} ta`);

  await seedMenu(prisma, 'HEADER', HEADER_MENU);
  await seedMenu(prisma, 'FOOTER', FOOTER_MENU);
}

/**
 * Menyu FAQAT bo'sh bo'lsa to'ldiriladi.
 *
 * Aks holda seed'ni qayta ishga tushirish adminning qo'lda qilgan
 * o'zgarishlarini yo'q qilardi — va buni hech kim so'ramagan bo'lardi.
 */
async function targetExists(
  prisma: PrismaClient,
  type: string,
  value: string | undefined,
): Promise<boolean> {
  const slug = (value ?? '').trim();
  if (!slug) return type !== 'CATEGORY' && type !== 'COLLECTION' && type !== 'PAGE';
  switch (type) {
    case 'CATEGORY':
      return (await prisma.category.count({ where: { slug, isActive: true, deletedAt: null } })) > 0;
    case 'COLLECTION':
      return (await prisma.collection.count({ where: { slug, isActive: true, deletedAt: null } })) > 0;
    case 'PAGE':
      return (await prisma.page.count({ where: { slug, isPublished: true, deletedAt: null } })) > 0;
    case 'BLOG':
      return (await prisma.blogPost.count({ where: { slug, isPublished: true, deletedAt: null } })) > 0;
    default:
      return true;
  }
}

async function seedMenu(prisma: PrismaClient, location: string, items: MenuSeed[]): Promise<void> {
  const existing = await prisma.menuItem.count({ where: { location } });
  if (existing > 0) {
    console.log(`  menyu (${location}): allaqachon bor, tegilmadi`);
    return;
  }

  // Nishoni yo'q band seed qilinmaydi. Aks holda katalog boshqa
  // slug'lar bilan kelgan bazada menyu tug'ilishidanoq buzilgan
  // bo'lardi: admin uni qizil ko'radi, sayt esa umuman ko'rsatmaydi.
  const skipped: string[] = [];

  let total = 0;
  for (const [i, item] of items.entries()) {
    if (!(await targetExists(prisma, item.targetType, item.targetValue))) {
      skipped.push(`${item.labelUz} → ${item.targetValue}`);
      continue;
    }
    const parent = await prisma.menuItem.create({
      data: {
        location,
        labelUz: item.labelUz,
        labelRu: item.labelRu,
        noteUz: item.noteUz ?? null,
        noteRu: item.noteRu ?? null,
        targetType: item.targetType,
        targetValue: item.targetValue ?? null,
        sortOrder: i,
      },
    });
    total += 1;
    for (const [j, child] of (item.children ?? []).entries()) {
      if (!(await targetExists(prisma, child.targetType, child.targetValue))) {
        skipped.push(`${child.labelUz} → ${child.targetValue}`);
        continue;
      }
      await prisma.menuItem.create({
        data: {
          location,
          parentId: parent.id,
          labelUz: child.labelUz,
          labelRu: child.labelRu,
          noteUz: child.noteUz ?? null,
          noteRu: child.noteRu ?? null,
          targetType: child.targetType,
          targetValue: child.targetValue ?? null,
          sortOrder: j,
        },
      });
      total += 1;
    }
  }
  console.log(`  menyu (${location}): ${total} ta band`);
  if (skipped.length > 0) {
    console.log(`  menyu (${location}): nishoni yo‘qligi uchun tashlandi — ${skipped.join(', ')}`);
  }
}
