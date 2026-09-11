# ALIVER.UZ — TZ 3-qism: beauty tajribasi, bloklar, checkout, to'lov va yetkazish

Sana: 2026-09-11 · Asos: Gold Apple, Sephora va Rhode saytlarining tahlili;
Baymard Institute'ning go'zallik sohasi bo'yicha tadqiqoti; O'zbekiston
to'lov va kuryer xizmatlarining 2026-yil sentyabr holatidagi ma'lumotlari

Bu hujjat TZ-2 ni to'ldiradi. TZ-2 — dizayn tizimi va admin panel;
bu yerda — go'zallik saytlarining ish uslubi, saytga qo'shiladigan
bloklar, checkout va O'zbekistonga xos to'lov/yetkazish integratsiyalari.

---

# 1. Qaysi uchta sayt va nega

## 1.1 Gold Apple (goldapple.ru) — bozor haqiqati

Rus tilidagi bozorning yetakchisi. Bizga eng yaqini: kirill tipografiyasi,
ko'p shaharga yetkazish, bonus psixologiyasi va Instagram/Telegram'da
sharh o'qib, keyin saytda o'sha soyani qidiradigan mijoz.

Aylanmasining **~80% mobil**, ilovada ~10 mln foydalanuvchi. Dizayn
tamoyili esa bizga eng ko'p keraklisi: **vitrina — mahsulot to'ri emas,
kontent lentasi.**

Ularning dizayn agentligi (ONY) ochiq aytgan qoida: *"do'kon vitrinasini
mahsulotning maksimal soni bilan to'ldirmaslik"*. Bosh sahifada kam
mahsulot, ko'p bo'sh joy. Sabab: raqobatchilar yaratadigan "ko'zim
tindi" holatidan qochish.

Yana bir detal — bu bizga to'g'ridan-to'g'ri tegishli: **mahsulot nomi
uzunligiga qarab sarlavha o'lchami o'zgaradi.** O'zbek va rus tilidagi
nomlar uzunligi juda farq qiladi; qat'iy o'lcham maketni buzadi.

## 1.2 Sephora — funksional standart

2556 ta natijali kategoriya sahifasi — eng to'liq kuzatilgan filtr
tizimi. Katalog minglab SKU ga yetganda kerak bo'ladigan axborot
arxitekturasi shu yerda.

## 1.3 Rhode (rhodeskin.com) — hunarmandchilik namunasi

Rhode ham **Shopify'da** ishlaydi — ya'ni sizning muammoingiz platformada
emas, dizayn tizimida ekanini isbotlaydi. Filtri yo'q, viktorinasi yo'q,
sodiqlik dasturi yo'q. Faqat tipografiya, fotografiya va vazminlik bilan
yutadi.

Uning palitrasi **to'rtta qiymatdan** iborat: `#F1F0ED` (iliq oq),
`#161616` (deyarli qora), `#67645E` (kulrang), `#C63931` (aksent).
Diqqat qiling — **sof oq yo'q**. `#F1F0ED` iliq oq. Aynan shu bitta
almashtirish "qimmat" bilan "tayyor shablon" orasidagi farqning katta
qismini beradi.

---

# 2. Nimalarni ko'chiramiz — o'ntalik

Tartib ta'sir/xarajat nisbati bo'yicha.

## 2.1 Iliq oq fon (oson)

`#FFFFFF` o'rniga `#FAF7F5` yoki shunga yaqin iliq oq. TZ-2 dagi
`--alv-blush` shu vazifani bajaradi — uni **asosiy fon** qilamiz, oq esa
faqat kartochka ichida qoladi. Bu CSS o'zgaruvchisidagi bitta o'zgarish
va eng katta samarani beradi.

## 2.2 Mahsulot kartochkasini qayta qurish (oson-o'rta)

Kartochka — sayt bo'ylab minglab marta chiziladigan element, shuning
uchun unga alohida vaqt ajratish o'zini oqlaydi.

Tarkibi: brend → nom → **bir qatorli izoh** ("Lab uchun rangli qatlam")
→ narx → reyting va sharhlar soni → **soyalar soni** ("16 ta soya") →
belgi (yangi / cheklangan / chegirma) → ombor holati → hover'da
ikkinchi rasmga almashish → tez qo'shish tugmasi.

Ikkitasi alohida e'tiborga loyiq. **Soyalar soni** — kosmetikada bu
bosishga sabab; ko'pchilik uni mahsulot sahifasiga yashiradi. **Bir
qatorli izoh** — to'rt so'zda "bu nima" degan savolga javob beradi;
aksariyat kataloglarda buni bilish uchun bosish kerak.

## 2.3 Tarkib ma'lumotining uch qatlami (oson-o'rta)

Baymard tadqiqoti aniq ko'rsatgan: mijoz INCI ro'yxatini **baholay
olmaydi** va shu sababdan sotib olishdan voz kechadi.

To'g'ri tuzilma: **3 ta asosiy tarkib, har biri oddiy tilda vazifasi
bilan** ("Pantenol — teri to'sig'ini mustahkamlaydi") → isbot yoki
tadqiqot natijasi ("100% quruqlik kamayganini tasdiqladi") → **to'liq
INCI alohida ochiluvchi blokda**.

Bu muhandislik emas, kontent ishi — lekin konversiyaga bevosita ta'sir
qiladi.

## 2.4 Filtr uchun oldindan tayyorlangan sahifalar (o'rta)

Gold Apple'ning eng arzon va eng kuchli SEO usuli. Har bir qimmatli filtr
kombinatsiyasi **o'z manzili, sarlavhasi va matni bilan alohida
sahifaga** aylanadi: `/uz/f/quruq-teri-uchun-krem`,
`/ru/f/krem-dlya-suhoy-kozhi`.

`.uz` zonasida bizda hali hech qanday obro' yo'q. Bu — uzun dumli
qidiruvni egallashning eng tez yo'li. Har bir sahifa ikki tilda.

## 2.5 Savatda namuna (probnik) tanlash (o'rta)

Ma'lum summadan oshganda mijoz **1–2 ta bepul mini** tanlaydi.
Baymard: namunalar sotib olishga ishonchni sezilarli oshiradi.

Bu bir vaqtning o'zida uchta vazifani bajaradi — o'rtacha chekni
ko'taradi, yangi mahsulotni tanishtiradi va keyin "sinab ko'rgan
mahsulotingiz qanday?" deb yozishga sabab beradi.

## 2.6 Sharh mualliflari haqida ma'lumot (o'rta-qiyin)

Baymard'ning eng kuchli xulosasi: **sharh muallifining teri turi, yoshi,
rangi — umumiy reytingdan muhimroq.**

Sharh yozganda so'raladi: teri turi (quruq / yog'li / aralash / sezgir),
soch turi, yosh oralig'i, teri rangi. Keyin mijoz **"menga o'xshaganlar"**
bo'yicha filtrlaydi. Rasm yuklash majburiy imkoniyat.

Hozir mijoz buni Instagram'da qiladi — biz uni saytga qaytaramiz.

## 2.7 Sephora uslubidagi filtr arxitekturasi (o'rta)

Eng muhim farq: filtrlar **texnik xususiyat emas, natija** bo'yicha.
Sephora'da: teri muammosi, teri turi, kutilgan natija, qoplash darajasi,
pardoz turi, **rang oilasi**.

Kosmetika mijozi "hajmi 50 ml" deb qidirmaydi — u "quruqlikka qarshi"
deb qidiradi.

Har bir filtr qiymati yonida **son** turadi. Saralashning standarti —
moslik. Sahifada 60 ta mahsulot, keyin **«Ko'proq ko'rsatish» tugmasi** —
avtomatik cheksiz skroll emas: tugma orqaga qaytishni va footerni
saqlaydi.

## 2.8 Soya va teri turi tanlagichi (o'rta)

Charlotte Tilbury'ning savollar ketma-ketligi, lekin **AI va kamerasiz**:
teri rangi (och / o'rta / bug'doyrang / to'q) → ostki tus (iliq / sovuq /
neytral) → qoplash (yengil / o'rta / to'liq) → pardoz (mat / tabiiy /
yorqin) → natija mahsulot sahifalariga havola.

Oddiy forma bilan AI shade-matching foydasining ~80% ini olamiz va
birinchi qo'l ma'lumotini yig'amiz.

Bilan birga Baymard talabi: **soya nomi tavsifiy bo'lsin** — "Linen"
emas, "o'rta, zaytun ostki tusli".

## 2.9 Ikki valyutali sodiqlik dasturi (qiyin)

Gold Apple va Sephora mustaqil ravishda bir xil yechimga kelgan — bu
kuchli signal.

Oddiy bonus buyurtmani to'laydi. **Ikkinchi valyuta** esa faqat alohida
"do'kon"da mini, merch va eksklyuzivga sarflanadi. Va u **sotib olish
uchun emas** — **sharh yozgani va maqola o'qigani uchun** beriladi.

Shu tariqa chegirma bermasdan mukofot berasiz va 2.6-bo'limdagi
sharhlarni sotib olmasdan yig'asiz.

## 2.10 Fotografiya qoidalari (qiyin — bu ishlab chiqarish xarajati)

Gold Apple rangli kosmetikani **model qo'lida surtilgan holda**
suratga oladi — mijoz rangni emas, **teksturani va zichligini** ko'rishi
uchun.

Baymard: modellar **turli teri ranglarida** bo'lishi shart; bo'lmasa
"soya xavotiri" paydo bo'ladi va mijoz ijtimoiy tarmoqqa ketadi.

Qoida: har bir rangli mahsulot uchun mahalliy teri ranglarida surtilgan
namuna; mahsulot sahifasi galereyasida **qisqa qo'llanish videosi**;
o'xshash mahsulot o'rniga **"ALIVER tartibi"** — ketma-ketlik sotadi,
bitta mahsulot emas.

## 2.11 Ko'chirmaydigan uchta narsa

Sephora'da `user-scalable=no` qo'yilgan — barmoq bilan kattalashtirishni
bloklaydi, bu qulaylik nuqsoni. Rhode sahifasi juda og'ir (bir ko'rishga
~7.95 g CO₂) — O'zbekiston mobil tarmog'ida bu halokatli. Rhode'da
filtr yo'q — 20 ta mahsulotda ishlaydi, 2000 tada yo'q.

## 2.12 Animatsiya haqida qoida

Gold Apple dizaynerlarining amaliyotidan chiqadigan yagona qoida:
**har bir animatsiya ko'proq mahsulot ma'lumotini ochish uchun
bo'ladi** — hover rasmni almashtiradi, palitra kengayib soyalarni
ko'rsatadi. Bezak uchun hech narsa harakatlanmaydi.

Uchala saytning ham `prefers-reduced-motion` ni qo'llashini tasdiqlab
bo'lmadi — demak bu bizning ulardan ustun bo'ladigan arzon joyimiz.

---

# 3. Saytga qo'shiladigan bloklar

Siz aytgan bloklar va ularning aniq tarkibi.

## 3.1 Biz haqimizda

aliver.com dagi `About us` sahifasi — aslida shunchaki aloqa formasi va
tahrirlanmagan andoza matni. Bizda boshqacha bo'ladi.

Tarkibi: brend hikoyasi (qisqa, 2–3 xatboshi), ALIVER nima uchun
yaratilgan, sifat va original mahsulot kafolati, sertifikatlar
(vegan, cruelty-free, ISO — qaysi biri haqiqatan bo'lsa), jamoa yoki
ishlab chiqarish surati, raqamlar (necha yil, necha mijoz, necha shahar).

Muhim ogohlantirish: aliver.com o'z sahifalarida **uchta bir-biriga zid
tashkil etilish tarixini** aytadi — "2012, AQSh", "2013, Xitoy" va
Shenzhen ishlab chiqaruvchisi. **Bitta versiyani tanlash va hamma
joyda shuni yozish kerak.** Mijoz buni sezadi.

## 3.2 Kategoriyalar bloki

Bosh sahifada 8 ta asosiy kategoriya plitkasi: tirnoq, pardoz, qo'l va
oyoq, soch, teri, erkaklar uchun, og'iz bo'shlig'i, boshqa.

Har bir plitkada: rasm, nom, **mahsulotlar soni**. Hover'da yengil
kattalashish.

Alohida `/kategoriyalar` sahifasi ham bo'ladi — barcha kategoriya va
ichki kategoriyalar daraxti.

## 3.3 Yetkazish va to'lov

Bitta sahifa, ikki bo'lim — mijoz doim ikkalasini birga qidiradi.

Yetkazish qismida: **shahar bo'yicha jadval** (Toshkent, viloyat
markazlari, tumanlar), muddat, narx, bepul yetkazish chegarasi,
kuryerlar ro'yxati, o'zi olib ketish nuqtalari xaritada, buyurtmani
kuzatish havolasi.

To'lov qismida: har bir usul logotipi va qisqa tavsifi, muddatli to'lov
shartlari, naqd to'lov qoidasi, fiskal chek haqida ma'lumot, xavfsizlik
(karta ma'lumoti saytda saqlanmaydi).

## 3.4 Kontaktlar

Telefon (bosiladigan), Telegram, Instagram, e-pochta, ish vaqti,
ofis/do'kon manzili xarita bilan, murojaat formasi, yuridik ma'lumotlar
(MCHJ nomi, STIR, manzil) — bu O'zbekistonda ishonch uchun muhim.

Murojaat formasi admin paneldagi "Murojaatlar" bo'limiga tushadi.

## 3.5 Qo'shimcha tavsiya etiladigan bloklar

**Tez-tez so'raladigan savollar** — kategoriyalarga ajratilgan
(buyurtma, yetkazish, to'lov, qaytarish, mahsulot).

**Qaytarish va almashtirish** — 30 kun, shartlar, qadam-baqadam jarayon.

**Blog** — har bir mahsulot uchun bitta maqola (aliver.com strategiyasi
ishlaydi), ustiga mavsumiy va o'quv maqolalari.

**Hamkorlik / ulgurji** — distribyutorlik takliflari, forma bilan.

**Sodiqlik dasturi** sahifasi — darajalar, bonus qanday to'planadi va
sarflanadi.

---

# 4. Checkout

Siz "checkout tushunarli bo'lsin" dedingiz. Quyida aniq tuzilma.

## 4.1 Asosiy tamoyillar

Checkout **bitta sahifada**, to'rt blok ketma-ket ochiladi. Ko'p
qadamli sehrgar emas — har bir qadam tashlab ketish nuqtasi.

**Mehmon sifatida buyurtma berish majburiy.** Ro'yxatdan o'tishni talab
qilish — konversiyani yo'qotishning eng keng tarqalgan sababi.

Yuqorida **doimiy ko'rinadigan buyurtma xulosasi**: mahsulotlar, jami,
yetkazish, chegirma. Mobil qurilmada yig'iladigan panel.

## 4.2 Bloklar

**1. Aloqa.** Telefon (`+998 (__) ___-__-__` maskasi bilan, asosiy
identifikator), ism, e-pochta (ixtiyoriy). Telefon kiritilgach OTP
yuboriladi — shu bilan mijoz bir vaqtning o'zida tasdiqlanadi va
ro'yxatdan o'tadi.

**2. Yetkazish.** Viloyat → tuman → ko'cha ketma-ketligi (avval hudud,
keyin manzil — aks holda narx hisoblanmaydi). Yetkazish usuli tanlangach
**narx va muddat darhol ko'rinadi**. O'zi olib ketish tanlansa — nuqtalar
xaritada.

Qo'shimcha: "eshik oldiga qoldiring", "avval qo'ng'iroq qiling"
belgilari; sovg'a sifatida o'rash; xabar matni.

**3. To'lov.** Usullar logotip bilan kartochka ko'rinishida. Har birida
bir qatorli izoh ("Click ilovasi orqali", "Karta yoki QR"). Muddatli
to'lov tanlansa — **oylik to'lov summasi darhol ko'rsatiladi**.

**4. Tasdiqlash.** To'liq xulosa, shartlarga rozilik (havolalar yangi
oynada ochiladi), yakuniy tugma — **"Buyurtmani tasdiqlash"**, yonida
jami summa.

## 4.3 Xatolarni ko'rsatish

Har bir maydon **fokusdan chiqqanda** tekshiriladi, yuborishda emas.
Xato maydon yonida, qizil rangda va **nima qilish kerakligini** aytadi
("Telefon raqami 9 ta raqamdan iborat bo'lishi kerak").

To'lov muvaffaqiyatsiz bo'lsa: buyurtma **yo'qolmaydi**, holati
"to'lov kutilmoqda" bo'lib qoladi va mijozga qayta urinish havolasi
yuboriladi. Bu eng ko'p uchraydigan yo'qotish nuqtasi.

## 4.4 Buyurtmadan keyin

Tasdiq sahifasi: buyurtma raqami, nima buyurtma qilingani, qachon
yetishi, kuzatish havolasi, "Telegram'da xabar olish" tugmasi.

Darhol SMS va (bo'lsa) e-pochta. Fiskal chek havolasi ham shu yerda.

---

# 5. To'lov tizimlari

O'zbekistondagi barcha real variantlar. Har biri uchun integratsiya
modeli ko'rsatilgan, chunki aynan shu ish hajmini belgilaydi.

## 5.1 Ikki xil integratsiya modeli

Deyarli hamma narsa shu ikkitasidan biriga tushadi. Buni oldindan
tushunish eng ko'p vaqt tejaydi.

**1-model — provayder bizni chaqiradi** (Merchant API, "prepare-complete").
Biz bir-ikkita HTTPS endpoint ochamiz, provayder ularga so'rov yuboradi
va **bizning javobimiz** to'lov davom etishini hal qiladi. Karta
ma'lumoti bizga umuman tegmaydi. Bu — **Payme, Click SHOP-API, Uzum
Bank, Paynet**. Asosiy model shu.

**2-model — biz provayderni chaqiramiz** (oddiy REST). Biz hisob
yaratamiz, keyin webhook olamiz. Bu — **ATMOS, Octo, Multicard,
Alifpay, Click Merchant API**.

Muhim: Payme va Click **g'oyasi bir xil, protokoli boshqa**. Payme —
JSON-RPC 2.0 + Basic auth. Click — oddiy POST + MD5 imzo. Ikkalasi
alohida ish, vaqtni shunga qarab rejalashtiring.

## 5.2 Provayderlar

| Provayder | Model | Izoh |
|---|---|---|
| **Payme (Paycom)** | 1-model, JSON-RPC 2.0, Basic auth | Bozorda eng keng tarqalganlardan. Fiskal chekni o'zi rasmiylashtira oladi (`SetFiscalData`) |
| **Click** | 1-model (SHOP-API) yoki 2-model (Merchant API), MD5 imzo | Komissiya rasmiy e'lon qilingan: sayt orqali mahalliy karta **1.5–2.5%**, Visa 2.5%, QR/Click Pass 1% |
| **Uzum Bank** | 1-model | Hujjatlari yopiq — integratsiyadan oldin `developer.uzumbank.uz` ni qo'lda o'qish kerak |
| **Uzum Nasiya** | Muddatli to'lov | Bozorda eng ko'p ishlatiladigan nasiya |
| **Paynet** | 1-model (UWS) | Hujjatlari to'liq |
| **Octobank (Octo)** | 2-model | UZCARD/HUMO **0.8%**, VISA/MC **3.5%**, hisob-kitob 5 ish kuni. **Savat tarkibini `spic`/ИКПУ bilan yuboradi va fiskal chekni o'zi beradi** |
| **ATMOS** | 2-model | Hujjatlari juda batafsil |
| **Multicard** | 2-model | Agregator |
| **Alifpay / Alif Nasiya** | 2-model | `receipt: true` bilan fiskal chek |
| **Anor Bank** | Ekvayring | Aylanmadan 0.1% gacha, mablag' 24 soatda |
| **Apelsin (Kapitalbank)** | Hamyon | — |
| **Uzcard / Humo** | Milliy karta tizimlari | Bank orqali ekvayring |
| **Visa / Mastercard** | Xalqaro | Octobank, Click, ekvayring banklari orqali |

**Rejalashtirish uchun komissiya oralig'i:** mahalliy karta va hamyon
**0.8–2.5%**, Visa/Mastercard **2.5–3.5%**. 2.5% dan pasti aylanma
bo'yicha shartnomada kelishiladi.

**Muhim:** hisob-kitob muddatini **yozma ravishda** oling. Octobank
5 ish kuni deb rasman yozgan, qolganlari "odatda har kuni" deydi —
lekin bu tasdiqlanmagan. Naqd yetkazishdagi pul aylanishi bilan birga
bu sizning aylanma mablag' modelingizni belgilaydi.

**PayTechUZ** — Payme, Click va Uzum'ni bitta interfeys ostida
birlashtiradigan ochiq kutubxona. Django va FastAPI uchun. Bizning
stek NestJS bo'lgani uchun to'g'ridan-to'g'ri ishlatolmaymiz, lekin
**protokolni o'rganish uchun eng yaxshi manba**.

## 5.3 Barcha to'lovlar uchun umumiy qoidalar

Pul har doim **tiyinda** (`BigInt`) saqlanadi. Webhook **idempotent**
bo'ladi: bir xil xabar ikki marta kelsa, ikki marta hisoblanmaydi —
`(provider, externalId, method)` bo'yicha noyob indeks va "avval
yozib, keyin bajarish" tartibi.

Har bir provayder uchun **IP ro'yxati** cheklanadi. Imzo har doim
tekshiriladi. Sinov muhiti (sandbox) majburiy.

Buyurtma holati va to'lov holati **alohida** kuzatiladi — bu
moslashtirish (reconciliation) uchun shart.

## 5.4 Yagona QR — endi majburiy

**2026-yil 1-iyuldan** savdo va xizmat ko'rsatuvchi barcha yuridik
shaxslar uchun **yagona QR kodni qabul qilish majburiy**. Bu allaqachon
kuchda.

Yagona QR — istalgan bank yoki to'lov ilovasi o'qiy oladigan bitta
standart. Ikki turi bor: statik (o'zgarmas) va dinamik (qurilma
yaratadi, muddatli). QR ekvayring banki bilan shartnoma orqali olinadi.

**Amaliy xulosa:** kuryerlar eshik oldida to'lov qabul qilsa, ularda
naqd va terminaldan tashqari **yagona QR ham bo'lishi kerak**.

## 5.5 Naqd to'lov

**2026-yil 1-apreldan** bir dona uchun **25 mln so'mdan qimmat** tovarga
naqd to'lov taqiqlangan. Kosmetika bu chegaradan past, shuning uchun
**kuryerga naqd to'lash qonuniy bo'lib qolaveradi.**

---

# 6. Yetkazish

## 6.1 Xizmatlar

| Xizmat | Qamrov | Tezlik | Naqd qabul | API |
|---|---|---|---|---|
| **EMU Express** | 227 filial, 14 viloyat + 165 davlat | Kafolatli muddat, kechiksa tovon | **Ha** | Bor, lekin hujjati yopiq — shartnomada so'raladi |
| **BTS Express** | Butun mamlakat + 89 davlat | Toshkent 1 kun, viloyat 1–2 kun | Tasdiqlanmagan | Tasdiqlanmagan |
| **Fargo** | Butun mamlakat, barcha viloyatda punkt | Toshkent 1 kun / ekspress 3–5 soat | **Ha** | Bor ("tezkor API"), shartnoma kerak |
| **CDEK O'zbekiston** | Mamlakat + xalqaro | — | **Ha** | **Bor, bepul** + vidjet |
| **Yandex Delivery** | Toshkent, Samarqand | 15 daqiqa – 2 soat | Tasdiqlanmagan | **Bor — eng yaxshi hujjatlangan** |
| **Uzum Tezkor** | 25 shahar | **30–35 daqiqa** | Ha | POS orqali |
| **O'zbekiston Pochtasi** | Eng keng tarmoq | 2–5 kun | Tasdiqlanmagan | Topilmadi |

**Rejadan chiqariladiganlar:** **Wolt 2026-yil 5-martda O'zbekistondan
chiqib ketgan**, **Express24 esa Yandex tarkibiga o'tgan**. Bularni
rejaga kiritmang.

## 6.2 Tavsiya etilgan tuzilma

Toshkent bo'ylab tezkor va oldindan to'langan — **Yandex Delivery**
(haqiqiy API, jonli kuzatuv). Butun mamlakat bo'ylab naqd bilan —
**EMU** . Tejamkor variant, punktga yetkazish — **Fargo**. Zaxira va
og'ir yuk — **BTS** yoki **CDEK**.

## 6.3 EMU ning kosmetika uchun muhim xususiyati

EMU **qisman yetkazishni** qo'llab-quvvatlaydi: mijoz ko'radi, ba'zi
mahsulotlarni oladi va **faqat olganiga to'laydi**, qolgani qaytadi.

Kosmetika savatida bu juda mos keladi — mijoz bitta mahsulotdan voz
kechsa, butun buyurtma qaytmaydi. Lekin bu **buyurtma modelida qisman
qabulni ko'zda tutishni** talab qiladi: buyurtma qisman yopilishi,
qolgani qaytarish sifatida yozilishi kerak.

## 6.4 Kuryer abstraksiyasi

Faqat Yandex'da barqaror ochiq API bor; qolganlari shartnomaga
asoslangan va o'zgaradi. Shuning uchun **birinchi kundan abstraksiya
qatlami** yoziladi:

`createShipment` · `getLabel` · `track` · `cancel` · `getCodRemittance`

Yangi kuryer qo'shilganda faqat adapter yoziladi, buyurtma moduli
tegilmaydi.

**Naqd pulni qaytarish jadvali va komissiyasini** har bir kuryer bilan
yozma kelishing — bu bevosita pul aylanishiga ta'sir qiladi va ko'pincha
kech aniqlanadi.

---

# 7. Fiskal chek va huquqiy talablar

## 7.1 Nima talab qilinadi

PP-5252 (04.10.2021) 5-bandiga ko'ra **masofaviy to'lovlar uchun
elektron chek soliq organi tizimi bilan integratsiyalangan avtomatik
fiskal belgiga ega bo'lishi shart**. Bu onlayn do'konlarga ham
tegishli.

## 7.2 Ikki yo'l

**1-yo'l — to'lov provayderi rasmiylashtiradi** (komissioner modeli).
Ko'pchilik onlayn do'kon shunday qiladi. Payme uchun: `my.soliq.uz` da
Payme komissioner sifatida ro'yxatga olinadi, keyin u `SetFiscalData`
orqali chek ma'lumotini qaytaradi. Octo uchun: savat tarkibi har bir
mahsulotning `spic` (ИКПУ) kodi bilan yuboriladi.

**2-yo'l — o'z virtual kassamiz** OFD orqali.

## 7.3 Kritik yo'ldagi vazifa

**Har bir SKU uchun ИКПУ/MXIK klassifikator kodi, qadoq kodi va QQS
belgisi kerak.** Bu avtomatik yaratilmaydi va aynan shu narsa
ko'pincha eng oxirida aniqlanadi — keyin butun katalogni qayta
to'ldirishga to'g'ri keladi.

**Buni birinchi navbatga qo'ying.** Admin paneldagi mahsulot
sahifasida bu maydonlar majburiy bo'lsin, importda ham shunday.

Yana bir ogohlantirish: yuzlab SKU li katalogda to'lov tizimlari chek
ichida har bir mahsulotni ko'rsatishda qiynalishi mumkin. **Har bir
PSP bilan SKU darajasidagi fiskallashtirish imkoniyatini yozma
tasdiqlang.**

## 7.4 Ro'yxatdan o'tish

Vazirlar Mahkamasining 885-sonli qarori (26.12.2024) "elektron tijorat
operatorlari" uchun talablar belgilaydi. Muhim istisno: **faqat o'z
tovari haqida ma'lumot beruvchi va vositachilik qilmaydigan shaxs
elektron tijorat operatori hisoblanmaydi.** ALIVER o'z mahsulotini
sotgani uchun yengilroq rejimga tushadi — lekin buni yurist bilan
tasdiqlang.

## 7.5 SMS

OTP va buyurtma xabarlari uchun mahalliy provayder — **Eskiz.uz** yoki
**Play Mobile**. Abstraksiya orqali ulanadi: provayderni almashtirish
kodni o'zgartirmasin.

---

# 8. Banner tizimi haqida

Siz mahsulotlarni banner ko'rinishida AI bilan yasashni so'radingiz.
Bu yerda ochiq gapirishim kerak.

**Bu sessiyada AI rasm generatsiyasi yo'q** — men rasm chiza olmayman.

Lekin undan muhimrog'i: **kosmetika uchun AI mahsulot rasmi noto'g'ri
yechim.** Sabab oddiy — bannerdagi mahsulot mijozga keladigan mahsulot
bilan **bir xil bo'lishi kerak**. AI qadoqni, yorliqni, rangni
o'zgartiradi; bu ishonchni ham, huquqiy jihatni ham buzadi. Baymard
tadqiqoti ham shuni ko'rsatadi: kosmetikada mijoz **haqiqiy surat**
kutadi — surtilgan namuna, haqiqiy teri.

Shuning uchun to'g'ri yechim boshqacha va u aslida arzonroq:

**Banner shabloni tizimi** — kompozitsiya, gradient, tipografiya va
joylashuv kod bilan yoziladi, **mahsulot surati esa haqiqiy** bo'ladi
va shablonga qo'yiladi. Fon, yorug'lik dog'lari va bezak elementlari
CSS/SVG bilan generatsiya qilinadi.

Bu quyidagini beradi: bannerni o'zgartirish uchun dizayner kerak emas
(admin paneldan matn va rasm almashtiriladi), hamma banner bir xil
uslubda chiqadi, mobil qurilmada avtomatik moslashadi, va rasm
o'lchami kichik bo'ladi.

Alohida fayl sifatida **banner shablonlari namunasi** tayyorlandi —
6 xil maket, TZ-2 dagi palitra va tipografika bilan.

---

# 9. Ushbu qism bo'yicha ishlar tartibi

Birinchi — **ИКПУ kodlari va fiskal integratsiya**, chunki u kritik
yo'lda va kech aniqlansa katalogni qayta to'ldirishga majbur qiladi.

Ikkinchi — **to'lov: Click va Payme**, keyin Uzum. Uchinchi —
**kuryer abstraksiyasi va EMU**.

To'rtinchi — **checkout** (4-bo'lim) va **yangi bloklar** (3-bo'lim).

Beshinchi — **mahsulot kartochkasi va tarkib qatlamlari** (2.2, 2.3) —
bular kontent ishi bo'lgani uchun parallel ketishi mumkin.

Oltinchi — **filtr arxitekturasi va SEO sahifalari** (2.4, 2.7).

Yettinchi — **sharhlar, soya tanlagichi, namunalar, sodiqlik dasturi**.
