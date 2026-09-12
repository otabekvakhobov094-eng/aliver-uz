/**
 * Katalog slug'lari: eskisidan yangisiga va sayt talab qiladiganlar.
 *
 * NEGA ALOHIDA FAYL. Bu ro'yxat ikki joyda kerak — deploy paytida
 * avtomatik ishlaydigan `ensure-aliver-catalog.mjs` da va qo'lda
 * ishga tushiriladigan `fix-menu-targets.mjs` da. Ikki nusxada
 * saqlansa, biri o'zgarib ikkinchisi qolib ketadi va natijada
 * bazaning holati qaysi skript ishlaganiga bog'liq bo'lardi.
 */

/**
 * Eski importer slugi → kod endi ishlatadigan slug.
 *
 * `skin-care` YUZ parvarishiga aylanadi: tasnif endi yuz va tanani
 * ajratadi, lekin qayta nomlash bitta qatorni ikkiga bo'la olmaydi.
 * Tana mahsulotlari qayta import paytida o'z joyiga o'tadi.
 */
export const CATEGORY_RENAME = {
  nail: 'tirnoq',
  'make-up': 'makiyaj',
  'foot-hand': 'qol-oyoq-parvarishi',
  'hair-care': 'soch-parvarishi',
  'skin-care': 'yuz-parvarishi',
  'teri-parvarishi': 'yuz-parvarishi',
  'mens-care': 'erkaklar-parvarishi',
  oral: 'ogiz-parvarishi',
  other: 'boshqa',
};

export const COLLECTION_RENAME = {
  'new-arrivals': 'yangi-kelganlar',
  'editor-choice': 'muharrir-tanlovi',
  'gifts-sets': 'sovga-toplamlari',
};

/**
 * Sayt QATTIQ yozib qo'ygan kategoriyalar.
 *
 * Bosh sahifadagi plitkalar, «Vosita tanlagich» va menyu shu
 * slug'larga qaraydi. Ular bazada bo'lmasa — plitka bo'sh sahifaga
 * olib boradi va bu 404 ham bermaydi.
 */
export const REQUIRED_CATEGORIES = [
  { slug: 'soch-parvarishi', nameUz: 'Soch parvarishi', nameRu: 'Уход за волосами' },
  { slug: 'yuz-parvarishi', nameUz: 'Yuz parvarishi', nameRu: 'Уход за лицом' },
  { slug: 'tana-parvarishi', nameUz: 'Tana parvarishi', nameRu: 'Уход за телом' },
  { slug: 'tirnoq', nameUz: 'Tirnoq parvarishi', nameRu: 'Уход за ногтями' },
  { slug: 'makiyaj', nameUz: 'Makiyaj', nameRu: 'Макияж' },
];

export const REQUIRED_COLLECTIONS = [
  { slug: 'yangi-kelganlar', nameUz: 'Yangi kelganlar', nameRu: 'Новинки' },
  { slug: 'best-sellers', nameUz: 'Bestsellerlar', nameRu: 'Хиты продаж' },
  { slug: 'sovga-toplamlari', nameUz: 'Sovg‘alar va to‘plamlar', nameRu: 'Подарки и наборы' },
];

/**
 * Slug'larni joyiga keltiradi: eskisini qayta nomlaydi, yetishmaganini
 * yaratadi.
 *
 * QAYTA NOMLASH, o'chirib-yaratish emas: qator o'sha qoladi, demak
 * mahsulot aloqalari ham, ID lar ham saqlanadi. Yangisini yaratib
 * eskisini tashlasak, 556 ta mahsulot kategoriyasiz qolardi.
 *
 * Idempotent: ikki marta ishlasa ikkinchisida hech narsa qilmaydi.
 */
export async function ensureCatalogSlugs(prisma, log = console.log) {
  let renamed = 0;
  let created = 0;

  for (const [model, table, map] of [
    [prisma.category, 'kategoriya', CATEGORY_RENAME],
    [prisma.collection, 'kolleksiya', COLLECTION_RENAME],
  ]) {
    for (const [from, to] of Object.entries(map)) {
      const old = await model.findFirst({ where: { slug: from } });
      if (!old) continue;
      const taken = await model.findFirst({ where: { slug: to } });
      if (taken) {
        log(`  ! ${table}: «${from}» → «${to}» — «${to}» allaqachon bor, tegilmadi`);
        continue;
      }
      await model.update({ where: { id: old.id }, data: { slug: to } });
      log(`  ${table}: «${from}» → «${to}»`);
      renamed += 1;
    }
  }

  for (const [model, table, list] of [
    [prisma.category, 'kategoriya', REQUIRED_CATEGORIES],
    [prisma.collection, 'kolleksiya', REQUIRED_COLLECTIONS],
  ]) {
    for (const row of list) {
      const found = await model.findFirst({ where: { slug: row.slug } });
      if (found) continue;
      await model.create({
        data: { slug: row.slug, nameUz: row.nameUz, nameRu: row.nameRu, isActive: true },
      });
      log(`  ${table} yaratildi: «${row.slug}» (${row.nameUz})`);
      created += 1;
    }
  }

  return { renamed, created };
}
