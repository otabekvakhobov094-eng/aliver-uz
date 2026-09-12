# ALIVER.UZ — keyingi qadamlar

Sana: 2026-09-12 · Commit: oxirgi bundle

Bu hujjat bitta savolga javob beradi: **siz nima qilishingiz kerak.**
Kod tomondagi ishlar tugagan va commit qilingan.

---

## 1. Kodni yuborish

```
cd C:\Users\VOBEX\aliver-uz
git fetch aliver-uz-oxirgi.bundle "refs/heads/*:refs/remotes/bundle/*"
git reset --hard bundle/main
git push origin main
```

`reset --hard` xavfsiz: bundle sizning `origin/main` ingizni ham o'z
ichiga oladi, ya'ni yo'qoladigan narsa yo'q. Bu hujjat endi faqat
bundle ichida keladi, shuning uchun `merge` ni bloklamaydi.

Keyin Render → Deploys bo'limida uchala servis ham (**api**, **web**,
**admin**) deploy **tugaganiga** ishonch hosil qiling.

---

## 2. Deploydan KEYIN: sozlamalarni qaytadan to'ldiring

Adminka → Sozlamalar bo'limida siz kiritgan telefon, STIR va yuridik
nom yo'qolgan edi: har safar server qayta ishga tushganda seed ularni
boshlang'ich qiymatga qaytarardi. Bu tuzatildi (seed endi faqat
yo'q qatorni yaratadi, bor qatorga tegmaydi), lekin **tuzatish deploy
bo'lgandan keyin** to'ldirish kerak — aks holda yana yo'qoladi.

To'ldiriladigan joylar:

- `store.phone` — hozir `+998 71 200 00 00` turibdi (namuna)
- `store.tin` — hozir `[SIZNING STIR]` turibdi
- `store.legalName` — yuridik nom
- Ish vaqti (Savollar sahifasi shundan oladi)
- Bepul yetkazish chegarasi (mahsulot sahifasi va savat shundan oladi)

---

## 3. Qoldiq (ombor)

Hozir 556 ta mahsulotning hammasi saytda «Tugagan» deb turibdi —
chunki qoldiq hech qaerda kiritilmagan. Import mahsulot nomi va
tavsifini olib keladi, **qoldiqni olib kelmaydi**: u sizning
omboringizdagi ma'lumot.

Adminka → Import → Excel/CSV bo'limidan shablonni yuklab oling,
qoldiqni to'ldiring va qaytadan yuklang. IKPU (MXIK) kodi ham shu
faylda beriladi — usiz fiskal chek yuborib bo'lmaydi.

---

## 4. Huquqiy matnlar

Beshta sahifa **ataylab bo'sh**: ommaviy oferta, maxfiylik siyosati,
qaytarish shartlari, yetkazish shartlari, to'lov shartlari.

Ularni men yozib bera olmayman: bu haqiqiy do'kon uchun yuridik
majburiyat yaratadigan matn. Yurist yoki buxgalteringiz bilan
tayyorlang va Adminka → Sahifalar bo'limiga qo'ying. Sahifa
nashr qilinmaguncha checkout'da havola o'rniga oddiy matn chiqadi —
ya'ni sayt bo'sh sahifaga olib bormaydi.

---

## 5. Haqiqiy savdoga o'tish (hozir EMAS)

Dashboardda endi sariq ogohlantirish turadi: **do'kon sinov
rejimida**. Ya'ni:

- to'lov maket rejimida — «To'landi» yozuvi bor, pul esa olinmaydi;
- fiskal chek OFD ga ketmaydi — qonun talabi bajarilmayapti;
- SMS mijozga bormaydi, faqat jurnalga yoziladi.

**`APP_ENV` ni o'zgartirmang.** Hozir u `development` va shunday
turishi KERAK: `staging` yoki `production` qilinsa, API maket
rejimini ko'rib **umuman ishga tushmaydi** (bu ataylab shunday —
maket rejimida `/payments/mock/confirm` ochiq turadi va buni ochiq
saytda qoldirib bo'lmaydi).

Haqiqiy savdoga o'tish tartibi — hammasi BIR VAQTDA:

1. Click / Payme shartnomasi va kalitlari → `PAYMENTS_MODE=live`
2. OFD provayderi va kalitlari → `OFD_PROVIDER=<provayder>`
3. SMS provayderi → `SMS_PROVIDER=<provayder>` va kalitlari
4. Shundan keyin `APP_ENV=production`

Kalitlarsiz `APP_ENV=production` qo'yilsa, API ishga tushmaydi va
buning sababini logda aniq yozadi.

---

## 6. Kichikroq, lekin qilinadigan ishlar

- **Rasmlar hali `cdn.shopify.com` da.** Do'kon Shopify'ni yopsa
  rasmlar yo'qoladi. Ularni o'z omboringizga ko'chirish kerak.
- **`META_TEST_EVENT_CODE`** — Meta pikseli sinov rejimida.
  Haqiqiy reklama boshlashdan oldin Render'dan o'chiring.
- **Stend manzilini tarqatmang.** Maket rejimida buyurtma id sini
  bilgan odam to'lovni «tasdiqlab» qo'yishi mumkin.

---

## Nima tuzatildi (oxirgi tekshiruvda)

Ko'rinadigan qism:

- Dashboardda `to&apos;langan` deb chiqayotgan buzuq matn.
- Xato ekranining o'zi telefonda ekrandan chiqib ketardi —
  «Qayta urinish» tugmasi ko'rinmasdi.
- API kutilmagan javob qaytarsa BUTUN sahifa 500 bo'lardi
  (katalog, kategoriyalar, savollar, yetkazish). Endi bitta blok
  bo'sh qoladi, sahifa ochiq qolaveradi.
- Audit jurnalida «qayerdan» ustuni hamma uchun `::1` ko'rsatardi.
- Adminka dashboardida sinov rejimi ogohlantirishi (yangi).
- Ruscha yon menyuda uzun nom kesilardi.
- Bosh sahifada bitta aksiya ikki marta chiqardi, biri hali ham
  «25% chegirma» degan bajarilmaydigan va'da bilan.

Pul bilan bog'liq qism (kod tekshiruvida topildi):

- **Ballar qaytarilmasdi.** Buyurtma bekor qilinganda sarflangan
  ball yo'qolardi; to'liq qaytarilgan buyurtma uchun berilgan ball
  esa mijozda qolardi. Kod yozilgan, lekin hech qayerdan
  chaqirilmagan edi.
- **Fiskal chek ko'proq summa e'lon qilardi.** Ball bilan qoplangan
  qism chekda ko'rinmasdi: kartadan 1 000 000 yechilsa, chekda
  2 000 000 turardi va QQS ham o'shandan hisoblanardi.
- **Savat sahifasi 500 qaytarishi mumkin edi.** Ikki chegirma bitta
  arzon qatorga tushganda chegirma qator narxidan oshib ketardi.
- **Ball ikki marta sarflanishi mumkin edi** (ikkita varaq bir
  vaqtda buyurtma bersa).
- **Bekor qilingan buyurtma «to'landi» bo'lib qolishi mumkin edi** —
  pul olingan, tovar boshqa mijozga sotilgan.
- **To'lov abadiy «ishlanmoqda» holatida qolib ketishi mumkin edi**
  (deploy paytida webhook uzilsa).

Xavfsizlik:

- **Huquq oshirish.** `roles.create` huquqiga ega xodim yangi rol
  ochib, unga tizimdagi barcha huquqlarni bog'lay olardi va keyin
  o'sha rol orqali to'liq nazoratni qo'lga kiritardi. Tahrirlashda
  bu to'silgan edi, yaratishda — yo'q.
- **Sovg'a sertifikati kodlari audit jurnalida ochiq turardi.** Kod
  bazada xeshlanadi, lekin yaratish javobi jurnalga aynan o'shanday
  yozilardi: `audit.view` huquqiga ega har qanday xodim (hatto
  sertifikat bera olmaydigani ham) berilgan barcha kodlarni o'qib
  olardi.
- B2B ariza formasi cheklovsiz edi — bitta IP dan kuniga 170 mingga
  yaqin ariza yozish mumkin edi.
- Adminkadagi xodim izohi B2B arizasining mijoz yozgan matnini
  o'chirib yuborardi.
- Bitta endpoint `@Body()` ni umuman tekshirmasdi.

Bularning har biriga test yozildi; uchtasi eski kodda sinab
ko'rildi va aynan o'sha xatoni topdi.

Yangi mashina tekshiruvlari: `check:entities` (JS satridagi HTML
belgilari), `check:dto` (tekshirilmaydigan `@Body()`),
`check:layout:admin` (adminka telefonda ekrandan chiqmasligi).

Mashina tekshiruvlari: `npm run lint` — 12 ta tekshiruv.
Mobil ko'rinish: `npm run check:layout:admin` va `npm run check:layout`
(375 / 768 / 1280 va 320 / 390 / 768 / 1280 px).
