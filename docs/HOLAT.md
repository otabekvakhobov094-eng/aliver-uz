# ALIVER.UZ — nima qilindi, nima qolди

**Sana:** 2026-09-12 · **Oxirgi commit:** `bb1cc7f` · **Muhit:** Render staging

Bu hujjat kodga qarab yozildi, eski hujjatdan ko'chirilmadi. Har bir
raqam shu kungi holatdan olingan.

---

## 1. Bir qarashda

| | Soni |
|---|---|
| Admin panel sahifalari | 32 |
| Sayt sahifalari | 29 |
| API modullari | 32 |
| API endpointlari | 221 |
| Ma'lumotlar bazasi modellari | 61 |
| Migratsiyalar | 8 |
| Avtomatik testlar | 495 (API) + 2 (admin) + E2E buyurtma oqimi |
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

## 3. Shu kunda yopilgan ishlar

Quyidagilar «yarim» yoki «boshlanmagan» ro'yxatidan chiqdi.

**Rasm yuklash.** Adminkada mahsulot formasida yuklash oynasi: yuklash,
tartiblash, asosiy qilish, o'chirish. Alt matn ikkala tilda majburiy va
u YUBORISHDAN OLDIN tekshiriladi — server ham tekshiradi, lekin uning
rad javobi fayl to'liq yuklangandan keyin keladi.

**Kategoriyalar va brendlar.** Ikkalasida ham yaratish, tahrirlash,
o'chirish. Kategoriyada ota tanlovidan kategoriyaning o'zi va avlodlari
chiqarib tashlangan — aks holda daraxt halqaga aylanardi. Brendni
mahsulot ishlatayotgan bo'lsa o'chirib bo'lmaydi.

**Hisobotlar.** Davr tanlagichi, ixtiyoriy sana oralig'i, CSV eksport va
haqiqiy xato holati. Ilgari API yiqilsa sahifa cheksiz «Yuklanmoqda…»
da qolardi.

**Ombor va fiskal cheklar** ro'yxat platformasiga o'tkazildi. Fiskalda
ommaviy qayta yuborish (OFD yiqilgan kun eng kerakli amal), omborda esa
kam qoldiq ostonasini ommaviy o'zgartirish.

**Buyurtma oqimi uchun E2E test.** Savatdan chekgacha 13 ta tekshiruv.
Undan muhimi — testning O'ZI tekshiriladi: bilarak buzilgan beshta
holatda yiqilishi isbotlangan. Yiqilmaydigan test testdan ham yomon.

**Uzum to'lovi.** Butun tizim bo'ylab haqiqiy provayder. Jangovar rejim
ATAYLAB to'siqlangan: callback maydonlari Uzum hujjatidan olinadi va
hujjat shartnoma bilan keladi. Taxminiy maydon nomlari bilan yozilgan
webhook ishlayotgandek ko'rinadi va faqat birinchi haqiqiy to'lovda
yiqiladi — ya'ni pul bilan.

**Kuryer qatlami.** Adapter interfeysi, reyestr, ishlaydigan «o'z
kuryerimiz». EMU, BTS va pochta shartnoma kutyapti va buni ochiq aytadi
— yolg'on holat qaytarmaydi.

**Sharhlar.** Bu eng kutilmagan topilma bo'ldi: mijoz sharhni NA O'QIY
oladi, NA YOZA olardi — adminkada faqat moderatsiya bor edi. Endi ommaviy
ro'yxat, xulosa, yulduz taqsimoti, sharh qoldirish (yetkazilgan buyurtma
egasi uchun) va «menga o'xshaganlar» filtri.

**Savatda namuna.** 300 000 so'mdan yuqori buyurtmaga bepul namuna,
progress chizig'i bilan. Tanlangan namuna buyurtmaga nol narxli pozitsiya
bo'lib o'tadi — busiz yig'uvchi uni solmasdi.

**SEO filtr sahifalari** (`/f/…`) — sakkizta, qo'lda yozilgan. Avtomatik
yaratish ATAYLAB qilinmadi: har bir filtr kombinatsiyasi uchun sahifa
minglab yupqa nusxa yaratadi va butun domen reytingini tushiradi.

**Vosita tanlagich** — uchta savol, har birini o'tkazib yuborish mumkin,
natija odatdagi katalog havolasi.

**Sodiqlik dasturi.** Ball berish (to'lov tasdiqlanganda, buyurtma
berilganda emas), ishlatish (buyurtmaning 50% gacha), bekor qilishda
ikki tomonlama qaytarish, kabinetda balans va tarix. Balans hech qayerda
saqlanmaydi — u har doim harakatlar yig'indisi.

**Sovg'a sertifikati.** Kod bazada OCHIQ SAQLANMAYDI, faqat xeshi, va u
chiqarilganda bir marta ko'rsatiladi. Qisman ishlatish qo'llanadi.

Ikkilanish bazada qo'riqlanadi, kodda emas: sodiqlik va sertifikat uchun
qisman unikal indekslar haqiqiy Postgres'da sinaldi — ikkinchi yozuv
o'tmaydi.

---

## 4. Chala qolgani

**Sodiqlik va Uzum uchun admin ekrani yo'q.** Ikkalasining ham API si
ishlaydi — sodiqlikda beshta endpoint (balans, tarix, qo'lda tuzatish),
Uzumda uchta (holat, mahsulot ko'rigi, sharh importi) — lekin adminkada
sahifa ham, menyuda yozuv ham yo'q. Ya'ni ularga faqat dasturchi yetib
bora oladi.

Bu aynan shu hujjatning o'zi avval tanqid qilgan bo'shliqning o'zi va uni
men yaratdim. Eng tez tuzatiladigan ish ham shu: mexanizm tayyor, faqat
ekran kerak.

**Ball va sertifikat muddati avtomatik kuymaydi.** Qoida yozilgan
(oxirgi harakatdan 12 oy) va sana mijozga ko'rsatiladi, lekin uni davriy
bajaradigan vazifa qo'yilmagan. Loyihada allaqachon uchta shunday vazifa
bor — rezerv, fiskal navbat, bildirishnomalar — ya'ni naqsh tayyor.

**Uzum mahsulotlari faqat ko'rib chiqiladi.** Import nima bo'lishini
ko'rsatadi, lekin yozmaydi. Bu ataylab: 500 ta mahsulotni ko'r-ko'rona
yozib qo'yib, keyin orqaga qaytarish adminka bilan qilinadigan ish emas.
Yozish qismini ko'rik natijasi ko'rilgach qo'shish kerak.

**Uzum Seller yo'llari tasdiqlanmagan.** Rasmiy OpenAPI bor, lekin
spetsifikatsiya kalit bilan beriladi. Yo'llar sozlamada — hujjat kelgach
`.env` da to'rtta qator to'ldiriladi, kodga tegilmaydi.

**Sayt va admin testlari kam.** API da 495 ta, adminkada 2 ta, saytda 0.
Bugun yozilgan sof mantiq API tomonida to'liq qoplangan; React
komponentlari esa faqat brauzerda qo'lda tekshirilgan.

**Sephora naqshlari faqat bosh sahifada.** Siz shu hajmni tanlagansiz.
Katalog, mahsulot sahifasi, savat va checkout eski joylashuvda qolgan —
ular ishlaydi, lekin bosh sahifa bilan bir xil darajada emas.

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

**Beshinchi** — sodiqlik va Uzum uchun admin ekranlari, so'ng kuydirish
vazifasi. Ikkalasi ham kichik ish: mexanizm tayyor.

Dasturiy tomonda kritik yo'lda hech narsa qolmadi: TZ-3 dagi barcha
imkoniyatlar, E2E test va to'lov qatlami bajarildi.

Do'konni ishga tushirish uchun birinchi to'rttasi yetarli. Qolgani
ishlab turgan do'kon ustiga qo'shiladi.
