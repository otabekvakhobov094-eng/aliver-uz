/**
 * Slug'larni joyiga keltirish — deploy paytida AVTOMATIK ishlaydi,
 * ya'ni xato bo'lsa uni hech kim ko'rmaydi: log Render'da qoladi.
 * Shuning uchun mantiq shu yerda qo'riqlanadi.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureCatalogSlugs } from './lib/catalog-slugs.mjs';

/** Eng sodda soxta Prisma: xotiradagi ikki jadval. */
function fakePrisma(categories = [], collections = []) {
  const table = (rows) => ({
    rows,
    findFirst: async ({ where }) => rows.find((r) => r.slug === where.slug) ?? null,
    update: async ({ where, data }) => {
      const row = rows.find((r) => r.id === where.id);
      Object.assign(row, data);
      return row;
    },
    create: async ({ data }) => {
      const row = { id: `id${rows.length + 1}`, ...data };
      rows.push(row);
      return row;
    },
  });
  const category = table(categories);
  const collection = table(collections);
  return { prisma: { category, collection }, category, collection };
}

const quiet = () => undefined;

test('eski inglizcha slug qayta nomlanadi — qator o‘sha qoladi', async () => {
  const { prisma, category } = fakePrisma([
    { id: 'c1', slug: 'hair-care', nameUz: 'Soch parvarishi' },
  ]);
  const res = await ensureCatalogSlugs(prisma, quiet);

  const row = category.rows.find((r) => r.id === 'c1');
  assert.equal(row.slug, 'soch-parvarishi');
  assert.ok(res.renamed >= 1);
  // ID o'zgarmagani muhim: mahsulot aloqalari shunga bog'langan.
  assert.equal(row.id, 'c1');
});

test('yangi slug allaqachon bo‘lsa TEGILMAYDI — ikki qator birlashib ketmasin', async () => {
  const { prisma, category } = fakePrisma([
    { id: 'c1', slug: 'hair-care', nameUz: 'Eski' },
    { id: 'c2', slug: 'soch-parvarishi', nameUz: 'Yangi' },
  ]);
  await ensureCatalogSlugs(prisma, quiet);

  assert.equal(category.rows.find((r) => r.id === 'c1').slug, 'hair-care');
  assert.equal(category.rows.find((r) => r.id === 'c2').slug, 'soch-parvarishi');
});

test('sayt talab qiladigan kategoriyalar yaratiladi', async () => {
  const { prisma, category, collection } = fakePrisma();
  await ensureCatalogSlugs(prisma, quiet);

  for (const slug of ['soch-parvarishi', 'yuz-parvarishi', 'tana-parvarishi', 'tirnoq', 'makiyaj']) {
    assert.ok(
      category.rows.some((r) => r.slug === slug),
      `«${slug}» yaratilmadi — bosh sahifadagi plitka bo‘sh sahifaga olib boradi`,
    );
  }
  for (const slug of ['yangi-kelganlar', 'best-sellers', 'sovga-toplamlari']) {
    assert.ok(collection.rows.some((r) => r.slug === slug), `«${slug}» yaratilmadi`);
  }
});

test('ikkinchi marta ishlasa hech narsa qilmaydi', async () => {
  const { prisma } = fakePrisma([{ id: 'c1', slug: 'nail', nameUz: 'Tirnoq' }]);
  await ensureCatalogSlugs(prisma, quiet);
  const second = await ensureCatalogSlugs(prisma, quiet);

  assert.equal(second.renamed, 0);
  assert.equal(second.created, 0);
});
