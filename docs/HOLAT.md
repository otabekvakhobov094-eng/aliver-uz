# Loyiha holati va keyingi qadamlar

> Oxirgi yangilanish: 2026-09-11, commit `5766780`.

---

## ⚠️ Eng muhimi: tuzatishlar hali DEPLOY BO'LMAGAN

GitHub'dagi `main` hamon `cf0da2b` da turibdi — bu men ishni boshlagan
paytdagi commit. **Oltita commit hali repoga tushmagan**, shuning uchun
Render eski kodni qurmoqda.

Ya'ni "admin panel ishlamayapti, savat ishlamayapti" — bu **kutilgan
natija**: tuzatishlar hali saytda yo'q.

### Nima uchun push bo'lmadi

Men olti marta urindim, har safar bir xil javob:

```
access denied by the git proxy: otabekvakhobov094-eng/aliver-uz
is not in this session's authorized repository set
```

`git clone` (o'qish) ishlaydi, `git push` (yozish) esa yo'q. Bu men hal
qila oladigan narsa emas.

### Qanday qo'llash kerak

Patch **toza qo'llanishini tekshirdim** — reponing yangi nusxasiga
qo'yib ko'rdim, oltala commit xatosiz tushdi.

```bash
cd <aliver-uz papkangiz>
git pull                                   # eng yangi holatni oling
git am aliver-6-commits.patch              # oltala commit qo'llanadi
git push origin main                       # Render avtomatik deploy qiladi
```

**Render panelida hech narsa o'zgartirish SHART EMAS.** Dastlab kod
yangi `API_ORIGIN` o'zgaruvchisini talab qilardi; buni tuzatdim —
hozirgi `NEXT_PUBLIC_API_URL` qiymatidan o'zi aniqlab oladi. Buni
`API_ORIGIN` ataylab o'chirilgan holda sinab ko'rdim: login ishladi.

---

## 1. Nima bajarildi

### 1.1. Admin login (tuzatildi, sinaldi)

Sabab **ikkita** edi va ikkalasi ham jimgina ishlaydi — server cookie
yuboradi, brauzer rad etadi, hech kim xato ko'rmaydi:

1. `COOKIE_DOMAIN` standart qiymati `localhost` edi. Render'da u
   o'rnatilmagani uchun `…onrender.com` javobida `Domain=localhost`
   ketardi va brauzer cookie'ni butunlay tashlardi.
2. Admin va API turli subdomenlarda — brauzer uchun turli saytlar.
   Repodagi `SameSite=None` tuzatishi shuning uchun yordam bermagan:
   u cookie'ni uchinchi tomon cookie'siga aylantiradi, Safari esa uni
   doim bloklaydi. `.onrender.com` Public Suffix List da, ya'ni umumiy
   domen orqali hal qilib ham bo'lmaydi.

**Yechim:** brauzer endi API ga to'g'ridan-to'g'ri bormaydi — o'z
domenidagi `/api` ga so'rov yuboradi, Next.js uni serverda uzatadi.
Cookie birinchi tomon cookie'si bo'ladi.

**Tekshirildi:** admin ilovasi qurib ishga tushirildi, login cookie'ni
saqladi, keyingi so'rov `200`, cookiesiz `401`.

### 1.2. Pul yo'qotadigan oltita nuqson (tuzatildi)

| № | Nuqson | Nima bo'lardi |
|---|---|---|
| 1 | `markPaid` buyurtma holatini tekshirmasdi | Bekor qilingan buyurtmaga pul o'tardi: tovar boshqasiga sotilgan, chek esa berilgan |
| 2 | Bekor qilish to'langan holatni bosib ketardi | To'lovlarda "pul keldi", buyurtmalarda "to'lanmagan" |
| 3 | Chegirma noto'g'ri qatorga tushardi | Qaytarishda ortiqcha to'lanardi, fiskal chekdagi QQS noto'g'ri |
| 4 | Bepul yetkazish kuponni o'ldirardi | Kupon "qabul qilindi" deb ko'rinardi, chegirma nol bo'lardi |
| 5 | Click webhook xatosi yozuvni osib qo'yardi | Buyurtmani umuman to'lab bo'lmay qolardi |
| 6 | Naqd to'lovda UUID to'qnashuvi | Buyurtma yetkazilgan, puli yozilmagan, chek yo'q |

Eng xavflisi 1-si: Payme tranzaksiyasi 12 soat yashaydi, rezerv esa 30
daqiqa. 14:00 buyurtma → 14:31 cron bekor qiladi → 14:33 mijoz kodni
tasdiqlaydi → pul olinadi.

### 1.3. Sotib olish yo'lidagi to'qqizta nuqson (tuzatildi)

| № | Nuqson | Nima bo'lardi |
|---|---|---|
| 1 | Xato chegarasi yo'q edi | Har qanday API xatosi oq sahifa berardi |
| 2 | Savat yuklanmasa "Savat bo'sh" derdi | Mijoz tovarlari yo'qolgan deb ketardi |
| 3 | Checkoutda oferta havolalari 404 | Bosilsa forma butunlay o'chardi |
| 4 | Checkout qoldiq ogohlantirishini yashirardi | Tugma faol, har bosishda 409 |
| 5 | Checkout "savat bo'sh" deb yonib ketardi | Mijoz yaratilgan buyurtmadan chiqib ketishi mumkin edi |
| 6 | Desktopda saralash tugmasi yo'q edi | Faqat manzilni qo'lda tahrirlab |
| 7 | Variant almashganda miqdor qolardi | "10 ta qo'shildi" deb ko'rsatardi, aslida 2 ta |
| 8 | Narx filtri "Tozalash" dan keyin qolardi | Mijoz filtr ishlayapti deb o'ylardi |
| 9 | "3" deb qidirilsa butun katalog chiqardi | Hammasi natija sifatida ko'rsatilardi |

### 1.4. Dizayn (bosh sahifa)

- Brend ranglaridagi jonli shader foni — kutubxonasiz, sahifa atigi
  **3 kB** oshdi (Three.js bo'lsa 150–600 kB bo'lardi).
- Harakat tizimi: skroll bilan ochilish, kartochkalarda 3D qiyalik,
  yaltirash, tugmalarda ko'tarilish.
- Animatsion logotip.
- Yuborgan mahsulot suratingiz: **1.8 MB → 91 KB**, chap cheti
  animatsion fonga singib ketadi.
- Telefonda sarlavha kesilishi tuzatildi (360/390/768 px da sinaldi).

Animatsiya **zarar keltirmaydigan** qilib yozilgan: harakat kamaytirilgan
bo'lsa, trafik tejash yoqilgan bo'lsa yoki 2g bo'lsa umuman ishga
tushmaydi; ekrandan chiqsa va boshqa ilovaga o'tilsa to'xtaydi; haqiqiy
kadr vaqtini o'lchaydi va 40 FPS dan past bo'lsa o'zini o'chiradi.

**Testlar:** API `350`, admin `8`, UI `4` — hammasi o'tadi. Uchala
ilova production build xatosiz.

---

## 2. Nima qoldi

### 2.1. Darhol — siz bajarasiz

- [ ] **Patchni qo'llab, push qiling** (yuqoridagi buyruqlar).
- [ ] Deploy tugagach admin panelga kiring.
- [ ] Noto'g'ri parol kiritib ko'ring — endi "Email yoki parol
      noto'g'ri" deb yozishi kerak, jimgina qaytarmasligi.
- [ ] Savatga tovar qo'shib, checkoutgacha o'tib ko'ring.
- [ ] Telefonda bosh sahifani oching.

Shundan keyingina qolgan ishlarni tekshirib bo'ladi.

### 2.2. Dizayn — qolgan sahifalar

Hozir faqat **bosh sahifa** yangilandi:

- [ ] Katalog va filtr paneli
- [ ] Mahsulot sahifasi
- [ ] Savat va checkout
- [ ] Kategoriyalar, blog, FAQ
- [ ] Kabinet

### 2.3. 5-bosqich — savdo oqimini jonli sinash

Kod bo'yicha topilgan nuqsonlar tuzatildi, lekin **haqiqiy saytda**
sinash hali qilinmadi:

- [ ] Qidiruv: lotin/kirill, imlo xatosi
- [ ] Filtr va saralash barcha kombinatsiyalarda
- [ ] Savat: miqdor, kupon, qoldiqdan oshish
- [ ] Checkout: manzil, yetkazish narxi, OTP
- [ ] Buyurtma: rezerv, holat, kuzatuv

### 2.4. Reliz

- [ ] Stage-8 vositalarini haqiqiy serverda sinash
  (`npm run test:e2e`, `test:load` — repoda bor, men ishlata olmadim:
  jonli server va kalitlar kerak)
- [ ] Zaxira nusxa tartibini yo'lga qo'yish
- [ ] Production muhiti

---

## 3. Bizga bog'liq bo'lmagan to'siqlar

Kod tayyor, faqat ma'lumot kutilmoqda. Bularsiz sayt **haqiqiy savdo
qila olmaydi**:

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

> 8-band haqida: `aliver.com` dan logotipni yuklab olishga urindim,
> tarmoq siyosati bloklandi. Faylni xuddi hero suratini yuborganingizdek
> yuborsangiz, bir fayl almashtirish bilan qo'yaman.

---

## 4. Xavfsizlik: staging hozir ochiq

`render.yaml` da API uchun `APP_ENV=development` turibdi. Natijada:

1. `/api/docs` (Swagger) ommaga ochiq.
2. `/api/payments/mock/confirm` ochiq — buyurtma id'sini bilgan **har
   kim** uni "to'langan" deb belgilay oladi.

Haqiqiy mijozlarga ko'rsatishdan **oldin** yopilishi kerak: staging'ni
parol/IP bilan cheklang yoki `APP_ENV=staging` qilib sandbox kalitlarini
kiriting.

---

## 5. Muhit

| Xizmat | Manzil |
|---|---|
| Web | `https://aliver-uz-web-stage.onrender.com` |
| Admin | `https://aliver-uz-admin-stage.onrender.com` |
| API | `https://aliver-uz-api-stage.onrender.com` |
| Repo | `github.com/otabekvakhobov094-eng/aliver-uz` |

Deploy: GitHub `main` ga push → Render avtomatik quradi.
