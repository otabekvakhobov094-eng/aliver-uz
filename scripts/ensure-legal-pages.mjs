import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const identity = {
  companyName: process.env.LEGAL_COMPANY_NAME?.trim(),
  taxId: process.env.LEGAL_TAX_ID?.trim(),
  address: process.env.LEGAL_ADDRESS?.trim(),
  returnAddress: process.env.LEGAL_RETURN_ADDRESS?.trim(),
  phone: process.env.LEGAL_PHONE?.trim(),
  email: process.env.LEGAL_EMAIL?.trim(),
  version: process.env.LEGAL_DOCUMENT_VERSION?.trim(),
};

const missing = Object.entries(identity)
  .filter(([, value]) => !value)
  .map(([key]) => key);

function offerUz(i) {
  return `OMMAVIY OFERTA

Tahrir sanasi: ${i.version}

1. UMUMIY QOIDALAR
Ushbu ommaviy oferta ${i.companyName} (STIR: ${i.taxId}), manzil: ${i.address} (keyingi o‘rinlarda — “Sotuvchi”) tomonidan ALIVER.UZ internet-do‘koni orqali tovar sotish shartlarini belgilaydi. Xaridor buyurtma berishdan oldin ushbu shartlar bilan tanishadi va roziligini tasdiqlaydi.

2. SHARTNOMA PREDMETI
Sotuvchi saytda ko‘rsatilgan kosmetika va parvarish mahsulotlarini sotadi, Xaridor esa tanlangan tovar haqini to‘laydi va uni qabul qiladi. Tovarning nomi, xususiyatlari, tarkibi, narxi va mavjudligi mahsulot sahifasida ko‘rsatiladi.

3. BUYURTMANI RASMIYLASHTIRISH
Xaridor aloqa va yetkazib berish ma’lumotlarini to‘g‘ri kiritishi shart. Buyurtma Sotuvchi tomonidan tasdiqlangach qabul qilingan hisoblanadi. Tovar mavjud bo‘lmasa yoki texnik xato aniqlansa, Sotuvchi Xaridor bilan bog‘lanib buyurtmani aniqlashtiradi yoki to‘langan mablag‘ni qaytaradi.

4. NARX VA TO‘LOV
Amaldagi narx buyurtma berish vaqtida saytda ko‘rsatiladi. To‘lov checkout sahifasida mavjud usullar orqali amalga oshiriladi. Elektron yoki fiskal chek amaldagi talablar va ulangan to‘lov/OFD xizmatlari qoidalariga muvofiq taqdim etiladi.

5. YETKAZIB BERISH
Yetkazib berish usuli, hududi, muddati va narxi buyurtma vaqtida ko‘rsatiladi. Xaridor tovarni qabul qilayotganda o‘ram va komplektni tekshiradi. Kechikish yoki shikastlanish aniqlansa, Xaridor Sotuvchiga imkon qadar tez xabar beradi.

6. QAYTARISH VA DA’VOLAR
Qaytarish, almashtirish va pulni qaytarish shartlari saytdagi “Qaytarish shartlari” sahifasida beriladi. Nuqsonli, shikastlangan yoki buyurtmaga mos kelmaydigan tovar bo‘yicha murojaat uchun buyurtma raqami va tasdiqlovchi materiallar talab qilinishi mumkin.

7. TOMONLARNING JAVOBGARLIGI
Tomonlar majburiyatlarini amaldagi qonunchilik doirasida bajaradi. Sotuvchi noto‘g‘ri qo‘llash, saqlash qoidalariga rioya qilmaslik yoki Xaridor taqdim etgan noto‘g‘ri ma’lumot oqibatlari uchun javob bermaydi.

8. SHAXSIY MA’LUMOTLAR
Shaxsiy ma’lumotlar “Maxfiylik siyosati”ga muvofiq qayta ishlanadi. Buyurtma bajarilishi uchun zarur ma’lumotlar to‘lov, yetkazib berish, SMS va boshqa xizmat ko‘rsatuvchilarga zarur hajmda uzatilishi mumkin.

9. NIZOLAR VA MUROJAATLAR
Nizolar avvalo muzokara va yozma murojaat orqali hal etiladi. Kelishuvga erishilmasa, masala amaldagi qonunchilikda belgilangan tartibda ko‘rib chiqiladi.

10. SOTUVCHI REKVIZITLARI
${i.companyName}
STIR: ${i.taxId}
Yuridik manzil: ${i.address}
Qaytarish manzili: ${i.returnAddress}
Telefon: ${i.phone}
Email: ${i.email}`;
}

function offerRu(i) {
  return `ПУБЛИЧНАЯ ОФЕРТА

Дата редакции: ${i.version}

1. ОБЩИЕ ПОЛОЖЕНИЯ
Настоящая публичная оферта определяет условия продажи товаров интернет-магазином ALIVER.UZ. Продавец: ${i.companyName}, ИНН: ${i.taxId}, адрес: ${i.address}. До оформления заказа Покупатель знакомится с условиями и подтверждает согласие с ними.

2. ПРЕДМЕТ ДОГОВОРА
Продавец реализует представленные на сайте косметические товары и средства ухода, а Покупатель оплачивает и принимает выбранный товар. Наименование, характеристики, состав, цена и наличие указываются на странице товара.

3. ОФОРМЛЕНИЕ ЗАКАЗА
Покупатель указывает достоверные контактные данные и адрес доставки. Заказ считается принятым после подтверждения Продавцом. При отсутствии товара или технической ошибке Продавец связывается с Покупателем для уточнения заказа либо возвращает уплаченную сумму.

4. ЦЕНА И ОПЛАТА
Действует цена, указанная на сайте при оформлении заказа. Оплата производится доступными на странице оформления способами. Электронный или фискальный чек предоставляется согласно действующим требованиям и правилам подключённых платёжных/OFD-сервисов.

5. ДОСТАВКА
Способ, территория, срок и стоимость доставки показываются при оформлении. При получении Покупатель проверяет упаковку и комплектность. О задержке или повреждении необходимо сообщить Продавцу как можно скорее.

6. ВОЗВРАТ И ПРЕТЕНЗИИ
Условия возврата, обмена и возмещения размещены на странице «Условия возврата». Для обращения по дефектному, повреждённому или не соответствующему заказу товару могут потребоваться номер заказа и подтверждающие материалы.

7. ОТВЕТСТВЕННОСТЬ СТОРОН
Стороны исполняют обязательства в пределах применимого законодательства. Продавец не отвечает за последствия неправильного применения, нарушения условий хранения или недостоверных данных, предоставленных Покупателем.

8. ПЕРСОНАЛЬНЫЕ ДАННЫЕ
Персональные данные обрабатываются согласно «Политике конфиденциальности». Данные, необходимые для исполнения заказа, могут в необходимом объёме передаваться платёжным, курьерским, SMS- и другим сервисным партнёрам.

9. СПОРЫ И ОБРАЩЕНИЯ
Споры сначала разрешаются путём переговоров и письменного обращения. Если соглашение не достигнуто, спор рассматривается в установленном применимым законодательством порядке.

10. РЕКВИЗИТЫ ПРОДАВЦА
${i.companyName}
ИНН: ${i.taxId}
Юридический адрес: ${i.address}
Адрес возврата: ${i.returnAddress}
Телефон: ${i.phone}
Email: ${i.email}`;
}

function privacyUz(i) {
  return `MAXFIYLIK SIYOSATI

Tahrir sanasi: ${i.version}

1. MA’LUMOTLAR OPERATORI
Shaxsiy ma’lumotlar operatori: ${i.companyName}, STIR ${i.taxId}, manzil: ${i.address}. Maxfiylik bo‘yicha murojaatlar: ${i.email}, ${i.phone}.

2. QANDAY MA’LUMOTLARNI YIG‘AMIZ
Sayt telefon raqami, ism-familiya, email, yetkazib berish manzili, buyurtma va qaytarish tarixi, to‘lov holati, qurilma hamda texnik jurnal ma’lumotlarini qayta ishlashi mumkin. Bank karta rekvizitlari ALIVER.UZ serverlarida saqlanmaydi; ular to‘lov provayderi tomonidan qayta ishlanadi.

3. QAYTA ISHLASH MAQSADLARI
Ma’lumotlar akkaunt va buyurtmalarni boshqarish, to‘lovni tasdiqlash, yetkazib berish, qo‘llab-quvvatlash, firibgarlikning oldini olish, qonuniy hisob va cheklar, rozilik bo‘lsa marketing hamda sayt sifatini yaxshilash uchun ishlatiladi.

4. ASOS VA ROZILIK
Ma’lumotlar shartnomani bajarish, qonuniy majburiyatlar, axborot xavfsizligi va foydalanuvchi roziligi asosida qayta ishlanadi. Marketing roziligini istalgan vaqtda bekor qilish mumkin.

5. MA’LUMOTLARNI UZATISH
Buyurtmani bajarish uchun zarur ma’lumotlar to‘lov, yetkazib berish, hosting, SMS/email, analitika va OFD xizmatlariga faqat zarur hajmda uzatilishi mumkin. Operator xizmat ko‘rsatuvchilardan ma’lumotlarni himoya qilishni talab qiladi.

6. COOKIE FAYLLARI
Zarur cookie fayllari sayt, savat va sessiya ishlashi uchun qo‘llanadi. Analitik va marketing cookie fayllari foydalanuvchi roziligidan keyingina yoqiladi; tanlov cookie sozlamalarida o‘zgartiriladi.

7. SAQLASH VA HIMOYA
Ma’lumotlar maqsad va qonuniy talab uchun zarur muddat davomida saqlanadi. Kirishni cheklash, shifrlangan aloqa, audit jurnallari, zaxira nusxalar va boshqa tashkiliy-texnik choralar qo‘llanadi.

8. FOYDALANUVCHI HUQUQLARI
Foydalanuvchi o‘z ma’lumotlari haqida axborot olish, noto‘g‘ri ma’lumotni tuzatish, qonun ruxsat bergan hollarda o‘chirish yoki qayta ishlashni cheklash, marketing roziligini bekor qilish uchun Operatorga murojaat qilishi mumkin. Shaxsni tasdiqlash so‘ralishi mumkin.

9. SIYOSATDAGI O‘ZGARISHLAR
Yangi tahrir ushbu sahifada e’lon qilinadi va tahrir sanasi yangilanadi. Muhim o‘zgarishlar bo‘lsa, mavjud aloqa kanallari orqali xabar berilishi mumkin.

10. ALOQA
${i.companyName}
STIR: ${i.taxId}
Manzil: ${i.address}
Email: ${i.email}
Telefon: ${i.phone}`;
}

function privacyRu(i) {
  return `ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ

Дата редакции: ${i.version}

1. ОПЕРАТОР ДАННЫХ
Оператор персональных данных: ${i.companyName}, ИНН ${i.taxId}, адрес: ${i.address}. Обращения по вопросам конфиденциальности: ${i.email}, ${i.phone}.

2. КАКИЕ ДАННЫЕ МЫ СОБИРАЕМ
Сайт может обрабатывать номер телефона, имя и фамилию, email, адрес доставки, историю заказов и возвратов, статус оплаты, сведения об устройстве и технические журналы. Реквизиты банковской карты не хранятся на серверах ALIVER.UZ и обрабатываются платёжным провайдером.

3. ЦЕЛИ ОБРАБОТКИ
Данные используются для управления аккаунтом и заказами, подтверждения оплаты, доставки, поддержки, предотвращения мошенничества, обязательного учёта и чеков, маркетинга при наличии согласия и улучшения качества сайта.

4. ОСНОВАНИЯ И СОГЛАСИЕ
Обработка осуществляется для исполнения договора, выполнения законных обязанностей, обеспечения информационной безопасности и на основании согласия пользователя. Согласие на маркетинг можно отозвать в любое время.

5. ПЕРЕДАЧА ДАННЫХ
Данные, необходимые для исполнения заказа, могут в необходимом объёме передаваться платёжным, курьерским, хостинг-, SMS/email-, аналитическим и OFD-сервисам. Оператор требует от поставщиков услуг обеспечивать защиту данных.

6. COOKIE
Необходимые cookie обеспечивают работу сайта, корзины и сессии. Аналитические и маркетинговые cookie включаются только после согласия пользователя; выбор можно изменить в настройках cookie.

7. ХРАНЕНИЕ И ЗАЩИТА
Данные хранятся столько, сколько необходимо для заявленных целей и требований закона. Применяются ограничение доступа, шифрованная передача, журналы аудита, резервное копирование и иные организационно-технические меры.

8. ПРАВА ПОЛЬЗОВАТЕЛЯ
Пользователь может запросить сведения о своих данных, исправить неточности, в предусмотренных законом случаях потребовать удаления или ограничения обработки и отозвать маркетинговое согласие. Для защиты данных может потребоваться подтверждение личности.

9. ИЗМЕНЕНИЯ ПОЛИТИКИ
Новая редакция публикуется на этой странице с обновлённой датой. О существенных изменениях может быть сообщено по доступным каналам связи.

10. КОНТАКТЫ
${i.companyName}
ИНН: ${i.taxId}
Адрес: ${i.address}
Email: ${i.email}
Телефон: ${i.phone}`;
}

async function main() {
  if (missing.length || process.env.LEGAL_PUBLISH_CONFIRMED !== 'true') {
    const reason = missing.length
      ? `rekvizitlar yetishmaydi: ${missing.join(', ')}`
      : 'yurist tasdig‘i kutilmoqda';
    console.log(`Huquqiy sahifalar nashr qilinmadi — ${reason}.`);
    return;
  }

  const pages = [
    {
      slug: 'public-offer',
      titleUz: 'Ommaviy oferta',
      titleRu: 'Публичная оферта',
      bodyUz: offerUz(identity),
      bodyRu: offerRu(identity),
    },
    {
      slug: 'privacy-policy',
      titleUz: 'Maxfiylik siyosati',
      titleRu: 'Политика конфиденциальности',
      bodyUz: privacyUz(identity),
      bodyRu: privacyRu(identity),
    },
  ];

  for (const page of pages) {
    const existing = await prisma.page.findUnique({ where: { slug: page.slug } });
    const managedDraft =
      !existing ||
      existing.bodyUz?.startsWith('[Matn yurist') ||
      existing.bodyUz?.startsWith('[Kompaniya rekvizitlari');

    if (existing && !managedDraft) {
      console.log(`${page.slug}: CMS orqali tahrirlangan matn saqlandi.`);
      continue;
    }

    await prisma.page.upsert({
      where: { slug: page.slug },
      update: { ...page, isPublished: true, version: identity.version },
      create: { ...page, isPublished: true, version: identity.version },
    });
    console.log(`${page.slug}: ${identity.version} tahriri nashr qilindi.`);
  }
}

main()
  .catch((error) => {
    console.error('Huquqiy sahifalarni tayyorlashda xato:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
