# ALIVER.UZ

ALIVER mahsulotlarining O'zbekistondagi rasmiy onlayn do'koni — mustaqil e-commerce platforma.
Shopify, WooCommerce yoki boshqa tayyor CMS ustiga qurilmagan (TZ 119-bo'lim).

**Joriy holat: 7-etap (kontent, SEO va analitika) yakunlandi.**

> To‘lov (Click, Payme), fiskal chek, SMS va Telegram MAKET rejimida ishlaydi:
> kod to‘liq yozilgan va sinovdan o‘tgan, kalitlar kelganda `.env` dagi bir
> nechta qator o‘zgaradi. Batafsil: «Provayder kalitlari kelganda» bo‘limi.

---

## Nima qilingan

| Qism | Holat |
|---|---|
| Monorepo, muhitlar, CI/CD | ✅ |
| Ma'lumotlar bazasi sxemasi (58 model, 25 enum) | ✅ |
| Telefon + OTP autentifikatsiyasi, rate limit siyosati | ✅ |
| Admin kirishi: email + parol + 2FA | ✅ |
| Rollar va huquqlar (8 rol, 126 huquq) | ✅ |
| Audit log | ✅ |
| Dizayn tizimi (`@aliver/ui`) | ✅ |
| Web va admin ilovalari skeleti | ✅ |
| **Katalog: mahsulot, variant, kategoriya, kolleksiya** | ✅ |
| **Qidiruv — lotin va kirill bir xil ishlaydi** | ✅ |
| **Media: 4 o'lcham, WebP + AVIF** | ✅ |
| **Excel/CSV import: preview + 3 rejim** | ✅ |
| **Sayt: bosh sahifa, katalog, mahsulot, qidiruv** | ✅ |
| **Savat — narxsiz, har doim jonli narx** | ✅ |
| **Chegirma dvigateli: ustuvorlik, birikish, umumiy chegara** | ✅ |
| **Yetkazib berish: hudud narxi, bepul chegara, ekspress cheklovi** | ✅ |
| **Checkout va buyurtma: nusxa, atomar rezerv, idempotentlik** | ✅ |
| **Rezerv muddati (TTL) va avtomatik bekor qilish** | ✅ |
| **Kuzatuv sahifasi (raqam + telefon, rate limit bilan)** | ✅ |
| **Admin: buyurtmalar, kartochka, holat mashinasi, ombor** | ✅ |
| **To'lov yadrosi: shlyuz interfeysi, holat mashinasi, idempotentlik** | ✅ |
| **Click: Prepare/Complete, MD5 imzo** | ✅ maket |
| **Payme: JSON-RPC merchant API, 6 metod** | ✅ maket |
| **Naqd to'lov: yetkazilganda yopiladi** | ✅ |
| **Qaytarish: to'liq va qisman** | ✅ |
| **Fiskal chek: navbat, qayta urinish, sotuv va qaytarish cheki** | ✅ maket |
| **To'lovlarni moslashtirish + CSV eksport** | ✅ |
| **Yetkazish boshqaruvi: hududlar, usullar, narx matritsasi** | ✅ |
| **Jo'natmalar: kuryer, trek raqami, varaqa** | ✅ |
| **Bildirishnomalar: SMS va Telegram, navbat, jim soatlar** | ✅ maket |
| **Audit log: filtr va farqlarni ko'rsatish** | ✅ |
| **Admin buyurtma oynasi: jo'natma, xabarlar, guruh amallari** | ✅ |
| **Qaytarish: muddat, hisob, omborga qaytarish, pul qaytarish** | ✅ |
| **Mijoz kabineti: profil, manzillar, sevimlilar, roziliklar** | ✅ |
| **Admin: qaytarishlar va mijozlar oynasi** | ✅ |
| Kontent API: sahifa, blog, banner, FAQ, redirect | ✅ |
| SEO: metadata, Product/BlogPosting structured data, sitemap, robots | ✅ |
| Cookie consent va rozilikdan keyingi GA4/Meta yuklanishi | ✅ |
| Admin CMS umumiy oynasi | ✅ |
| Admin CMS: yaratish, tahrirlash, nashr va o‘chirish formalari | ✅ |
| B2B ariza va lid workflow | ✅ |
| Savdo, top mahsulot va UTM hisobotlari | ✅ |
| GTM va TikTok Pixel (faqat rozilikdan keyin) | ✅ |
| Dinamik redirect middleware | ✅ |
| Telegram bot orqali mijozni ulash | ✅ |

Testlar: **335 ta, hammasi o‘tadi** (`npm run test`).

---

## Tez boshlash

Talab: Node.js 20.11+, Docker, npm 10+.

```bash
git clone <repo> aliver-uz && cd aliver-uz
cp .env.example .env

npm install              # postinstall Prisma clientni generatsiya qiladi
npm run infra:up          # Postgres, Redis, MinIO, Mailpit
npm run db:migrate        # migratsiyalar
npm run db:seed           # rollar, huquqlar, hududlar, super admin

npm run dev               # API :4000, web :3000, admin :3001
```

Tekshirish:

- API: <http://localhost:4000/api/health>
- Swagger: <http://localhost:4000/api/docs>
- Sayt: <http://localhost:3000>
- Admin: <http://localhost:3001/login> (`.env` dagi `SEED_SUPERADMIN_*`)

Development rejimida SMS yuborilmaydi: `OTP_DEV_FIXED_CODE` (standart `11111`) har doim
qabul qilinadi. Bu o'zgaruvchi productionda bo'lsa, ilova ishga tushmaydi.

---

## Tuzilma

```
aliver-uz/
├─ apps/
│  ├─ api/            NestJS — REST API, Prisma sxemasi, migratsiyalar
│  ├─ web/            Next.js — mijoz sayti (UZ/RU)
│  └─ admin/          Next.js — admin panel
├─ packages/
│  ├─ ui/             dizayn tizimi: tokenlar va komponentlar
│  └─ types/          frontend ↔ backend umumiy tiplar
├─ infra/             docker-compose (Postgres, Redis, MinIO, Mailpit)
└─ .github/workflows/ CI: lint, typecheck, test, build
```

Frontend va backend faqat API orqali bog'lanadi (TZ 119): kelajakda mobil ilova,
Telegram bot yoki ombor ilovasi shu API bilan ishlaydi.

---

## Loyihaning asosiy qoidalari

Bular ekspertiza xulosasidan kelib chiqadi va **muhokamasiz bajariladi** — chunki
ularning har biri keyinchalik qayta yozishga majbur qiladigan xatolarni oldini oladi.

### 1. Pul — har doim tiyinda, BigInt

`Float` yoki `Decimal` ishlatilmaydi. Barcha yordamchi funksiyalar
`apps/api/src/common/money.ts` da; chegirmani pozitsiyalar bo'yicha taqsimlash
(`allocateDiscount`) yig'indi aynan teng chiqishini kafolatlaydi — bu qisman
qaytarishda majburiy.

### 2. Buyurtma — o'zgarmas nusxa

`OrderItem` da mahsulot nomi, narxi, chegirmasi, QQS i va IKPU kodi buyurtma
paytidagi holatda saqlanadi. Mahsulot jadvaliga jonli havola qilinmaydi:
admin narxni o'zgartirganda o'tgan buyurtmalar va hisobotlar o'zgarmaydi.

### 3. Ombor faqat harakat orqali o'zgaradi

Har bir qoldiq o'zgarishi `InventoryMovement` ga sabab bilan yoziladi
(`ORDER_RESERVE`, `RETURN_IN`, `ADJUSTMENT`, …). Rezerv `StockReservation` da
muddat (`expiresAt`) bilan turadi — to'lanmagan buyurtma rezervi 30 daqiqadan
so'ng avtomatik bo'shaydi.

### 4. Holat mashinasi kod darajasida

`apps/api/src/common/state-machine/order-state-machine.ts` ruxsat etilgan
o'tishlarni belgilaydi. Ruxsatsiz o'tish istisno bilan to'xtatiladi va
HTTP 409 qaytaradi. Sxemadagi enumlar bilan moslik test bilan ushlab turiladi.

### 5. Har bir mahsulotda IKPU va QQS bor

`Product.ikpuCode`, `Product.vatRate`, `Product.unitCode` — majburiy maydonlar.
Ularsiz fiskal chek yuborib bo'lmaydi, chek esa O'zbekistonda majburiy.

### 6. Muhim harakat — audit logda

`@Audit('products', 'update')` dekoratori before/after qiymatlari bilan yozadi.
Parollar, kod hashlari va token hashlari logga hech qachon tushmaydi.

### 7. OTP himoyasi — o'lchanadigan

Qayta yuborish oralig'i 60 s, kod muddati 5 daqiqa, bir raqamga sutkasiga 5 SMS,
IP bo'yicha soatiga 20 so'rov, 5 ta noto'g'ri urinishdan keyin kod bekor.
Barcha qiymatlar `.env` dan boshqariladi.

### 8. Qidiruv lotin va kirill uchun bitta

Har bir mahsulotda `searchText` — oldindan normallashtirilgan matn: kirill
lotinga o'girilgan, apostroflar olib tashlangan, SKU, barcode, teg va tarkib
qo'shilgan. Shuning uchun «шампунь», «shampun» va «shampun'» bir xil natija
beradi. Aniq moslik topilmasa, `pg_trgm` orqali imlo xatosiga chidamli
qidiruv ishlaydi.

### 9. Kategoriya — maksimal 3 daraja

TZ «cheksiz ierarxiya» deydi, lekin cheksiz chuqurlikda URL, breadcrumb va
filtr boshqarib bo'lmas holga keladi. To'rtinchi darajani yaratishga urinish
API darajasida rad etiladi. Chuqur so'rovlar uchun materialized path
saqlanadi.

### 10. Denormallashtirilgan maydonlar bitta joyda hisoblanadi

`Product.minPrice / maxPrice / hasSale / inStock / searchText` variantlardan
hosil bo'ladi va faqat `ProductService.recomputeFacets()` da yangilanadi.
Ular bo'lmasa katalog filtri har so'rovda variantlar bo'yicha agregat talab
qilardi.

### 11. Savatda narx saqlanmaydi

`cart_items` da faqat variant va miqdor bor. Narx, chegirma va QQS har
so'rovda joriy holatdan hisoblanadi. Aks holda savatni bir hafta ochiq
qoldirgan mijoz eski narxda sotib olardi. Narx faqat buyurtma
yaratilganda muzlatiladi (`order_items`).

### 12. Rezerv — atomar, va muddati bor

Rezerv shartli `UPDATE` bilan qilinadi:

```sql
UPDATE inventory SET "reservedStock" = "reservedStock" + :qty
 WHERE "variantId" = :id AND "totalStock" - "reservedStock" >= :qty
```

O'zgargan satrlar soni 1 bo'lmasa — qoldiq yetmagan, `OutOfStockError`
(409). "Avval o'qib, keyin yozish" ataylab ishlatilmaydi: ikki mijoz bir
vaqtda oxirgi donani olib ketolmasligi kerak.

To'lanmagan buyurtma rezervi `inventory.reservationTtlMinutes` (standart
30 daqiqa) dan keyin cron orqali bo'shatiladi va buyurtma bekor qilinadi.
Bir nechta nusxa ishlaganda vazifa Redis qulfi bilan bittasida bajariladi.

Muddat FAQAT onlayn to'lovda qo'yiladi. Naqd to'lovdagi buyurtma
to'lovni kutmaydi, shuning uchun uning rezervi muddatsiz — aks holda har
bir COD buyurtma 30 daqiqada o'zi bekor bo'lardi. Buyurtma tasdiqlangach
rezerv muddati ham olib tashlanadi.

To'lovi qabul qilingan buyurtma HECH QACHON avtomatik bekor qilinmaydi —
faqat ogohlantirish yoziladi.

Bekor qilishda rezervning holati ahamiyatli: `HELD` bo'lsa faqat band
qilingan miqdor bo'shaydi, `CONSUMED` (ya'ni allaqachon jo'natilgan)
bo'lsa tovar OMBORGA QAYTARILADI va harakat jurnaliga yoziladi.

### 13. Buyurtma yaratish — bitta tranzaksiya, bitta kalit

Buyurtma, pozitsiyalar, to'lov yozuvi va ombor rezervi BITTA
tranzaksiyada yaratiladi. Rezerv bo'lmasa — buyurtma ham yo'q.

`idempotencyKey` bir xil bo'lsa ikkinchi so'rov yangi buyurtma
yaratmaydi, birinchisini qaytaradi. Frontend har checkout uchun bitta
kalit yuboradi — tugmani ikki marta bosish ikkita buyurtma bermaydi.

Status o'zgartirish ham shu tamoyilda: yangi status shartli `UPDATE`
(`WHERE status = :from`) bilan BAND QILINADI, yon ta'sirlar (rezervni
bo'shatish, hisobdan chiqarish, chegirma limitini qaytarish) esa shundan
keyin ishlaydi. Ikki operator bir vaqtda bosganda ikkinchisi 409 oladi va
rezerv ikki marta bo'shamaydi.

### 14. Chegirmalar: ustuvorlik, birikish, chegara

Har chegirmada `priority` va `stackable` bor. Ustuvorlik bo'yicha
saralanadi; `stackable: false` uchragan joyda to'xtaydi. Umumiy chegirma
`discounts.maxTotalPercent` (standart 40%) dan oshmaydi. Satrlar
bo'yicha taqsimlash tiyingacha aniq: qoldiq eng katta satrlarga
qo'shiladi, yig'indi har doim umumiy chegirmaga teng bo'ladi.

Kod limiti shartli `UPDATE` bilan qo'llanadi
(`WHERE usageLimit IS NULL OR usedCount < usageLimit`) va buyurtma
tranzaksiyasining O'ZIDA bajariladi — shuning uchun `usageLimit: 1`
bo'lgan kodni ikki mijoz bir vaqtda ishlatib yubora olmaydi.

Savat mehmon telefonisiz hisoblanishi mumkin, checkout esa haqiqiy
telefon bilan qayta tekshiradi. Agar kod aynan shu bosqichda rad etilsa,
buyurtma jim ravishda qimmatroq narxda YARATILMAYDI — mijozga sabab
aytiladi va u savatga qaytariladi (`COUPON_CHANGED`).

### 15. Pul holati faqat provayderdan o'zgaradi

Brauzerdan kelgan "men to'ladim" so'roviga ishonilmaydi. To'lov holati
faqat provayder webhook'i orqali o'zgaradi; sayt esa `/payments/status`
ni so'rab turadi va serverning javobini ko'rsatadi.

Yagona istisno — `PAYMENTS_MODE=mock` dagi `/payments/mock/confirm`.
U faqat development da ochiladi: `APP_ENV=development` VA
`NODE_ENV!==production` bo'lmasa, ilova umuman ishga tushmaydi.

### 16. Webhook — atomar va bir marta

Har bir hodisa avval `webhook_events` ga YOZILADI, keyin ishlanadi.
"Avval qidir, topilmasa yoz" ishlamaydi: ikki bir xil webhook bir vaqtda
kelsa, ikkalasi ham "topilmadi" deb ko'radi. Unikal indeks
(`provider + externalId + method`) bizning qulfimiz:

- ikkinchisi P2002 oladi va javob tayyor bo'lsa — o'sha javob qaytadi;
- javob hali tayyor bo'lmasa (birinchisi ishlab turibdi) — provayderga
  "qayta urinib ko'ring" deyiladi, ishlov IKKINCHI MARTA bajarilmaydi.

Xato javob "yakuniy" deb saqlanmaydi: sabab tuzalgach provayder qayta
urinsa, haqiqiy natijani olishi kerak.

### 17. Provayder javobi — har doim HTTP 200

Payme HTTP kodiga qaramaydi, javob ichidagi `error` ni o'qiydi; Click
ham shunday. 500 qaytarsak, provayder integratsiyani "ishlamayapti" deb
belgilaydi. Shuning uchun kutilmagan xato ham JSON-RPC `-32400` bo'lib
200 bilan ketadi, to'liq matni esa logda qoladi.

### 18. Chek pul olingan paytda beriladi

Onlayn to'lovda — webhook kelganda, naqd to'lovda — buyurtma
`DELIVERED` bo'lganda. Buyurtma berilganda emas.

OFD ishlamayotgan bo'lsa to'lov ham, buyurtma ham TO'XTATILMAYDI: chek
`PENDING` bo'lib navbatda qoladi va cron uni 1, 2, 5, 15, 30, 60, 120,
240 daqiqa oralig'ida qayta uradi. `OFD_MAX_ATTEMPTS` dan keyin `FAILED`
bo'ladi va admin panelda ko'rinadi.

Chekni QURIB bo'lmasa (masalan pozitsiyada IKPU yo'q), yozuv darrov
`FAILED` bo'ladi — sabab tuzatilgach admin paneldagi «Chekni qayta
qurish» tugmasi bosiladi.

### 19. Bir hodisa — bitta xabar

Har bir bildirishnoma `dedupeKey` bilan yoziladi
(`kanal:shablon:buyurtma`), u esa unikal. Operator statusni ikki marta
bossa ham mijoz ikkita SMS olmaydi.

Lekin ba'zi hodisalar bitta buyurtmada BIR NECHA MARTA bo'ladi: karta
ikki marta rad etilishi yoki uch marta qisman qaytarish. Bunday
chaqiruvlar kalitga farqlovchi qo'shadi (tranzaksiya id, qaytarilgan
umumiy summa), aks holda ikkinchi xabar jim yo'qolardi.

Yuborish paytida yozuv `SENDING` ga BAND QILINADI: navbat 100 ta SMS ni
bir daqiqadan uzoqroq yuborishi mumkin, cron qulfi esa tugab qolishi
mumkin. Band qilinmasa ikkinchi ishchi o'sha xabarlarni qaytadan
yuborardi.

### 20. Tunda jim

22:00–08:00 oralig'ida oddiy xabarlar ertalabga suriladi. Pulga
tegishli xabarlar (to'lov, bekor qilish, qaytarish) va kuryer yo'lga
chiqqani — darhol. Vaqt mintaqasi Asia/Tashkent.

### 21. Jo'natma buyurtmani ilgari suradi, lekin zid bo'lmaydi

Jo'natma «yo'lda» bo'lsa buyurtma `SHIPPED`, «yetkazildi» bo'lsa
`DELIVERED` bo'ladi — operator ikki joyda ikki marta bosmaydi.

Buyurtma holati bunga yo'l qo'ymasa (masalan hali `CONFIRMED`), amal
UMUMAN BAJARILMAYDI va sabab aytiladi. Aks holda jo'natma «yo'lda»,
buyurtma esa «tasdiqlangan» bo'lib qolar, rezerv hisobdan chiqmas,
naqd to'lov yopilmas va fiskal chek berilmasdi.

### 22. Yetkazish narxi kodda emas, admin panelda

Hudud, usul va ular kesishmasidagi narx admin paneldan boshqariladi.
Matritsada FAQAT tegilgan qatorlar saqlanadi: aks holda "saqlash"
tugmasi barcha hududlar uchun yozuv yaratib, standart narxni muzlatib
qo'yardi va keyin asosiy narxni oshirish hech narsani o'zgartirmasdi.

### 23. Qaytarish summasi muzlatilgan nusxadan

Qaytariladigan pul `order_items` dagi narx va CHEGIRMA ULUSHIDAN
hisoblanadi. Mijoz chegirma bilan olgan tovarni chegirmasiz narxda
qaytarib ololmaydi.

Bo'linish qoldig'i yo'qolmaydi: oxirgi dona qaytarilganda qoldiq ham
qo'shiladi, ya'ni ketma-ket qisman qaytarishlar yig'indisi AYNAN satr
jamiga teng bo'ladi.

Yetkazib berish narxi faqat BIZNING AYBIMIZ bilan (noto'g'ri tovar,
shikast, sifat) va BUTUN buyurtma qaytarilganda qaytariladi — va
bitta buyurtmada faqat bir marta.

### 24. Tovar olinmaguncha pul qaytarilmaydi

Holat mashinasida `RECEIVED` dan oldin `REFUNDED` ga o'tib bo'lmaydi.
Qabul qilishda har bir pozitsiya holati belgilanadi: faqat "qayta
sotiladi" tovar omborga qaytadi, ochilgani va yaroqsizi harakatlar
jurnalida qoladi.

Yon ta'sir bajarilmasa (pul o'tmasa, ombor yozuvi yiqilsa) HOLAT
ORQAGA QAYTARILADI. Aks holda qaytarish "pul qaytarildi" bo'lib qolar,
pul esa ketmasdi — va `REFUNDED` yakuniy holat bo'lgani uchun buni
tuzatib ham bo'lmasdi.

### 25. Ochilgan kosmetika

Sifatli kosmetika ochilgan bo'lsa qaytarilmaydi (qonun talabi).
Nuqson, noto'g'ri tovar yoki sifat muammosi bo'lsa — qaytariladi.
Qoida `returns.acceptOpened` sozlamasi bilan boshqariladi va yurist
xulosasi kelganda faqat shu qiymat o'zgaradi (ekspertiza A-2).

### 26. Ochiq marshrutda ham foydalanuvchi tanib olinadi

`@Public` endpoint token bo'lsa uni o'qiydi. Ilgari u darrov o'tkazib
yuborilar va `@CurrentUser` har doim bo'sh bo'lardi — natijada
"mijozmi yoki mehmonmi" degan tekshiruvlar (savat, buyurtma,
qaytarish) umuman ishlamasdi.

Egalik tekshirilmagan so'rovga buyurtma TARKIBI berilmaydi: id ni
bilgan begona odam faqat "qaytarish mumkin/mumkin emas" degan javob
oladi, pozitsiyalar va summalarsiz.

---

## Bosqichlar

> **Joriy holat va keyingi qadamlar: [`docs/HOLAT.md`](docs/HOLAT.md).**
> U yerda nima tayyor, nima to'sib turibdi va kimdan nima kutilayotgani yozilgan.

| Etap | Mazmun | Holat |
|---|---|---|
| 0 | TZ v2, yurist xulosasi, OFD provayderi, Click/Payme hujjatlari, kontent rejasi | buyurtmachi tomonida |
| 1 | Poydevor: repo, muhitlar, CI/CD, DB sxemasi, auth, RBAC, audit, dizayn tizimi | ✅ |
| 2 | Katalog: mahsulot, variant, kategoriya, kolleksiya, media, qidiruv, Excel import | ✅ |
| 3 | Savdo yadrosi: savat, checkout, buyurtma, ombor rezervi | ✅ |
| 4 | To'lov va fiskal chek: Click, Payme, COD, webhook idempotentligi, OFD | ✅ maket |
| 5 | Yetkazish va buyurtma boshqaruvi, SMS/Telegram | ✅ |
| 6 | Qaytarish moduli va mijoz kabineti | ✅ |
| 7 | Kontent, SEO, analitika | ✅ |
| 8 | Testlar, yuklama testi, migratsiya, reliz | jarayonda |

## 8-etap holati

Tayyorlangan reliz vositalari:

- `npm run test:e2e` — API, PostgreSQL, Redis, Web va Admin smoke testi;
- `npm run test:load` — concurrency, RPS, p95 va xato foizi bo‘yicha qat’iy mezonli yuklama testi;
- `npm run migrate:legacy -- --type=customers --file=...` — standart dry-run migratsiya;
- `--commit` — tekshiruvdan o‘tgan CSV ni tranzaksiyada import qiladi;
- `--rollback --checkpoint=... --commit` — aynan shu import yaratgan yozuvlarni qaytaradi;
- production uchun alohida API, Web va Admin Docker image lari;
- Nginx reverse proxy va API rate limit;
- PostgreSQL backup, checksum va restore skriptlari;
- GitHub CI da real PostgreSQL/Redis, E2E va qisqa load gate;
- production environment approval va SSH host fingerprint tekshiruvi bilan deploy;
- [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) — reliz va rollback tartibi.

8-etap kod qismi tayyor. Yakuniy real sinov va reliz uchun staging/production server,
Click, Payme, OFD, SMS kalitlari hamda migratsiya qilinadigan haqiqiy CSV fayllar kerak.

> **4-etap MAKET rejimida yakunlandi.** OFD provayderi bilan shartnoma va
> Click/Payme merchant hujjatlari hali yo'q, shuning uchun modul soxta
> drayverlar bilan ishlaydi: butun zanjir (buyurtma → to'lov → tasdiq →
> rezerv → fiskal chek) haqiqiy sharoitdagidek ishlaydi, faqat pul
> harakatlanmaydi va chek OFD ga ketmaydi. Kalitlar kelganda kodga
> tegilmaydi — pastdagi bo'limga qarang.

---

## 6-etap qabul mezonlari

| № | Ssenariy | Kutilgan natija |
|---|---|---|
| 1 | Yetkazilmagan buyurtmani qaytarishga urinish | "Yetkazilgandan keyin mumkin" xabari |
| 2 | 15-kuni qaytarishga urinish | "Muddat tugagan" — muddat YETKAZILGAN paytdan sanaladi |
| 3 | Chegirma bilan olingan tovar qaytariladi | Chegirma ulushi ayirilgan summa qaytariladi |
| 4 | 3 dona tovar birma-bir qaytariladi | Uch summaning yig'indisi AYNAN satr jamiga teng |
| 5 | Butun buyurtma "noto'g'ri tovar" sababi bilan qaytariladi | Yetkazish narxi ham qaytariladi |
| 6 | Bitta pozitsiya "to'g'ri kelmadi" sababi bilan | Yetkazish qaytarilmaydi |
| 7 | Ikkinchi qaytarishda yetkazish | Qayta qaytarilmaydi |
| 8 | Ochilgan qadoq, sabab "to'g'ri kelmadi" | 400 va tushuntirish |
| 9 | Ochilgan qadoq, sabab "shikastlangan" | Qabul qilinadi |
| 10 | Bitta buyurtmaga ikkinchi so'rov ochishga urinish | 409 — bitta ochiq so'rov |
| 11 | Ikki oyna bir vaqtda so'rov yuboradi | Bittasi yaratiladi |
| 12 | Begona mijoz boshqa buyurtmani qaytarmoqchi | 403 |
| 13 | Begona odam `eligibility` so'raydi | Pozitsiyalar va summalar berilmaydi |
| 14 | Mehmon telefon bilan qaytaradi | Telefon buyurtmaga mos bo'lsa ishlaydi |
| 15 | Operator "qabul qilindi" bosadi | "Qayta sotiladi" pozitsiyalar omborga qaytadi |
| 16 | Ochilgan yoki yaroqsiz pozitsiya | Qoldiqqa qo'shilmaydi, jurnalda qoladi |
| 17 | "Qabul qilindi" ikki marta bosiladi | Ombor ikki marta to'lmaydi |
| 18 | Pul qaytarishda to'lov moduli xato beradi | Holat ORQAGA qaytadi, qayta urinish mumkin |
| 19 | Pul qaytarilgach chek | Qaytarish cheki navbatga tushadi va qaytarishga bog'lanadi |
| 20 | Butun buyurtma qaytarilib pul berilgach | Buyurtma `REFUNDED` bo'ladi |
| 21 | Qisman qaytarishdan keyin | Buyurtma `DELIVERED` ga qaytadi — qolganini qaytarish mumkin |
| 22 | So'rov rad etiladi | Buyurtma `DELIVERED` ga qaytadi, mijozga OPERATOR sababi ketadi |
| 23 | Ikki operator bir vaqtda holat o'zgartiradi | Ikkinchisi 409 oladi (500 emas) |
| 24 | Yagona manzil tahrirlanadi | "Standart" belgisi saqlanib qoladi |
| 25 | Standart manzil o'chiriladi | Keyingisi standart bo'ladi |
| 26 | Mijoz ma'lumotlarini yuklab oladi | Profil, buyurtmalar, manzillar, roziliklar JSON da |
| 27 | Marketing roziligi bekor qilinadi | Tarix o'chirilmaydi, yangi yozuv qo'shiladi |
| 28 | Mijoz bloklanadi | Sessiyalari yopiladi, yozuv o'chirilmaydi |

## 5-etap qabul mezonlari

| № | Ssenariy | Kutilgan natija |
|---|---|---|
| 1 | Buyurtma beriladi | Mijozga SMS, operatorlar kanaliga xabar |
| 2 | Operator statusni ikki marta bosadi | Mijoz bitta SMS oladi |
| 3 | Karta ikki marta rad etiladi | Mijoz IKKI marta xabar oladi (har urinish alohida hodisa) |
| 4 | Uch marta qisman qaytarish | Har biriga alohida xabar ketadi |
| 5 | Soat 23:00 da buyurtma tasdiqlanadi | SMS ertalab 08:00 da yuboriladi |
| 6 | Soat 23:00 da to'lov qabul qilinadi | SMS DARHOL yuboriladi — pulga tegishli |
| 7 | SMS provayderi javob bermayapti | Xabar navbatda qoladi, 1/3/10/30/60 daqiqada qayta uriniladi |
| 8 | Navbat ishlab turganda admin «ishga tushirish» bosadi | Xabarlar ikki marta yuborilmaydi |
| 9 | Yuborish paytida ilova to'xtaydi | Xabar 10 daqiqadan keyin navbatga qaytadi |
| 10 | Kuryer biriktiriladi | Jo'natma yaratiladi, buyurtma holati o'zgarmaydi |
| 11 | Ikki operator bir vaqtda kuryer biriktiradi | Bitta jo'natma bo'ladi |
| 12 | Jo'natma «yo'lda» qilinadi | Buyurtma `SHIPPED`, rezerv hisobdan chiqadi, mijozga SMS |
| 13 | Buyurtma `CONFIRMED` da jo'natma «yo'lda» qilinadi | 400 va tushunarli sabab, hech narsa o'zgarmaydi |
| 14 | Jo'natma «yetkazildi» qilinadi, to'lov naqd | To'lov `PAID`, fiskal chek navbatga tushadi |
| 15 | Kuryersiz `SHIPPED` qilinadi | SMS da «Kuryer: —» emas, «tez orada bog'lanadi» matni |
| 16 | Kuryer varaqasi chop etiladi | Naqd to'lovda «MIJOZDAN OLINSIN» summasi ko'rinadi |
| 17 | Matritsada bitta hudud tahrirlanadi | Faqat o'sha hudud saqlanadi, qolganlari standart narxda qoladi |
| 18 | Hududda «Mavjud» olib tashlanadi | Checkout da o'sha usul ko'rinmaydi (olib ketish ham) |
| 19 | Oxirgi faol usul o'chiriladi | 400 — checkout ishlamay qolardi |
| 20 | Viloyat o'chiriladi | Uning tumanlari ham yopiladi, eski buyurtmalar saqlanadi |
| 21 | 40 ta buyurtma guruh bilan o'zgartiriladi | Har biri alohida tekshiriladi, o'tmagani xatosi bilan ko'rsatiladi |
| 22 | Audit logda narx o'zgarishi ochiladi | Qaysi maydon, nimadan nimaga — yonma-yon |
| 23 | Audit yozuvini o'zgartirishga urinish | Endpoint yo'q; bazada ham `UPDATE`/`DELETE` taqiqlangan |
| 24 | Kuzatuv sahifasi ochiladi | Kuryer ismi, telefoni va trek raqami ko'rinadi |
| 25 | Productionda `SMS_PROVIDER=console` | Ilova ishga tushmaydi |

## 4-etap qabul mezonlari

| № | Ssenariy | Kutilgan natija |
|---|---|---|
| 1 | Click `prepare` noto'g'ri imzo bilan keladi | HTTP 200, `error: -1` |
| 2 | Click `complete` da summa o'zgartirilgan | HTTP 200, `error: -2`, to'lov o'tmaydi |
| 3 | Bir xil `click_trans_id` bilan `complete` ikki marta | Bitta to'lov, ikkinchisiga o'sha javob |
| 4 | Ikki bir xil webhook AYNAN bir vaqtda keladi | Bittasi ishlanadi, ikkinchisi «qayta urinib ko'ring» oladi |
| 5 | Payme noto'g'ri kalit bilan murojaat qiladi | HTTP 200, `error.code: -32504` |
| 6 | Payme `CheckPerformTransaction`, buyurtma yo'q | `-31050`, xabar uch tilda |
| 7 | Payme summasi mos kelmaydi | `-31001` |
| 8 | Payme `CreateTransaction` 12 soatdan keyin `PerformTransaction` | `-31008`, tranzaksiya bekor qilinadi |
| 9 | Payme `PerformTransaction` ikki marta | Bitta to'lov, `perform_time` o'zgarmaydi |
| 10 | Payme `CancelTransaction` to'langan tranzaksiyaga | Qaytarish rasmiylashtiriladi, `state: -2` |
| 11 | Kutilmagan ichki xato yuz beradi | Payme `-32400` oladi, HTTP baribir 200 |
| 12 | To'lov kelgach buyurtma holati | `NEW` dan `CONFIRMED` ga avtomatik o'tadi |
| 13 | To'lov kelgach rezerv | Muddatsiz bo'ladi, cron bekor qilmaydi |
| 14 | Karta rad etiladi, mijoz «qayta to'lash» bosadi | Yangi havola ishlaydi, to'lov `PENDING` ga qaytadi |
| 15 | To'langan to'lovni bekor qilishga urinish | 409 — buning uchun qaytarish bor |
| 16 | Qolgan summadan katta qaytarish | 400, summa cheklanadi |
| 17 | Ikki qisman qaytarish bir vaqtda yuboriladi | Bittasi o'tadi, ikkinchisi 409 |
| 18 | Naqd buyurtma `DELIVERED` qilinadi | To'lov `PAID`, fiskal chek navbatga tushadi |
| 19 | OFD javob bermayapti | To'lov o'tadi, chek navbatda qoladi va qayta uriniladi |
| 20 | IKPU kodisiz pozitsiyali buyurtma to'lanadi | Chek `FAILED`, admin ko'radi, tuzatgach qayta quriladi |
| 21 | QQS cheki tekshiriladi | QQS narx ICHIDAN hisoblanadi, ustiga qo'shilmaydi |
| 22 | Yetkazib berish pullik | Chekda alohida pozitsiya bo'lib chiqadi |
| 23 | Moslashtirish: provayderda bor, bizda yo'q | 1-darajali xato sifatida tepada chiqadi |
| 24 | Moslashtirish: summa farqi | `AMOUNT_MISMATCH`, ikkala summa ko'rinadi |
| 25 | `PAYMENTS_MODE=mock` staging da | Ilova ishga tushmaydi va sababini aytadi |
| 26 | Kalitlarsiz `PAYMENTS_MODE=live` | Ilova ishga tushmaydi, qaysi kalit yo'qligini aytadi |

## 3-etap qabul mezonlari

| № | Ssenariy | Kutilgan natija |
|---|---|---|
| 1 | Omborda 1 dona qolgan tovarga ikki brauzerdan bir vaqtda buyurtma | Bittasi yaratiladi, ikkinchisi 409 `OUT_OF_STOCK` |
| 2 | Savatga qo'shiladi, admin narxni oshiradi, savat ochiladi | Yangi narx ko'rinadi (savatda narx saqlanmaydi) |
| 3 | Buyurtma yaratiladi, admin narxni o'zgartiradi, buyurtma ochiladi | Eski narx qoladi — nusxa muzlatilgan |
| 4 | «Tasdiqlash» tugmasi ikki marta bosiladi | Bitta buyurtma yaratiladi (idempotentlik kaliti) |
| 5 | Onlayn to'lov tanlanadi, 30 daqiqa to'lanmaydi | Rezerv bo'shatiladi, buyurtma bekor qilinadi |
| 6 | To'langan buyurtma rezervi muddati o'tsa | Bekor qilinmaydi, logda ogohlantirish |
| 7 | Naqd to'lov SMS-kodsiz yuboriladi | 400 `OTP_REQUIRED` |
| 8 | Ommaviy oferta belgilanmasdan yuboriladi | 400 `OFFER_NOT_ACCEPTED` |
| 9 | Ekspress yetkazish Toshkentdan tashqarida tanlanadi | Ro'yxatda mavjud emas, narxi qo'shilmaydi |
| 10 | Bepul yetkazish chegarasidan oshgan savat | Kuryer bepul, olib ketish baribir bepul |
| 11 | Yaroqsiz promo-kod savatda qoladi | Savat buzilmaydi, `couponError` da sabab qaytadi |
| 12 | Ikki chegirma birikadi, yig'indisi 60% | 40% bilan cheklanadi (`discounts.maxTotalPercent`) |
| 13 | Chegirma satrlar bo'yicha taqsimlanadi | Yig'indi umumiy chegirmaga tiyingacha teng |
| 14 | Buyurtma `NEW` dan `DELIVERED` ga o'tkaziladi | 409 — ruxsat etilmagan o'tish |
| 15 | Admin `SHIPPED` qiladi | Rezerv haqiqiy hisobdan chiqadi (`ORDER_SHIP` harakati) |
| 16 | Admin `CANCELLED` qiladi | Rezerv bo'shaydi, chegirma limiti qaytariladi |
| 17 | Kuzatuvga noto'g'ri telefon kiritiladi | «Topilmadi» — raqam bor-yo'qligi oshkor bo'lmaydi |
| 18 | Bir soatda 20 tadan ortiq kuzatuv so'rovi | 403 `TRACK_RATE_LIMITED` |
| 19 | Sotuvdan chiqarilgan mahsulot savatda qoladi | Avtomatik olib tashlanadi, ogohlantirish chiqadi |
| 20 | Qoldiqni izohsiz o'zgartirishga urinish | 400 — sabab izohi majburiy |
| 21 | Naqd to'lovli buyurtma 30 daqiqa tegilmaydi | Bekor qilinmaydi — COD rezervida muddat yo'q |
| 22 | Jo'natilgan buyurtma bekor qilinadi | Tovar omborga qaytadi, `RETURN_IN` harakati yoziladi |
| 23 | To'langan buyurtma bekor qilinadi | `paymentStatus` `PAID` bo'lib qoladi, logda pul qaytarish ogohlantirishi |
| 24 | Ikki operator bir vaqtda statusni o'zgartiradi | Ikkinchisi 409 `ORDER_STATUS_RACE`, rezerv ikki marta bo'shamaydi |
| 25 | `usageLimit: 1` kodini ikki mijoz bir vaqtda ishlatadi | Faqat bittasi o'tadi, ikkinchisi 409 |
| 26 | Savatda ishlagan kod checkout da rad etiladi | Buyurtma yaratilmaydi, 400 `COUPON_CHANGED` |
| 27 | Muddati o'tgan buyurtma cron bilan bekor qilinadi | Chegirma limiti ham qaytariladi |
| 28 | Oxirgi dona rezervi bo'shatiladi | `product.inStock` yana `true` bo'ladi |

## 2-etap qabul mezonlari

| № | Ssenariy | Kutilgan natija |
|---|---|---|
| 1 | Qidiruvga «шампунь» kiritiladi | Lotin yozuvidagi shampunlar chiqadi |
| 2 | Qidiruvga «shampon» (imlo xatosi) kiritiladi | Eng yaqin mahsulotlar chiqadi, javobda `fuzzy: true` |
| 3 | To'rtinchi darajali kategoriya yaratishga urinish | 400 va tushunarli xabar |
| 4 | Kategoriyani o'z ichidagi kategoriyaga ko'chirish | 400, halqa hosil bo'lmaydi |
| 5 | IKPU kodisiz mahsulot yaratish | 400, fiskal chek talabi eslatiladi |
| 6 | Tarkib yoki ogohlantirishsiz mahsulot yaratish | 400 (kosmetika uchun majburiy) |
| 7 | Band SKU bilan variant qo'shish | 409 |
| 8 | Aksiya muddati tugagan variant | Eski narx avtomatik ko'rsatilmaydi |
| 9 | Mahsulotni o'chirish, so'ng o'sha slug bilan yangisini yaratish | Ishlaydi — eski slug bo'shaydi |
| 10 | Import: PREVIEW rejimi | Bazaga hech narsa yozilmaydi, reja va xatolar qaytadi |
| 11 | Import: bitta satrda xato | Qolgan satrlar import qilinadi, xato satr hisobotda |
| 12 | Import: mavjud SKU, UPDATE_ONLY rejimi | Variant id bo'yicha yangilanadi, yangi variant yaratilmaydi |
| 13 | Rasm yuklash | 4 o'lcham, WebP va AVIF yaratiladi; alt matnsiz 400 |
| 14 | Operator roli bilan mahsulot yaratish | 403 |
| 15 | Katalogda filtr o'zgartiriladi | URL o'zgaradi, sahifa yangilansa filtr saqlanadi |
| 16 | Mobil kenglikda filtr oynasi | Pastdan ochiladi va aylanadi |

## 1-etap qabul mezonlari

| № | Ssenariy | Kutilgan natija |
|---|---|---|
| 1 | `npm run test` | 335 ta test o‘tadi |
| 2 | `npm run typecheck` | xatosiz |
| 3 | `.env` dan `DATABASE_URL` olib tashlansa | API ishga tushmaydi va sababini aytadi |
| 4 | `APP_ENV=production` + dev JWT kaliti | API ishga tushmaydi |
| 5 | Bitta raqamga ketma-ket ikkita OTP so'rovi | ikkinchisi 60 soniyagacha rad etiladi (429) |
| 6 | 5 marta noto'g'ri kod | kod bekor qilinadi, yangi kod talab qilinadi |
| 7 | Operator roli bilan `products.update` | 403 va audit logda urinish |
| 8 | Yangi telefon bilan kirish | mijoz avtomatik yaratiladi, alohida ro'yxatdan o'tish yo'q |
| 9 | Admin kirishi, so'ng `/api/admin/permissions` | roli va huquqlari ro'yxati qaytadi |
| 10 | Sxemaga yangi buyurtma statusi qo'shilsa | enum moslik testi yiqiladi |
| 11 | `GET /api/health` | `database: up`, `redis: up` |
| 12 | Mobil kenglikda `/uz/kirish` | interaktiv elementlar ≥ 44px, OTP maydoni klaviatura bilan ishlaydi |

---

## Foydali buyruqlar

```bash
npm run dev                 # hamma ilova
npm run test                # barcha testlar
npm run typecheck           # TypeScript
npm run build               # production build

npm run db:migrate          # yangi migratsiya
npm run db:seed             # boshlang'ich ma'lumotlar
npm run -w @aliver/api prisma:studio   # bazani ko'rish

npm run infra:up / infra:down
```

---

## Ma'lum cheklovlar

- `npm install` paytida Prisma o'z dvigatelini `binaries.prisma.sh` dan yuklaydi.
  Shu domen yopiq bo'lgan muhitda `npm run db:generate` ishlamaydi va API
  `typecheck` `@prisma/client` topa olmaydi — lokal ko'zgu yoki
  `PRISMA_ENGINES_MIRROR` sozlanadi. Boshqa paketlar (`@aliver/ui`, `@aliver/types`,
  `@aliver/web`, `@aliver/admin`) va barcha testlar bunga bog'liq emas.
- SMS va Telegram MAKET rejimida (`SMS_PROVIDER=console`, token yo'q): xabar
  navbatga tushadi va matni server logiga chiqadi, lekin haqiqatda yuborilmaydi.
  Productionda `console` taqiqlangan — ilova ishga tushmaydi.
- Mijozning Telegram chat id si hozircha faqat qo'lda to'ldiriladi: bot webhooki
  (`/start` va 10 daqiqalik token orqali telefonni ulash) ishlaydi.
- **To'lov MAKET rejimida.** Click va Payme merchant kalitlari hamda OFD
  provayderi yo'q, shuning uchun `PAYMENTS_MODE=mock` va `OFD_PROVIDER=mock`.
  Bu rejimda webhook imzosi tekshirilmaydi va `/payments/mock/confirm` ochiq —
  shuning uchun u faqat development da ishga tushadi, boshqa muhitda ilova
  umuman ko'tarilmaydi.
- Click qaytarishni Shop API orqali qo'llab-quvvatlamaydi: yozuv yaratiladi va
  "qo'lda bajarilsin" deb belgilanadi, pul o'tkazmasi kabinet orqali qilinadi.
  Naqd to'lov qaytarishi ham shunday.
- Moslashtirish hisoboti hozircha webhook loglariga tayanadi — bu MUSTAQIL manba
  emas. Provayder vypiskasi API si `ReconcileService.fetchStatement()` da
  ulanadi; solishtirish mantiqi tayyor va testlangan.
- Qisman qaytarish fiskal cheki bitta umumiy pozitsiya bilan beriladi. Pozitsiyalar
  bo'yicha batafsil chek OFD provayderi ulangandan keyin aniqlashtiriladi.
- Qaytarishda tovar fotosuratini yuklash hali yo'q: mijoz muammoni matn bilan
  tasvirlaydi. Fayl yuklash 7-etapdagi media oqimi bilan birga keladi.
- Mijoz Telegram botdagi `/start <token>` orqali kabinetiga xavfsiz ulanadi.
- Mahsulot tahrirlash oynasi admin panelda hali yo'q: mahsulotlar API va Excel
  import orqali qo'shiladi. Ro'yxat, filtr, guruh amallari va import ishlaydi.
- `pg_trgm` kengaytmasi migratsiyada yoqilishi kerak (`prisma/migrations/README.md`),
  aks holda imlo xatosiga chidamli qidiruv ishlamaydi.
- Fayl xotirasi lokalda MinIO. Production provayderi tanlanishidan oldin shaxsiy
  ma'lumotlarni saqlash joyi bo'yicha yurist xulosasi kerak.

---

## API xaritasi (6-etap)

### Qaytarish (mijoz va mehmon)

| Metod | Yo'l | Vazifa |
|---|---|---|
| GET | `/api/returns/reasons` | Sabablar va holat nomlari |
| GET | `/api/returns/eligibility/:orderId` | Qaytarish mumkinmi (`?phone=` mehmon uchun) |
| POST | `/api/returns` | So'rov yuborish |
| GET | `/api/returns/my` | Mening qaytarishlarim |
| GET | `/api/returns/:id` | Qaytarish tafsiloti |
| POST | `/api/returns/:id/cancel` | So'rovni bekor qilish |

### Mijoz kabineti (kirish talab qilinadi)

| Metod | Yo'l | Vazifa |
|---|---|---|
| GET/PUT | `/api/account` | Profil (telefon o'zgarmaydi) |
| GET/POST | `/api/account/addresses` | Manzillar |
| PUT | `/api/account/addresses/:id/default` | Standart manzil |
| DELETE | `/api/account/addresses/:id` | Manzilni o'chirish |
| GET/POST | `/api/account/wishlist` | Sevimlilar |
| DELETE | `/api/account/wishlist/:variantId` | Sevimlilardan olib tashlash |
| GET/POST | `/api/account/consents` | Roziliklar va tarix |
| GET | `/api/account/export` | Mening ma'lumotlarim (JSON) |

### Admin

| Metod | Yo'l | Huquq |
|---|---|---|
| GET | `/api/admin/returns` | `returns.view` |
| GET | `/api/admin/returns/transitions` | `returns.view` |
| GET | `/api/admin/returns/:id` | `returns.view` |
| POST | `/api/admin/returns/:id/status` | `returns.update` |
| GET | `/api/admin/customers` | `customers.view` |
| GET | `/api/admin/customers/segments` | `customers.view` |
| GET | `/api/admin/customers/by-phone` | `customers.view` |
| GET | `/api/admin/customers/:id` | `customers.view` |
| POST | `/api/admin/customers/:id/notes` | `customers.update` |
| PUT | `/api/admin/customers/:id/status` | `customers.update` |

---

## API xaritasi (5-etap)

### Admin — yetkazib berish

| Metod | Yo'l | Huquq |
|---|---|---|
| GET/POST | `/api/admin/delivery/regions` | `settings.*` |
| PUT | `/api/admin/delivery/regions/:id/active` | `settings.update` |
| POST | `/api/admin/delivery/districts` | `settings.update` |
| PUT | `/api/admin/delivery/districts/:id/active` | `settings.update` |
| GET/POST | `/api/admin/delivery/methods` | `settings.*` |
| PUT | `/api/admin/delivery/methods/:id/active` | `settings.update` |
| GET/PUT | `/api/admin/delivery/methods/:id/regions` | `settings.*` |

### Admin — jo'natmalar

| Metod | Yo'l | Huquq |
|---|---|---|
| GET | `/api/admin/shipments/carriers` | `orders.view` |
| GET | `/api/admin/shipments/order/:orderId` | `orders.view` |
| GET | `/api/admin/shipments/order/:orderId/waybill` | `orders.view` |
| POST | `/api/admin/shipments/order/:orderId/assign` | `orders.update` |
| POST | `/api/admin/shipments/:id/status` | `orders.update` |

### Admin — buyurtmalar, bildirishnomalar, audit

| Metod | Yo'l | Huquq |
|---|---|---|
| POST | `/api/admin/orders/bulk/status` | `orders.update` |
| GET | `/api/admin/orders/:id/notifications` | `orders.view` |
| GET | `/api/admin/orders/:id/audit` | `orders.view` |
| GET | `/api/admin/notifications` | `settings.view` |
| GET | `/api/admin/notifications/templates` | `settings.view` |
| POST | `/api/admin/notifications/:id/retry` | `settings.update` |
| POST | `/api/admin/notifications/queue/run` | `settings.update` |
| GET | `/api/admin/audit` | `audit.view` |
| GET | `/api/admin/audit/facets` | `audit.view` |
| GET | `/api/admin/audit/record/:recordId` | `audit.view` |
| GET | `/api/admin/audit/:id` | `audit.view` |

Audit logni o'zgartiradigan endpoint ATAYLAB yo'q.

---

## API xaritasi (4-etap)

### Provayder webhook'lari (imzo bilan himoyalangan, ochiq)

| Metod | Yo'l | Vazifa |
|---|---|---|
| POST | `/api/payments/click/prepare` | Click: tayyorlash |
| POST | `/api/payments/click/complete` | Click: yakunlash |
| POST | `/api/payments/payme` | Payme merchant API (JSON-RPC, 6 metod) |

Ikkalasi ham HAR DOIM HTTP 200 qaytaradi; xato javob ichida bo'ladi.

### Mijoz uchun

| Metod | Yo'l | Vazifa |
|---|---|---|
| GET | `/api/payments/methods` | Mavjud to'lov usullari va joriy rejim |
| POST | `/api/payments/start` | To'lovga o'tish havolasi (rad etilganini qayta ochadi) |
| GET | `/api/payments/status/:orderId` | To'lov holati (kutish sahifasi shuni so'raydi) |
| POST | `/api/payments/mock/confirm` | **Faqat development**: to'lovni modellashtirish |

### Admin

| Metod | Yo'l | Huquq |
|---|---|---|
| GET | `/api/admin/payments` | `payments.view` |
| GET | `/api/admin/payments/reconcile` | `payments.view` |
| GET | `/api/admin/payments/:id` | `payments.view` |
| GET | `/api/admin/payments/:id/webhooks` | `payments.view` |
| POST | `/api/admin/payments/:id/cash` | `payments.update` |
| POST | `/api/admin/payments/:id/refund` | `payments.update` |
| GET | `/api/admin/fiscal/receipts` | `fiscal.view` |
| GET | `/api/admin/fiscal/receipts/:id` | `fiscal.view` |
| POST | `/api/admin/fiscal/receipts/:id/retry` | `fiscal.update` |
| POST | `/api/admin/fiscal/receipts/:id/cancel` | `fiscal.update` |
| POST | `/api/admin/fiscal/orders/:orderId/rebuild` | `fiscal.update` |
| POST | `/api/admin/fiscal/queue/run` | `fiscal.update` |

---

## Provayder kalitlari kelganda

Kod tayyor. Kalitlar kelganda quyidagilar bajariladi — **dastur kodiga
tegilmaydi**.

### Click

1. Merchant kabinetidan oling: `CLICK_MERCHANT_ID`, `CLICK_SERVICE_ID`,
   `CLICK_SECRET_KEY`, `CLICK_MERCHANT_USER_ID`.
2. Kabinetda webhook manzillarini ko'rsating:
   - Prepare: `https://<domen>/api/payments/click/prepare`
   - Complete: `https://<domen>/api/payments/click/complete`
3. `.env` da `PAYMENTS_MODE=sandbox` qiling va test to'lovini o'tkazing.
4. Sinov o'tgach `PAYMENTS_MODE=live`.

Imzo formulasi kodda `clickSignString()` da va u testlar bilan
qoplangan. Click hujjatidagi formula o'zgarsa — faqat shu funksiya
o'zgaradi.

### Payme

1. Kabinetdan oling: `PAYME_MERCHANT_ID`, `PAYME_KEY` (jangovar),
   `PAYME_TEST_KEY` (sandbox).
2. Merchant API manzili: `https://<domen>/api/payments/payme`.
3. `PAYMENTS_MODE=sandbox` bilan Payme test to'plamini o'tkazing —
   oltita metod ham javob beradi.
4. Sinov o'tgach `PAYMENTS_MODE=live`.

### OFD (fiskal chek)

1. Provayder tanlanadi va shartnoma imzolanadi.
2. `.env`: `OFD_PROVIDER=soliq`, `OFD_API_URL`, `OFD_API_TOKEN`,
   `OFD_TERMINAL_ID`.
3. `OfdProvider.sendToProvider()` — provayder so'rov formatiga moslanadi
   (bitta metod, ~40 qator). Navbat, qayta urinish, admin paneli va chek
   havolasi tegilmaydi.
4. Buxgalter bilan `fiscal.shippingIkpu` sozlamasini tasdiqlang —
   yetkazib berish xizmatining IKPU kodi.

### SMS (eSKIZ yoki Play Mobile)

1. Provayder bilan shartnoma imzolanadi va kalitlar olinadi.
2. `.env`: `SMS_PROVIDER=eskiz` (yoki `playmobile`), `SMS_API_LOGIN`,
   `SMS_API_PASSWORD`, `SMS_SENDER`.
3. Shablon matnlari provayderda tasdiqlanishi kerak — ular
   admin paneldagi «Bildirishnomalar → Shablonlar» sahifasida
   ko'chirib olinadi (SMS qismlari soni ham o'sha yerda).
4. Kod tayyor: eSKIZ tokeni avtomatik yangilanadi, Play Mobile
   Basic auth bilan ishlaydi.

### Telegram

1. `@BotFather` da bot yaratiladi, token olinadi.
2. Operatorlar kanali ochiladi, bot admin qilinadi, kanal id si
   olinadi (masalan `-1001234567890`).
3. `.env`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ORDERS_CHAT_ID`.
4. Mijozga Telegram orqali xabar yuborish uchun u botga `/start`
   yozib telefonini ulashi kerak — chat id `customers.telegramChatId`
   ga yoziladi (bot webhooki 7-etapda).

### Moslashtirish

`ReconcileService.fetchStatement()` hozircha `null` qaytaradi va hisobot
webhook loglaridan quriladi. Kalitlar kelgach u yerga Payme
`GetStatement` va Click hisobot chaqiruvi qo'shiladi — solishtirish
mantiqi (`reconcile.util.ts`) o'zgarmaydi, u allaqachon testlar bilan
qoplangan.

---

## API xaritasi (3-etap)

### Ommaviy (autentifikatsiyasiz)

| Metod | Yo'l | Vazifa |
|---|---|---|
| GET | `/api/cart` | Savat tarkibi va summalar |
| POST | `/api/cart/items` | Savatga qo'shish |
| PUT | `/api/cart/items/:itemId` | Miqdorni o'zgartirish (0 — o'chiradi) |
| DELETE | `/api/cart/items/:itemId` | Pozitsiyani o'chirish |
| POST/DELETE | `/api/cart/coupon` | Promo-kodni qo'llash / olib tashlash |
| GET | `/api/delivery/regions` | Viloyatlar va tumanlar |
| GET | `/api/delivery/quotes` | Hudud uchun narx va muddat |
| POST | `/api/orders` | Savatdan buyurtma yaratish |
| POST | `/api/orders/otp` | Naqd to'lov uchun SMS-kod |
| POST | `/api/orders/track` | Raqam + telefon bo'yicha kuzatuv |
| GET | `/api/orders/:id/public` | Rahmat sahifasi (telefon maskalangan) |

Savat `cart_token` httpOnly cookie'sida yashaydi — mehmon uchun ham ishlaydi.

### Mijoz kabineti (kirish talab qilinadi)

| Metod | Yo'l | Vazifa |
|---|---|---|
| POST | `/api/cart/merge` | Kirgandan keyin mehmon savatini birlashtirish |
| GET | `/api/orders/my` | Mening buyurtmalarim |
| POST | `/api/orders/:id/cancel` | Tasdiqlanmagan buyurtmani bekor qilish |

### Admin (huquq talab qilinadi)

| Metod | Yo'l | Huquq |
|---|---|---|
| GET | `/api/admin/orders` | `orders.view` |
| GET | `/api/admin/orders/transitions` | `orders.view` |
| GET | `/api/admin/orders/:id` | `orders.view` |
| POST | `/api/admin/orders/:id/status` | `orders.update` |
| GET | `/api/admin/inventory/low-stock` | `inventory.view` |
| GET | `/api/admin/inventory/variants/:id/movements` | `inventory.view` |
| POST | `/api/admin/inventory/variants/:id/adjust` | `inventory.update` |
| POST | `/api/admin/inventory/reservations/expire` | `inventory.update` |

---

## API xaritasi (2-etap)

### Ommaviy (autentifikatsiyasiz)

| Metod | Yo'l | Vazifa |
|---|---|---|
| GET | `/api/catalog/categories` | Kategoriyalar daraxti (3 daraja) |
| GET | `/api/catalog/collections` | Kolleksiyalar |
| GET | `/api/catalog/products` | Katalog: filtr, saralash, sahifalash |
| GET | `/api/catalog/products/:slug` | Mahsulot sahifasi |
| GET | `/api/catalog/search/suggest` | Avtoto'ldirish |

Katalog filtrlari: `category`, `collection`, `q`, `minPrice`, `maxPrice`,
`inStock`, `onSale`, `minRating`, `volume`, `tags`, `sort`, `page`, `perPage`.

### Admin (huquq talab qilinadi)

| Metod | Yo'l | Huquq |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/admin/catalog/categories` | `categories.*` |
| GET/POST/PUT/DELETE | `/api/admin/catalog/collections` | `collections.*` |
| GET/POST/PUT/DELETE | `/api/admin/catalog/products` | `products.*` |
| POST | `/api/admin/catalog/products/bulk/status` | `products.update` |
| POST | `/api/admin/media/products/:id` | `products.update` |
| GET | `/api/admin/import/products/template` | `products.create` |
| POST | `/api/admin/import/products` | `products.create` |

Barcha o'zgartiruvchi amallar audit logga yoziladi.

## Import shabloni

Ustunlar: `product_slug`, `name_uz`, `name_ru`, `ikpu`, `vat`, `unit`, `sku`,
`barcode`, `size`, `color`, `price`, `old_price`, `cost_price`, `stock`,
`category`, `collections`, `tags`, `brand`, `status`, `short_desc_*`,
`ingredients_*`, `warnings_*`, `image_url`, `volume_ml`, `weight_g`.

Bir mahsulotning har bir varianti — alohida satr; ularni `product_slug`
birlashtiradi. Majburiy: `product_slug`, `name_uz`, `name_ru`, `ikpu`, `sku`,
`price`, `ingredients_uz/ru`, `warnings_uz/ru`.

Rejimlar: `PREVIEW` (bazaga yozilmaydi), `CREATE_ONLY`, `UPDATE_ONLY`,
`CREATE_AND_UPDATE`. Har bir import `import_jobs` jadvalida saqlanadi.
