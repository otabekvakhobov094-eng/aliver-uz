/**
 * Sahifa ekrandan CHIQIB KETMAYOTGANINI tekshiradi.
 *
 * NEGA. «Bo'limlar chetga o'tib qolgan, tugmalar bir tekisda emas» —
 * bu shikoyatning sababi har doim bitta sinf xato: biror element o'z
 * ustunidan kengroq bo'lib qoladi (flex elementida `min-width: 0`
 * yo'q, `position: fixed` element `scale` bilan chegaradan chiqadi,
 * uzun matn qisqara olmaydi). Ko'z bilan buni faqat tasodifan
 * payqaysan, chunki u ba'zi kengliklarda ko'rinadi, ba'zilarida yo'q.
 *
 * Shuning uchun tekshiruv MASHINA ishi: sahifalar bir nechta kenglikda
 * ochiladi va gorizontal aylantirish paydo bo'lsa, aybdor element
 * nomma-nom ko'rsatiladi.
 *
 * Ishlatish:  node scripts/check-layout-overflow.mjs [asosiy-manzil]
 * Sukut bo'yicha http://localhost:3000
 */

import { chromium } from 'playwright';

const BASE = process.argv[2] ?? process.env.WEB_URL ?? 'http://localhost:3000';

/** Tekshiriladigan sahifalar — har bir asosiy bo'limdan bittadan. */
const PAGES = [
  '/uz',
  '/uz/katalog',
  '/uz/katalog?collection=yangi-kelganlar',
  '/uz/kategoriyalar',
  '/uz/savollar',
  '/uz/yetkazish',
  '/uz/aloqa',
  '/uz/biz-haqimizda',
  '/uz/hamkorlik',
  '/uz/blog',
  '/uz/savat',
  '/uz/checkout',
  '/uz/kabinet',
  '/uz/kuzatuv',
  '/uz/tanlagich',
  '/uz/qidiruv',
  '/ru/katalog',
  '/ru',
  '/ru/savollar',
];

/** Eng qiyin kengliklar: eski telefon, oddiy telefon, planshet, noutbuk. */
const WIDTHS = [320, 390, 768, 1280];

const problems = [];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });

  /*
   * Tashqi so'rovlar bloklanadi (shriftlar, analitika). Ular tekshiruvga
   * aloqasi yo'q, lekin tarmoqqa chiqa olmaydigan muhitda har biri
   * o'ttiz soniya kutib turadi va tekshiruv umuman tugamaydi.
   */
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE) || url.startsWith('data:')) return route.continue();
    return route.abort();
  });

  /*
   * Kirish animatsiyasi o'tkazib yuboriladi. Uni 2.6 soniya kutish
   * tekshiruvni har bir sahifada sekinlashtirardi; qoplama esa
   * `sessionStorage` belgisi bilan umuman chizilmaydi — bu saytning
   * o'z mexanizmi, tekshiruv uchun yasalgan orqa eshik emas.
   */
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('alv.intro', '1');
    } catch {
      /* maxfiy oyna */
    }
  });
  for (const path of PAGES) {
    try {
      const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      if (res && res.status() >= 400) {
        problems.push(`${path} @${width}px — sahifa ${res.status()} qaytardi`);
        continue;
      }
    } catch {
      problems.push(`${path} @${width}px — ochilmadi`);
      continue;
    }
    // Joylashuv o'rnashsin.
    await page.waitForTimeout(350);

    const found = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth <= docWidth + 1) return null;

      // Aybdor — chegaradan chiqqan, LEKIN otasi uni kesib
      // turmagan element. Kesilgan element aylantirish yaratmaydi.
      const clipped = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const o = getComputedStyle(p);
          if (o.overflowX !== 'visible' && o.overflowX !== '') return true;
        }
        return false;
      };

      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right <= docWidth + 1 && r.left >= -1) continue;
        if (clipped(el)) continue;
        out.push(
          `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 70)}"> ` +
            `chap=${Math.round(r.left)} o'ng=${Math.round(r.right)}`,
        );
        if (out.length >= 4) break;
      }
      return { docWidth, scrollWidth: document.documentElement.scrollWidth, out };
    });

    if (found) {
      problems.push(
        `${path} @${width}px — sahifa ${found.scrollWidth - found.docWidth}px ga chetga chiqqan:\n` +
          found.out.map((o) => `      ${o}`).join('\n'),
      );
    }
  }
  await page.close();
}

await browser.close();

if (problems.length > 0) {
  console.error(`\nGorizontal toshish: ${problems.length} ta holat\n`);
  for (const p of problems) console.error('  ' + p);
  console.error('');
  process.exit(1);
}

console.log(
  `Toshish yo'q: ${PAGES.length} ta sahifa × ${WIDTHS.length} ta kenglik tekshirildi.`,
);
