import assert from 'node:assert/strict';

const api = process.env.E2E_API_URL ?? 'http://localhost:4000/api';
const web = process.env.E2E_WEB_URL ?? 'http://localhost:3000';
const admin = process.env.E2E_ADMIN_URL ?? 'http://localhost:3001';

async function request(url, expected = 200, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, expected, `${url}: HTTP ${response.status}`);
  return response;
}

const health = await (await request(`${api}/health`)).json();
assert.equal(health.status, 'ok');
assert.equal(health.database, 'up');
assert.equal(health.redis, 'up');

const categories = await (await request(`${api}/catalog/categories`)).json();
assert.ok(Array.isArray(categories));
await request(`${api}/content/blog`);
await request(`${api}/content/faq`);
await request(`${api}/content/banners?placement=HERO`);
await request(`${web}/uz`);
await request(`${web}/ru/katalog`);
await request(`${web}/robots.txt`);
await request(`${web}/sitemap.xml`);
await request(`${admin}/login`);

console.log('E2E smoke: API, DB, Redis, Web va Admin ishlayapti.');
