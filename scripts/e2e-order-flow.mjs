/**
 * Buyurtma oqimining to'liq E2E testi.
 *
 * Bu loyihadagi eng muhim tekshirilmagan yo'l edi. Avvalgi
 * `e2e-smoke.mjs` faqat sahifalar 200 qaytarishini tekshirardi — ya'ni
 * savat, ombor rezervi, to'lov va fiskal chek umuman sinalmasdi. Ular
 * esa aynan pul bilan bog'liq qism.
 *
 * Test HAQIQIY bazaga qarshi ishlaydi (CI da seed qilingan baza).
 * Mock emas: mock bu yerda foydasiz, chunki tekshirilayotgan narsa
 * modullar orasidagi bog'lanish.
 *
 * Ishga tushirish:
 *   E2E_API_URL=http://localhost:4000/api node scripts/e2e-order-flow.mjs
 */

import assert from 'node:assert/strict';

const api = process.env.E2E_API_URL ?? 'http://localhost:4000/api';

/* ------------------------------------------------------------------ *
 * Cookie idishi.
 *
 * Savat cookie orqali ishlaydi (`alv_cart`), Node'ning `fetch` i esa
 * cookie saqlamaydi. Brauzerni taqlid qilmasdan savatni sinab
 * bo'lmaydi, shuning uchun eng oddiy idish.
 * ------------------------------------------------------------------ */
const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function storeCookies(res) {
  // `getSetCookie` Node 20+ da bor; bo'lmasa bitta sarlavha bilan ham ishlaydi.
  const list = res.headers.getSetCookie?.() ?? [res.headers.get('set-cookie')].filter(Boolean);
  for (const raw of list) {
    const [pair] = raw.split(';');
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    // Bo'sh qiymat — o'chirish (`clearCookie`). Buyurtmadan keyin savat
    // aynan shunday tozalanadi va test buni ham tekshiradi.
    if (value === '') jar.delete(name);
    else jar.set(name, value);
  }
}

async function call(path, { method = 'GET', body, expect: expected = 200 } = {}) {
  const res = await fetch(`${api}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(jar.size > 0 ? { Cookie: cookieHeader() } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  storeCookies(res);

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  assert.equal(
    res.status,
    expected,
    `${method} ${path} → HTTP ${res.status} (kutilgan ${expected}): ${text.slice(0, 300)}`,
  );
  return data;
}

let step = 0;
function ok(message) {
  step += 1;
  console.log(`  ${String(step).padStart(2, ' ')}. ✓ ${message}`);
}

/* ================================================================== */

console.log('\nBuyurtma oqimi — savatdan chekgacha\n');

/* ---------------------------- 1. Mahsulot --------------------------- */

const list = await call('/catalog/products?perPage=50');
assert.ok(Array.isArray(list.items) && list.items.length > 0, 'Katalog bo‘sh — avval seed kerak');

// Qoldig'i yetarli mahsulot kerak: 2 dona buyurtma qilamiz va rezerv
// haqiqatan kamayganini ko'rish uchun zaxira qolishi lozim.
let product = null;
let variant = null;
for (const card of list.items) {
  const detail = await call(`/catalog/products/${card.slug}`);
  const found = (detail.variants ?? []).find((v) => Number(v.availableStock ?? 0) >= 3);
  if (found) {
    product = detail;
    variant = found;
    break;
  }
}
assert.ok(variant, 'Qoldig‘i 3 dan ko‘p variant topilmadi — seed ma’lumotini tekshiring');
const stockBefore = Number(variant.availableStock);
ok(`mahsulot tanlandi: ${product.nameUz} / ${variant.sku}, qoldiq ${stockBefore}`);

/* ----------------------------- 2. Savat ----------------------------- */

const QTY = 2;
const afterAdd = await call('/cart/items', {
  method: 'POST',
  body: { variantId: variant.id, quantity: QTY },
});
assert.equal(afterAdd.items.length, 1, 'Savatda bitta pozitsiya bo‘lishi kerak');
assert.equal(afterAdd.items[0].quantity, QTY);
assert.ok(jar.has('alv_cart'), 'Savat cookie si o‘rnatilmadi');
ok(`savatga ${QTY} dona qo‘shildi, cookie o‘rnatildi`);

// Savat cookie orqali saqlanadimi — alohida so'rovda ham o'sha savat.
const reread = await call('/cart');
assert.equal(reread.items.length, 1, 'Savat cookie orqali saqlanmadi');
const subtotal = BigInt(reread.subtotal ?? reread.itemsTotal ?? '0');
assert.ok(subtotal > 0n, 'Savat summasi nol');
// Summa satrlar bo'yicha to'g'ri yig'ilganmi.
const lineSum = reread.items.reduce((acc, i) => acc + BigInt(i.lineTotal), 0n);
assert.equal(lineSum, subtotal, 'Savat summasi satrlar yig‘indisiga teng emas');
ok(`savat qayta o‘qildi, summa satrlarga mos: ${subtotal} tiyin`);

/* --------------------------- 3. Yetkazish --------------------------- */

const regions = await call('/delivery/regions');
const region = regions[0];
assert.ok(region?.id, 'Viloyat ro‘yxati bo‘sh');

const quotes = await call(
  `/delivery/quotes?regionId=${region.id}&subtotal=${subtotal.toString()}`,
);
assert.ok(Array.isArray(quotes) && quotes.length > 0, 'Yetkazish varianti yo‘q');
const method = quotes[0];
ok(`yetkazish: ${region.nameUz ?? region.name} — ${method.code}, ${method.price} tiyin`);

/* --------------------------- 4. Buyurtma ---------------------------- */

const idempotencyKey = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const orderBody = {
  phone: '+998901234567',
  firstName: 'E2E',
  lastName: 'Test',
  regionId: region.id,
  addressLine: 'Amir Temur ko‘chasi 84-uy, 12-xonadon',
  deliveryMethodCode: method.code,
  // CLICK tanlanadi, naqd emas: naqd SMS kod so'raydi va bu boshqa oqim.
  paymentProvider: 'CLICK',
  acceptOffer: true,
  idempotencyKey,
};

const order = await call('/orders', { method: 'POST', body: orderBody, expect: 201 });
assert.ok(order.id, 'Buyurtma id qaytmadi');
assert.ok(order.number, 'Buyurtma raqami qaytmadi');
ok(`buyurtma yaratildi: ${order.number}`);

// Savat cookie si tozalandimi — aks holda mijoz eski savat bilan qoladi.
assert.ok(!jar.has('alv_cart'), 'Buyurtmadan keyin savat cookie si tozalanmadi');
ok('savat cookie si tozalandi');

/* ------------------------- 5. Ombor rezervi ------------------------- */

const afterOrder = await call(`/catalog/products/${product.slug}`);
const variantAfter = afterOrder.variants.find((v) => v.id === variant.id);
const stockAfter = Number(variantAfter.availableStock);
assert.equal(
  stockAfter,
  stockBefore - QTY,
  `Rezerv qilinmadi: oldin ${stockBefore}, keyin ${stockAfter}, kutilgan ${stockBefore - QTY}`,
);
ok(`ombor rezervi ishladi: ${stockBefore} → ${stockAfter}`);

/* -------------------------- 6. Idempotentlik ------------------------ */

// Mijoz «Buyurtma berish» ni ikki marta bossa yoki tarmoq uzilib qayta
// yuborsa, ikkinchi buyurtma YARATILMASLIGI va ombor IKKINCHI marta
// rezerv qilinmasligi kerak.
const repeat = await call('/orders', { method: 'POST', body: orderBody, expect: 201 });
assert.equal(repeat.id, order.id, 'IdempotencyKey bir xil bo‘lsa ham yangi buyurtma yaratildi');

const afterRepeat = await call(`/catalog/products/${product.slug}`);
const stockAfterRepeat = Number(afterRepeat.variants.find((v) => v.id === variant.id).availableStock);
assert.equal(stockAfterRepeat, stockAfter, 'Takroriy so‘rov omborni ikkinchi marta kamaytirdi');
ok('takroriy so‘rov yangi buyurtma yaratmadi va omborga tegmadi');

/* ---------------------------- 7. To'lov ----------------------------- */

const start = await call('/payments/start', {
  method: 'POST',
  body: { orderId: order.id, provider: 'CLICK' },
  expect: 201,
});
assert.ok(start.provider === 'CLICK', 'To‘lov provayderi noto‘g‘ri');
ok(`to‘lovga o‘tish havolasi olindi (${start.kind ?? 'link'})`);

const beforePay = await call(`/payments/status/${order.id}`);
assert.notEqual(beforePay.status, 'PAID', 'To‘lovdan oldin holat PAID bo‘lib turibdi');

const confirmed = await call('/payments/mock/confirm', {
  method: 'POST',
  body: { orderId: order.id, outcome: 'PAID' },
  expect: 201,
});
assert.equal(confirmed.status, 'PAID', `To‘lov tasdiqlanmadi: ${JSON.stringify(confirmed)}`);
ok('to‘lov tasdiqlandi va holat PAID ga o‘tdi');

/* ------------------------ 8. Buyurtma holati ------------------------ */

const publicView = await call(`/orders/${order.id}/public`);
assert.equal(publicView.paymentStatus, 'PAID', 'Buyurtmada to‘lov holati yangilanmadi');
// Telefon maskalangan bo'lishi kerak: bu sahifa havola bilan ochiladi.
assert.ok(
  !publicView.contactPhone?.includes('1234567'),
  'Ochiq sahifada telefon to‘liq ko‘rinyapti',
);
ok('ochiq sahifada to‘lov PAID, telefon maskalangan');

/* ------------------------- 9. Kuzatuv oynasi ------------------------ */

const tracked = await call('/orders/track', {
  method: 'POST',
  body: { number: order.number, phone: orderBody.phone },
  expect: 201,
});
assert.equal(tracked.number, order.number, 'Kuzatuv buyurtmani topmadi');
ok('buyurtma raqam va telefon orqali topildi');

/* --------------------- 10. Bo'sh savat tekshiruvi -------------------- */

// Buyurtmadan keyin yangi savat bo'sh bo'lishi kerak.
const freshCart = await call('/cart');
assert.equal(freshCart.items.length, 0, 'Buyurtmadan keyin savat bo‘shamadi');
ok('buyurtmadan keyin savat bo‘sh');

console.log(`\nE2E buyurtma oqimi: ${step} ta tekshiruv o‘tdi.\n`);
