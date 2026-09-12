/**
 * E2E testining O'ZINI tekshirish uchun shartnoma serveri.
 *
 * Bu API o'rniga emas — u CI da haqiqiy API ga qarshi ishlaydi. Bu yerda
 * faqat testning mantig'i tekshiriladi: cookie idishi ishlayaptimi,
 * assertlar to'g'ri joyga qarayaptimi va eng muhimi — tizim NOTO'G'RI
 * ishlaganda test YIQILADIMI.
 *
 * BREAK o'zgaruvchisi bilan bitta xatti-harakat buziladi.
 */
import http from 'node:http';
const BREAK = process.env.BREAK ?? '';

let stock = 10;
let cartItems = [];
let cartCookie = null;
let orders = new Map();      // idempotencyKey -> order
let paid = false;

const VARIANT = 'v-1';
const PRICE = 18900000n;

function json(res, code, data, headers = {}) {
  res.writeHead(code, { 'content-type': 'application/json', ...headers });
  res.end(JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
}
function body(req) {
  return new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => r(d ? JSON.parse(d) : {})); });
}
const cartView = () => ({
  items: cartItems.map((i) => ({ id: 'ci-1', variantId: VARIANT, quantity: i.quantity, lineTotal: (PRICE * BigInt(i.quantity)).toString() })),
  subtotal: cartItems.reduce((a, i) => a + PRICE * BigInt(i.quantity), 0n).toString(),
});

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname.replace(/^\/api/, '');
  const m = req.method;
  const cookies = Object.fromEntries((req.headers.cookie ?? '').split(';').map((c) => c.trim().split('=')).filter((x) => x[0]));

  if (p === '/catalog/products') {
    return json(res, 200, { items: [{ slug: 'batana-moyi' }], total: 1 });
  }
  if (p.startsWith('/catalog/products/')) {
    return json(res, 200, {
      nameUz: 'Batana moyi', slug: 'batana-moyi',
      variants: [{ id: VARIANT, sku: 'ALV-BAT-060', availableStock: stock, price: PRICE.toString() }],
    });
  }

  if (p === '/cart/items' && m === 'POST') {
    const b = await body(req);
    cartItems = [{ quantity: b.quantity }];
    cartCookie = 'tok-1';
    return json(res, 200, cartView(), { 'set-cookie': 'alv_cart=tok-1; Path=/; HttpOnly' });
  }
  if (p === '/cart' && m === 'GET') {
    // Cookie yo'q bo'lsa savat bo'sh — idish ishlamasa test shu yerda yiqiladi.
    if (!cookies.alv_cart) return json(res, 200, { items: [], subtotal: '0' });
    return json(res, 200, cartView());
  }

  if (p === '/delivery/regions') return json(res, 200, [{ id: 'r-1', nameUz: 'Toshkent' }]);
  if (p === '/delivery/quotes') return json(res, 200, [{ code: 'COURIER', price: '2500000', basePrice: '2500000' }]);

  if (p === '/orders' && m === 'POST') {
    const b = await body(req);
    const existing = orders.get(b.idempotencyKey);
    if (existing && BREAK !== 'idempotency') return json(res, 201, existing, { 'set-cookie': 'alv_cart=; Path=/; Max-Age=0' });
    const qty = cartItems[0]?.quantity ?? 0;
    if (BREAK !== 'reserve') stock -= qty;
    const order = { id: 'o-' + orders.size, number: 'ALV-' + (1000 + orders.size), paymentStatus: 'PENDING', contactPhone: '+998 90 *** ** 67' };
    orders.set(b.idempotencyKey + (BREAK === 'idempotency' ? Math.random() : ''), order);
    cartItems = [];
    // Savat cookie si tozalanadi.
    const headers = BREAK === 'cart-cookie' ? {} : { 'set-cookie': 'alv_cart=; Path=/; Max-Age=0' };
    return json(res, 201, order, headers);
  }

  if (p === '/payments/start' && m === 'POST') return json(res, 201, { kind: 'redirect', url: 'https://my.click.uz/x', provider: 'CLICK' });
  if (p.startsWith('/payments/status/')) return json(res, 200, { status: paid ? 'PAID' : 'PENDING' });
  if (p === '/payments/mock/confirm' && m === 'POST') {
    if (BREAK !== 'payment') paid = true;
    for (const o of orders.values()) if (paid) o.paymentStatus = 'PAID';
    return json(res, 201, { status: paid ? 'PAID' : 'PENDING' });
  }

  if (p.endsWith('/public')) {
    const o = [...orders.values()][0];
    return json(res, 200, { ...o, contactPhone: BREAK === 'phone-mask' ? '+998901234567' : '+998 90 *** ** 67' });
  }
  if (p === '/orders/track' && m === 'POST') {
    const b = await body(req);
    const o = [...orders.values()].find((x) => x.number === b.number);
    return o ? json(res, 201, o) : json(res, 404, { message: 'topilmadi' });
  }

  json(res, 404, {});
}).listen(Number(process.env.PORT ?? 4500), () => {
  console.log(`contract server :${process.env.PORT ?? 4500}`);
});
