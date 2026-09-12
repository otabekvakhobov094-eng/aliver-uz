# ALIVER.UZ — nima qilindi, nima qolди

**Sana:** 2026-09-12 · **Oxirgi commit:** `b99c0f7` · **Muhit:** Render staging

Bu hujjat kodga qarab yozildi, eski hujjatdan ko'chirilmadi. Har bir
raqam shu kungi holatdan olingan.

---

## 1. Bir qarashda

| | Soni |
|---|---|
| Admin panel sahifalari | 30 |
| Sayt sahifalari | 26 |
| API modullari | 29 |
| API endpointlari | 197 |
| Ma'lumotlar bazasi modellari | 58 |
| Avtomatik testlar | 365 (API) + 2 (admin) |
| Katalogdagi mahsulotlar | 556 (aliver.com dan import qilingan) |

Staging ishlab turibdi: `aliver-uz-api-stage.onrender.com/api/health` →
`{"status":"ok","database":"up","redis":"up"}`.

---

## 2. Nima qilingan va ishlaydi

### Savdoning asosiy oqimi

Katalog, qidiruv, filtrlar, mahsulot sahifasi, savat, checkout,
buyurtma yaratish, to'lov kutish ekrani, buyurtma kuzatuvi, qaytarish
so'rovi — hammasi ulangan va ishlaydi. Checkout uch xil to'lovni taklif
qiladi: Click, Payme va yetkazilganda naqd (naqd uchun SMS tasdiqlash
bilan).

Pul hamma joyda **tiyinda va BigInt** bilan hisoblanadi. Bu ataylab: suzuvchi
nuqtali son bilan 189 000 so'mning 12% QQS i vaqt o'tib bir tiyinga
adashadi va u xato hisobotda emas, chekda chiqadi.

### Admin panel

Buyurtmalar, mahsulotlar, mijozlar, to'lovlar, qaytarishlar, ombor,
chegirmalar, sharhlar, fiskal cheklar, moslashtirish (reconcile),
kontent (sahifalar, blog, bannerlar, FAQ, redirectlar), B2B lidlar,
hisobotlar, adminlar, rollar, audit log, yetkazish, bildirishnomalar,
sozlamalar — 30 ta sahifa, hammasi haqiqiy API ga ulangan.

Ro'yxatlar uchun bitta umumiy platforma yozildi: saqlangan ko'rinishlar,
ustunlarni yashirish va tartiblash, ommaviy amallar, skelet yuklanish va
ikki xil bo'sh holat («hali yo'q» va «filtrga mos kelmadi» — bular
boshqa-boshqa muammo). Buyurtmalar, Mahsulotlar, Mijozlar, To'lovlar va
Qaytarishlar shu platformaga o'tkazildi.

Mahsulot yaratish va tahrirlash sahifasi **bugun qo'shildi**. Undan
oldin adminkada faqat ro'yxat bor edi va mahsulotni kiritishning yagona
yo'li Excel import edi.

Rollar va huquqlar: modul × amal matritsasi, SUPER_ADMIN ni o'zgartirib
bo'lmaydi, oxirgi faol super-adminni o'chirishga yo'l qo'yilmaydi,
parol tiklanganda barcha sessiyalar bekor qilinadi.

### Mahsulot ma'lumoti

Uch qatlamli tarkib — uchta asosiy tarkib oddiy tilda vazifasi bilan,
keyin isbot qatori, so'ng to'liq INCI yig'iladigan blokda. Maydonlar
bazada, API da, sayt tomonida va admin formasida tayyor.

Mahsulot kartochkasida bir qatorli izoh, variantlar soni va ombor
qoldig'i aniq son bilan ko'rsatiladi.

### Infratuzilma

Monorepo (npm workspaces + Turborepo), Docker Compose, CI: lint →
typecheck → test → build → migratsiya → seed → smoke → yuklama testi.
VPS ga joylashtirish hujjati va fayllari tayyor. Render staging blueprint
ishlayapti va avtomatik deploy qilyapti.

Admin login **o'z domenidagi `/api` proxy** orqali ishlaydi: so'rov
cross-site emas, cookie birinchi tomon cookie si bo'ladi. Bu ilgari
login ochilmayotganining sababi edi.

---

## 3. Yarim qilingan — ishlaydi, lekin to'liq emas

**Rasm yuklash.** API tayyor (`POST /media/products/:id`,
`DELETE`), adminkada esa yuklash oynasi yo'q. Hozir rasm faqat import
orqali kiradi. Bu mahsulot tahrirlash sahifasi bilan bir xil turdagi
bo'shliq edi — API bor, forma yo'q.

**Kategoriyalar.** Adminkada faqat daraxt ko'rinadi. Yaratish,
tahrirlash va o'chirish API da bor, sahifada yo'q.

**Brendlar.** Ro'yxat endpointi bugun qo'shildi (mahsulot formasi uchun
kerak edi), lekin yangi brend qo'shish sahifasi yo'q.

**Hisobotlar.** To'rtta raqam, top mahsulotlar va UTM atributsiyasi bor.
Sana oralig'i bo'yicha filtr, eksport va xato holati yo'q — API yiqilsa
sahifa cheksiz «Yuklanmoqda…» da qoladi.

**Ombor va Fiskal cheklar ro'yxatlari** hali yangi platformaga
o'tkazilmagan. Avval ularning ommaviy amallari loyihalanishi kerak, aks
holda ko'chirishdan foyda chiqmaydi.

**Saqlangan ko'rinishlar** brauzerda saqlanadi. Serverga o'tkazish
xodimlar o'rtasida ulashish bilan birga qilinishi kerak.

**E2E testi** faqat sahifalar ochilishini tekshiradi. **Buyurtma berish
oqimi uchun avtomatik test yo'q** — savatga qo'shish, checkout, to'lov,
ombor rezervi, chek. Bu tizimdagi eng muhim tekshirilmagan yo'l.

---

## 4. Umuman qilinmagan

**Uzum to'lovi.** TZ-3 da so'ralgan edi, kodda yo'q — hozir faqat Click,
Payme va naqd. Baza enum'iga ham qo'shilmagan.

**Kuryer integratsiyasi.** Yetkazish hisob-kitobi va jo'natma holati bor,
lekin kuryer kompaniyasi bilan API ulanishi yo'q. Bazada `carrier` oddiy
matn maydoni: `"own" | "bts" | "fargo" | "yandex" | "uzpost"`. EMU, BTS
va pochta API lari ulanmagan.

**TZ-3 dagi beauty imkoniyatlari:** soya va teri turi tanlagichi,
savatda namuna tanlash, sharh mualliflari bo'yicha filtr («menga
o'xshaganlar»), natija bo'yicha fasetlar, filtr uchun SEO sahifalari
(`/f/...`), sodiqlik dasturi, sovg'a sertifikati. Hech biri boshlanmagan.

**Sayt va admin uchun testlar** deyarli yo'q (admin: 2 ta, sayt: 0 ta).

---

## 5. Bizga bog'liq bo'lmagan — sizdan kutilayotgani

Bular kod emas. Ular bo'lmasa do'kon ishga tushmaydi, va ular odatda
eng oxirida esga tushib, butun katalogni qayta to'ldirishga majbur
qiladi.

**IKPU (MXIK) kodlari — eng kritik.** Har bir mahsulot uchun. Kod
avtomatik yaratilmaydi, uni buxgalter yoki yetkazib beruvchi beradi.
Busiz fiskal chek chiqmaydi, ya'ni qonuniy savdo bo'lmaydi. Adminkada
maydon tayyor va bo'sh qolganlari ajratib ko'rsatiladi — lekin
ma'lumotning o'zi yo'q. **556 ta mahsulot uchun kerak.**

**To'lov shartnomalari va kalitlari** — Click, Payme, Uzum. Har biri
uchun merchant hisobi, kalit va sinov muhiti. Kod tayyor,
`PAYMENTS_MODE=mock` da turibdi.

**Kuryer shartnomasi.** EMU birinchi tanlov — u qisman yetkazishni
qo'llaydi, bu kosmetika savatiga mos. API hujjatini shartnoma
bosqichida so'rang. **Naqd pulni qaytarish jadvali va komissiyani yozma
kelishing** — u bevosita pul aylanishiga ta'sir qiladi.

**Yagona QR** — 2026-yil 1-iyuldan majburiy, allaqachon kuchda.
Ekvayring banki orqali olinadi.

**Mahsulot suratlari** — har biri uchun kamida 4 ta, bir xil sharoitda.
Hozirgi rasmlar yetkazib beruvchi uslubida va soni 1 dan 23 tagacha
farq qiladi.

**Mahsulot matnlari** — uchta asosiy tarkib vazifasi bilan, qo'llash,
ogohlantirish. Maydonlar tayyor, matn yo'q.

**Yuridik rekvizitlar** — MCHJ nomi, STIR, manzil.

**Brend tarixi.** aliver.com o'z sahifalarida uchta bir-biriga zid
versiyani aytadi: «2012, AQSh», «2013, Xitoy» va 7 yillik yubiley.
Bitta rasmiy versiyani tanlash kerak — men sanani ataylab yozmadim.

---

## 6. Yaqin muddat — e'tibor bering

Render'dagi **bepul PostgreSQL yaratilganidan 30 kun keyin tugaydi va
zaxira nusxa bermaydi.** Baza 11-sentabrda yaratilgan, ya'ni **oktyabr
boshida** 556 ta mahsulotli katalog bilan birga o'chadi.

Shu muddatdan oldin ikki yo'ldan biri tanlanishi kerak: VPS ga o'tish
(`docs/VPS.md` da hammasi tayyor) yoki Render'da pullik planga chiqish.

---

## 7. Tavsiya etilgan tartib

**Birinchi — IKPU kodlari.** Kritik yo'lda va kech aniqlansa eng
qimmatga tushadi. Buxgalterga bugun so'rov yuboring.

**Ikkinchi — to'lov va kuryer shartnomalari.** Ular tashqi tomonga
bog'liq, ya'ni kutish vaqti bor. Erta boshlansa qolgan ish bilan
parallel ketadi.

**Uchinchi — bazani ko'chirish**, oktyabrdan oldin.

**To'rtinchi — kontent:** suratlar va mahsulot matnlari. Bu dasturchi
ishi emas, shuning uchun boshqa ishlar bilan parallel bajariladi.

**Beshinchi — buyurtma oqimi uchun E2E test.** Haqiqiy to'lov kalitlari
ulanishidan oldin bo'lgani ma'qul.

**Oltinchi** — rasm yuklash, kategoriya tahrirlash, hisobot filtrlari.

**Yettinchi** — TZ-3 dagi beauty imkoniyatlari va Uzum to'lovi.

Do'konni ishga tushirish uchun birinchi to'rttasi yetarli. Qolgani
ishlab turgan do'kon ustiga qo'shiladi.
