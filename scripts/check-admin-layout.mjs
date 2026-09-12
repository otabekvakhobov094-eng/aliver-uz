/**
 * Adminka telefonda ekrandan chiqib ketmayotganini tekshiradi.
 *
 * NEGA. Adminka telefondan ham ochiladi — operator va kuryer ko'pincha
 * shunday ishlaydi. Gorizontal siljish esa ko'z bilan deyarli
 * payqalmaydi: ba'zi kengliklarda bor, ba'zilarida yo'q, ba'zan esa
 * faqat MATN uzun bo'lganda paydo bo'ladi. Aynan shunday xato xato
 * ekranining o'zida bor edi: uzun xabar kartochkani cho'zib,
 * «Qayta urinish» tugmasini ekrandan chiqarib yuborardi.
 *
 * Ishlash uchun adminka ishlab turishi kerak (mahalliy yoki stend):
 *   node scripts/check-admin-layout.mjs http://localhost:3100 375
 */
/**
 * Playwright loyiha bog'liqligi EMAS (u og'ir va faqat shu tekshiruvga
 * kerak). Shuning uchun bir nechta joydan qidiriladi: loyiha ichidan,
 * global o'rnatmadan yoki PLAYWRIGHT_MODULE bilan ko'rsatilgan yo'ldan.
 */
async function loadPlaywright() {
  const tries = [
    process.env.PLAYWRIGHT_MODULE,
    'playwright',
    '/usr/local/lib/node_modules_global/playwright/index.js',
    '/usr/lib/node_modules/playwright/index.js',
  ].filter(Boolean);
  for (const spec of tries) {
    try {
      const mod = await import(spec);
      return mod.chromium ?? mod.default?.chromium;
    } catch {
      /* keyingisini sinaymiz */
    }
  }
  console.error('Playwright topilmadi. `npm i -D playwright` yoki PLAYWRIGHT_MODULE=<yo‘l>.');
  process.exit(2);
}

const chromium = await loadPlaywright();

const BASE = process.argv[2] ?? process.env.ADMIN_URL ?? 'http://localhost:3100';
const WIDTHS = process.argv[3] ? [Number(process.argv[3])] : [375, 768, 1280];

const ROUTES = [
  '/login', '/', '/orders', '/payments', '/reconcile', '/fiscal', '/returns',
  '/products', '/brands', '/categories', '/collections', '/inventory', '/import',
  '/uzum', '/customers', '/loyalty', '/reviews', '/b2b', '/discounts', '/gift-cards',
  '/content', '/menu', '/reports', '/notifications', '/settings', '/delivery',
  '/users', '/roles', '/audit',
];

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
let bad = 0;

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height: 812 } });
  const page = await ctx.newPage();
  for (const route of ROUTES) {
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 });
    } catch {
      console.error(`  ${width}px ${route}: ochilmadi`);
      bad += 1;
      continue;
    }
    await page.waitForTimeout(300);
    const res = await page.evaluate((vw) => {
      const de = document.documentElement;
      const over = de.scrollWidth - de.clientWidth;
      if (over <= 1) return { over: 0, blame: [] };
      // Aybdor — o'z ota-onasidan tashqariga chiqqan, aylantiriladigan
      // idish ichida BO'LMAGAN element. Jadval `overflow-x: auto`
      // ichida kengroq bo'lishi mumkin va bu xato emas.
      const blame = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= vw + 1) continue;
        if (getComputedStyle(el).position === 'fixed') continue;
        let scrollable = false;
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') { scrollable = true; break; }
        }
        if (scrollable) continue;
        blame.push(`${el.tagName.toLowerCase()}.${String(el.className || '').split(' ')[0]} o‘ng=${Math.round(r.right)} kenglik=${Math.round(r.width)}`);
        if (blame.length >= 3) break;
      }
      return { over, blame };
    }, width);
    if (res.over > 1) {
      bad += 1;
      console.error(`  ${width}px ${route}: ${res.over}px o‘ngga siljigan`);
      for (const b of res.blame) console.error(`      ${b}`);
    }
  }
  await ctx.close();
}
await browser.close();

if (bad === 0) {
  console.log(`Adminka ${WIDTHS.join(', ')} px da ekrandan chiqmaydi.`);
  process.exit(0);
}
console.error(`Adminkada ${bad} ta sahifa ekrandan chiqib ketgan.`);
process.exit(1);
