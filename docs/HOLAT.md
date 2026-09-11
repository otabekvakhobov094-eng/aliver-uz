# Loyiha holati va keyingi qadamlar

> Oxirgi yangilanish: 2026-09-11, commit `b2f4b48`.
> Bu hujjat har bir ish bo'lagidan keyin yangilanadi.

---

## 1. Nega chalkashlik chiqdi: ikkita raqamlash bor

Loyihada **ikki xil** raqamlash ishlatilgan va ular bir-biriga mos emas.
"Qaysi etapdamiz?" degan savol shundan kelib chiqadi.

| | Nima | Diapazon | Holati |
|---|---|---|---|
| **ETAP** | Asosiy ishlab chiqish yo'l xaritasi: poydevor → katalog → savdo → to'lov → yetkazish → qaytarish → kontent → reliz | 1–8 | **Kod qismi yakunlangan** |
| **BOSQICH** | Deploydan keyingi sayqallash rejasi: katalog to'ldirish, matnlar, mobil, savdo oqimini sinash | 1–5 | 1–4 bajarilgan, **5 boshlanmagan** |

Ya'ni: **8 ta ETAP ning kodi yozilgan**, hozir esa **5-BOSQICH** —
haqiqiy saytda savdo oqimini sinash va tuzatish — navbatda turibdi.

---

## 2. Nima haqiqatan tayyor

Quyidagilar **men o'zim tekshirganim** asosida (kod o'qildi, testlar
ishga tushirildi, ilovalar qurildi):

| Qism | Holat | Izoh |
|---|---|---|
| Auth, RBAC, audit log | ✅ | Telefon + OTP, admin email/parol + 2FA |
| Katalog, media, Excel import | ✅ | Qidiruv lotin/kirill bir xil ishlaydi |
| Savat, checkout, buyurtma, ombor rezervi | ✅ | Atomar rezerv, idempotentlik |
| To'lov (Click, Payme, COD) | ⚠️ **maket** | Kod tayyor, merchant kalitlari yo'q |
| Fiskal chek (OFD) | ⚠️ **maket** | Kod tayyor, provayder shartnomasi yo'q |
| Yetkazish, jo'natma, SMS/Telegram | ⚠️ **maket** | SMS provayderi ulanmagan |
| Qaytarish, mijoz kabineti | ✅ | |
| Kontent: sahifa, blog, banner, FAQ, redirect | ✅ | Admin panelda boshqariladi |
| B2B va bog'lanish formalari | ✅ | |
| SEO: robots, sitemap | ✅ | `apps/web/src/app/robots.ts`, `sitemap.ts` |
| Cookie roziligi va analitika | ✅ | Skriptlar faqat rozilikdan keyin |
| **Admin login** | ✅ **endi tuzatildi** | Pastga qarang |
| Dizayn: 3D hero, animatsiya, mahsulot surati | ✅ **yangi** | |

**Testlar:** API 337 ta, admin 8 ta, UI 4 ta — hammasi o'tadi.
Web, admin va API production build xatosiz.

### Reliz vositalari (kodda bor, lekin men sinamaganman)

Bular repoda mavjud, ammo ularni ishlatish uchun jonli server va
haqiqiy kalitlar kerak — shuning uchun **ishlashini tasdiqlay olmayman**:

- `npm run test:e2e` — API + PostgreSQL + Redis + Web + Admin smoke testi
- `npm run test:load` — yuklama testi (p95, xato foizi mezonlari bilan)
- `npm run migrate:legacy` — eski ma'lumotlarni ko'chirish (dry-run → commit → rollback)
- `npm run release:check` — reliz oldidan tekshiruv
- `scripts/backup-postgres.sh`, `restore-postgres.sh`
- `infra/docker-compose.prod.yml`, `nginx.prod.conf`
- [`RELEASE_CHECKLIST.md`](../RELEASE_CHECKLIST.md)

---

## 3. Hozir qayerda to'xtadik

### 3.1. Tayyor, lekin GitHub'ga YUBORILMAGAN

Ikkita commit lokal tayyor, push esa bloklangan:

```
b2f4b48  Dizayn: harakat tizimi, WebGL hero, ALIVER mahsulot surati
531c1dd  Admin login: API ni bir domendan uzatish
```

**Sabab:** repo bu ish sessiyasining ruxsat etilgan manbalarida yo'q.
**Kim hal qiladi:** siz — sessiya sozlamalarida
`otabekvakhobov094-eng/aliver-uz` ni manba sifatida qo'shing.
**Vaqtinchalik yo'l:** yuborilgan `aliver-2-commits.patch` faylini
`git am` bilan qo'llash.

### 3.2. Admin login — nima bo'lgan edi

Login 200 qaytarardi, panel ochilib darhol yopilardi, xato ko'rinmasdi.
Sabab **ikkita** edi va ikkalasi ham jimgina ishlaydi — server cookie
yuboradi, brauzer rad etadi, hech kim xabar topmaydi:

1. `COOKIE_DOMAIN` standart qiymati `localhost` edi. Render'da u
   o'rnatilmagani uchun `…onrender.com` javobida `Domain=localhost`
   ketardi va brauzer cookie ni butunlay tashlardi.
2. Admin va API turli subdomenlarda — brauzer uchun turli saytlar.
   Repodagi `SameSite=None` tuzatishi shuning uchun yordam bermadi:
   u cookie ni uchinchi tomon cookie siga aylantiradi, Safari esa uni
   doim bloklaydi. `.onrender.com` Public Suffix List da, ya'ni
   umumiy domen orqali hal qilib ham bo'lmaydi.

**Yechim:** brauzer endi API ga to'g'ridan-to'g'ri bormaydi — o'z
domenidagi `/api` ga so'rov yuboradi va Next.js uni serverda uzatadi.
Cookie birinchi tomon cookie si bo'ladi.

**Yo'l-yo'lakay topilgan ikkinchi nosozlik:** `trust proxy` yo'q edi,
ya'ni `req.ip` hamma uchun bir xil. Bitta odam bog'lanish formasini 5
marta yuborsa, **butun sayt uchun** soatlik limit tugardi.

### 3.3. Deploydan keyin DARHOL tekshirilishi kerak

1. Admin panelga kirish (login tuzatishi ishladimi).
2. Noto'g'ri parol kiritib ko'ring — endi "Email yoki parol noto'g'ri"
   deb yozishi kerak, jimgina qaytarmasligi.
3. Bosh sahifa: hero surati va animatsiya.
4. Telefonda bosh sahifa — matn kesilmasligi kerak.

---

## 4. Keyingi qadamlar — tartib bilan

### 5-BOSQICH: savdo oqimini sinash va tuzatish ← **navbatdagi ish**

Sotib olish yo'lini boshidan oxirigacha sinash va topilgan nosozliklarni
tuzatish. Chiroyli dizayn buzuq savatni qutqarmaydi, shuning uchun bu
keyingi dizayn ishidan oldin turadi.

- [ ] Qidiruv: lotin/kirill, imlo xatosi, bo'sh natija
- [ ] Filtr va saralash: narx oralig'i, kategoriya, qoldiq, chegirma
- [ ] Savat: miqdor, qoldiqdan oshib ketish, kupon, narx yangilanishi
- [ ] Checkout: manzil, yetkazish narxi, to'lov usuli, OTP
- [ ] Buyurtma: rezerv, holat, kuzatuv sahifasi
- [ ] Mobil telefonda butun yo'l

### Keyin: dizaynni davom ettirish

Hozir faqat **bosh sahifa** yangilandi. Qolgan sahifalar eski
ko'rinishda:

- [ ] Katalog va mahsulot sahifasi
- [ ] Savat va checkout
- [ ] Kabinet
- [ ] Kategoriyalar, blog, FAQ

### Keyin: reliz

- [ ] Stage-8 vositalarini haqiqiy serverda sinash
- [ ] Zaxira nusxa tartibini yo'lga qo'yish
- [ ] Production muhitini tayyorlash

---

## 5. Bizga bog'liq bo'lmagan to'siqlar

Bu bandlarsiz sayt **haqiqiy savdo qila olmaydi**. Kod tayyor, faqat
ma'lumot kutilmoqda:

| № | Nima kerak | Kim beradi | Nimani to'sib turibdi |
|---|---|---|---|
| 1 | OFD shartnomasi va tokeni | Buxgalter | Fiskal cheksiz savdo — qonunbuzarlik |
| 2 | Click merchant kalitlari | Moliya | Onlayn to'lov |
| 3 | Payme merchant kalitlari | Moliya | Onlayn to'lov |
| 4 | eSKIZ / Play Mobile shartnomasi | Marketing | SMS: OTP va buyurtma xabarlari |
| 5 | Ommaviy oferta va maxfiylik matni | Yurist | Yuridik sahifalar nashr qilinmaydi |
| 6 | Mahsulotlar uchun IKPU kodlari | Buxgalter | IKPU siz mahsulot import qilinmaydi |
| 7 | STIR, yuridik nom, manzil | Buxgalter | Chek va footer rekvizitlari |
| 8 | Rasmiy logotip fayli (SVG/PNG) | Marketing | Hozir matnli logo ishlatilmoqda |

> 1–4-bandlar kelmaguncha `PAYMENTS_MODE`, `OFD_PROVIDER` va
> `SMS_PROVIDER` **maket** rejimida qoladi. Kalitlar kelganda kodga
> tegilmaydi — faqat muhit o'zgaruvchilari almashtiriladi.

---

## 6. Xavfsizlik: staging hozir ochiq

`render.yaml` da API uchun `APP_ENV=development` turibdi. Bu maket
rejimini yoqish uchun qilingan, lekin ikkita natijasi bor:

1. `/api/docs` (Swagger) ommaga ochiq.
2. `/api/payments/mock/confirm` ochiq — buyurtma id sini bilgan **har
   kim** uni "to'langan" deb belgilay oladi.

Staging manzili ochiq internetda turganda bu xavfli. Ikki yo'l:

- staging'ni parol yoki IP cheklovi bilan yopish, yoki
- `APP_ENV=staging` qilib, Click/Payme **sandbox** kalitlarini kiritish.

Haqiqiy mijozlarga ko'rsatishdan **oldin** hal qilinishi kerak.

---

## 7. Muhit

| Xizmat | Manzil |
|---|---|
| Web | `https://aliver-uz-web-stage.onrender.com` |
| Admin | `https://aliver-uz-admin-stage.onrender.com` |
| API | `https://aliver-uz-api-stage.onrender.com` |
| Repo | `github.com/otabekvakhobov094-eng/aliver-uz` |

Deploy: GitHub `main` ga push → Render avtomatik quradi.

> `NEXT_PUBLIC_*` va `API_ORIGIN` qiymatlari **qurilish paytida**
> paketga kiradi. Ularni o'zgartirgandan keyin "Deploy latest commit"
> emas, to'liq qayta qurish kerak.
