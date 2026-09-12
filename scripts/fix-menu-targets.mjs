/**
 * Menyu nishonlarini bazada tuzatish.
 *
 * NEGA KERAK. Loyihada ikkita katalog tasnifi paydo bo'lgan edi:
 *
 *   1. `seed-catalog.ts` — namoyish uchun, o'zbekcha slug'lar bilan
 *      (`soch-parvarishi`, `yuz-parvarishi`, `tirnoq`…);
 *   2. Shopify importeri — inglizcha slug'lar bilan
 *      (`hair-care`, `skin-care`, `nail`…).
 *
 * Jonli bazaga importer kelgan, menyu esa birinchi ro'yxatga qarab
 * turgan. Natija: sarlavhadagi olti band saytda UMUMAN ko'rinmagan.
 * Xato bermagan — shunchaki yo'q bo'lgan. Aynan shuning uchun uni
 * hech kim sezmagan.
 *
 * Endi kod bitta tasnifda — o'zbekcha slug'larda. Bu skript bazani
 * o'sha holatga keltiradi:
 *
 *   1. eski inglizcha slug'ni yangisiga QAYTA NOMLAYDI (qator o'sha
 *      qoladi, demak mahsulot aloqalari ham, IDlar ham saqlanadi);
 *   2. menyuning o'lik bandlarini mavjud nishonga qaytaradi;
 *   3. tuzatib bo'lmaydiganini ro'yxat qilib ko'rsatadi.
 *
 * Ishlatish:
 *   node scripts/fix-menu-targets.mjs            # nima o'zgarishini ko'rsatadi
 *   node scripts/fix-menu-targets.mjs --commit   # yozadi
 */

import { PrismaClient } from '@prisma/client';

const commit = process.argv.includes('--commit');
const prisma = new PrismaClient();

/**
 * Eski importer slugi → kod endi ishlatadigan slug.
 *
 * `skin-care` YUZ parvarishiga aylanadi: importer tasnifi endi yuz va
 * tanani ajratadi, lekin QAYTA NOMLASH bitta qatorni ikkiga bo'la
 * olmaydi. Shuning uchun qayta nomlashdan keyin katalogni qaytadan
 * import qilish kerak — o'shanda tana mahsulotlari o'z joyiga o'tadi.
 */
const CATEGORY_RENAME = {
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

/**
 * Sayt QATTIQ yozib qo'ygan kategoriyalar.
 *
 * Bosh sahifadagi plitkalar, «Vosita tanlagich» va menyu shu
 * slug'larga qaraydi. Ular bazada bo'lmasa — plitka bo'sh sahifaga
 * olib boradi. Shuning uchun yetishmagani YARATILADI: bo'sh
 * kategoriya import qilingach to'ladi, yo'q kategoriya esa hech
 * qachon to'lmaydi.
 */
const REQUIRED_CATEGORIES = [
  { slug: 'soch-parvarishi', nameUz: 'Soch parvarishi', nameRu: 'Уход за волосами' },
  { slug: 'yuz-parvarishi', nameUz: 'Yuz parvarishi', nameRu: 'Уход за лицом' },
  { slug: 'tana-parvarishi', nameUz: 'Tana parvarishi', nameRu: 'Уход за телом' },
  { slug: 'tirnoq', nameUz: 'Tirnoq parvarishi', nameRu: 'Уход за ногтями' },
  { slug: 'makiyaj', nameUz: 'Makiyaj', nameRu: 'Макияж' },
];

const REQUIRED_COLLECTIONS = [
  { slug: 'yangi-kelganlar', nameUz: 'Yangi kelganlar', nameRu: 'Новинки' },
  { slug: 'best-sellers', nameUz: 'Bestsellerlar', nameRu: 'Хиты продаж' },
  { slug: 'sovga-toplamlari', nameUz: 'Sovg‘alar va to‘plamlar', nameRu: 'Подарки и наборы' },
];

const COLLECTION_RENAME = {
  'new-arrivals': 'yangi-kelganlar',
  'editor-choice': 'muharrir-tanlovi',
  'gifts-sets': 'sovga-toplamlari',
};

/**
 * Menyudagi o'lik nishon → uning o'rniga qaysi kategoriya.
 *
 * Hozir bo'sh: tasnif sayt kutgan slug'larga keltirilgandan keyin
 * qaytarish kerak bo'lgan band qolmadi. Ro'yxat o'zi qoldirilgan —
 * kelajakda kategoriya qayta nomlansa shu yerga yoziladi.
 */
const MENU_REPAIR = {
  CATEGORY: {},
  COLLECTION: {},
};

const lines = [];
const say = (s) => {
  lines.push(s);
  console.log(s);
};

async function renameSlugs(model, table, map) {
  let done = 0;
  for (const [from, to] of Object.entries(map)) {
    const old = await model.findFirst({ where: { slug: from } });
    if (!old) continue;
    const taken = await model.findFirst({ where: { slug: to } });
    if (taken) {
      say(`  ! ${table}: «${from}» → «${to}» — «${to}» allaqachon bor, tegilmadi`);
      continue;
    }
    say(`  ${table}: «${from}» → «${to}»`);
    if (commit) await model.update({ where: { id: old.id }, data: { slug: to } });
    done += 1;
  }
  return done;
}

async function ensureRequired() {
  let made = 0;
  for (const [model, table, list] of [
    [prisma.category, 'kategoriya', REQUIRED_CATEGORIES],
    [prisma.collection, 'kolleksiya', REQUIRED_COLLECTIONS],
  ]) {
    for (const row of list) {
      const found = await model.findFirst({ where: { slug: row.slug } });
      if (found) continue;
      say(`  ${table} yaratiladi: «${row.slug}» (${row.nameUz})`);
      if (commit) {
        await model.create({
          data: { slug: row.slug, nameUz: row.nameUz, nameRu: row.nameRu, isActive: true },
        });
      }
      made += 1;
    }
  }
  if (made > 0) {
    say('  Yangi kategoriya BO‘SH keladi — katalogni qaytadan import qiling:');
    say('    npm run migrate:aliver-catalog');
  }
  return made;
}

async function aliveSlugs() {
  const [cats, cols, pages, posts] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true, deletedAt: null }, select: { slug: true } }),
    prisma.collection.findMany({ where: { isActive: true, deletedAt: null }, select: { slug: true } }),
    prisma.page.findMany({ where: { isPublished: true, deletedAt: null }, select: { slug: true } }),
    prisma.blogPost.findMany({ where: { isPublished: true, deletedAt: null }, select: { slug: true } }),
  ]);
  return {
    CATEGORY: new Set(cats.map((r) => r.slug)),
    COLLECTION: new Set(cols.map((r) => r.slug)),
    PAGE: new Set(pages.map((r) => r.slug)),
    BLOG: new Set(posts.map((r) => r.slug)),
  };
}

async function main() {
  say(commit ? 'REJIM: yoziladi (--commit)' : 'REJIM: faqat ko‘rsatadi (--commit yo‘q)');

  say('\nSlug‘larni qayta nomlash:');
  const renamed =
    (await renameSlugs(prisma.category, 'kategoriya', CATEGORY_RENAME)) +
    (await renameSlugs(prisma.collection, 'kolleksiya', COLLECTION_RENAME));
  if (renamed === 0) say('  qayta nomlanadigan slug topilmadi');

  say('\nSayt kutadigan kategoriya va kolleksiyalar:');
  const created = await ensureRequired();
  if (created === 0) say('  hammasi joyida');

  // Qayta nomlashdan KEYINGI holat bo'yicha tekshiriladi: aks holda
  // hozirgina tuzatilgan band yana «o'lik» ko'rinardi.
  const alive = commit ? await aliveSlugs() : applyPending(await aliveSlugs());

  say('\nMenyu bandlari:');
  const items = await prisma.menuItem.findMany({ orderBy: [{ location: 'asc' }, { sortOrder: 'asc' }] });
  let fixed = 0;
  const stuck = [];

  for (const item of items) {
    const set = alive[item.targetType];
    if (!set || !item.targetValue) continue;
    if (set.has(item.targetValue)) continue;

    const repair = MENU_REPAIR[item.targetType]?.[item.targetValue];
    if (repair && set.has(repair.slug)) {
      say(`  ${item.labelUz}: «${item.targetValue}» → «${repair.slug}» (nomi: ${repair.labelUz})`);
      if (commit) {
        await prisma.menuItem.update({
          where: { id: item.id },
          data: { targetValue: repair.slug, labelUz: repair.labelUz, labelRu: repair.labelRu },
        });
      }
      fixed += 1;
      continue;
    }
    stuck.push(`${item.location}/${item.labelUz} → ${item.targetType}:${item.targetValue}`);
  }

  if (fixed === 0) say('  qaytariladigan band topilmadi');
  if (stuck.length > 0) {
    say('\nQO‘LDA HAL QILINADI — nishoni yo‘q va o‘rnini taxmin qilib bo‘lmadi:');
    for (const s of stuck) say(`  · ${s}`);
    say('  Adminka → Menyu bo‘limida nishonni ro‘yxatdan tanlang yoki bandni o‘chiring.');
  } else {
    say('\nBarcha menyu bandlarining nishoni joyida.');
  }

  if (!commit) say('\nHech narsa yozilmadi. Yozish uchun: node scripts/fix-menu-targets.mjs --commit');
}

/** --commit yo'q paytda: qayta nomlash «bo'ladi» deb hisoblanadi. */
function applyPending(alive) {
  for (const [from, to] of Object.entries(CATEGORY_RENAME)) {
    if (alive.CATEGORY.has(from)) alive.CATEGORY.add(to);
  }
  for (const [from, to] of Object.entries(COLLECTION_RENAME)) {
    if (alive.COLLECTION.has(from)) alive.COLLECTION.add(to);
  }
  for (const r of REQUIRED_CATEGORIES) alive.CATEGORY.add(r.slug);
  for (const r of REQUIRED_COLLECTIONS) alive.COLLECTION.add(r.slug);
  return alive;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
