/**
 * Menyu nishonlarini tekshirish va tuzatish — QO'LDA.
 *
 * ODATDA BU SKRIPT KERAK EMAS: slug'larni joyiga keltirish har
 * deployda avtomatik bajariladi (`ensure-aliver-catalog.mjs`).
 * Bu yerda u qo'lda tekshirish uchun qoldirilgan — masalan
 * kategoriya adminda o'chirilgan va menyu buzilganini bilish
 * kerak bo'lganda.
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
import {
  CATEGORY_RENAME,
  COLLECTION_RENAME,
  REQUIRED_CATEGORIES,
  REQUIRED_COLLECTIONS,
  ensureCatalogSlugs,
} from './lib/catalog-slugs.mjs';

const commit = process.argv.includes('--commit');
const prisma = new PrismaClient();

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

  say('\nSlug‘lar va sayt kutadigan kategoriyalar:');
  if (commit) {
    const { renamed, created } = await ensureCatalogSlugs(prisma, say);
    if (renamed === 0 && created === 0) say('  hammasi joyida');
    if (created > 0) {
      say('  Yangi kategoriya BO‘SH keladi — katalogni qaytadan import qiling.');
    }
  } else {
    say('  (--commit yo‘q — faqat menyu tekshiriladi)');
  }

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
