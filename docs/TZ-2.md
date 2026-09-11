# ALIVER.UZ — Texnik topshiriq, 2-nashr

Sana: 2026-09-11 · Asos: aliver.com auditi (11.09.2026), amaldagi kod bazasi
tekshiruvi, Shopify Admin / Saleor / Medusa / Sylius qiyosiy tahlili

Bu hujjat birinchi TZ ni bekor qilmaydi — uni **almashtiradigan** joylari
aniq ko'rsatilgan. Har bir taklif sababi bilan berilgan, chunki sababsiz
talab keyinchalik e'tirozsiz o'zgartiriladi va loyiha yana chetga chiqadi.

---

# 0. Auditning asosiy xulosasi

Eng muhim xulosani boshida aytaman, chunki u qolgan hamma narsaga ta'sir
qiladi.

**aliver.com ni dizayn namunasi sifatida olish kerak emas.** Uning
*kontent modeli* qimmatli, *ko'rinishi* esa yo'q. Buni fikr sifatida emas,
o'lchov sifatida aytyapman — saytni brauzerda ochib, haqiqiy qiymatlarini
o'qidim:

Shrift butun saytda **Roboto** — Android tizim shrifti, brendga hech qanday
aloqasi yo'q. Asosiy rang **#3F72E5** — korporativ ko'k; go'zallik brendi
emas, SaaS paneliga o'xshaydi. Mahsulot sarlavhasi `<h1>` bor-yo'g'i
**21 px**, "Savatga" tugmasi matni esa **9.4 px** — ya'ni sahifadagi eng
muhim tugma eng mayda matnga ega.

Undan tashqari, ishlab chiqarishda **tahrirlanmagan mavzu andozalari**
qolgan: `Collection tabs description`, `Subscription description`,
`Describe your recently viewed products here`, `Add a short description for
your collections`. Footer ikkita ustundan iborat — **«Company» va
«Resources»** — va ikkalasining ichidagi havolalar **bir xil**. `Aliver hall
of fame` sahifasi butunlay bo'sh holda ishga tushirilgan. URL manzillarida
xatolar bor (`start-your-buisness`, `aliver-chirstmas-featured`), matnlarda
ham (`recieve`). Brend o'z sahifalarida **uchta bir-biriga zid tashkil
etilish tarixini** aytadi: "founded in the USA, 2012", "Founded in 2013 in
China" va Shenzhen ishlab chiqaruvchisi sifatida.

Shundan kelib chiqib: **taksonomiya va kontent modelini ko'chiramiz,
vizual tilni noldan quramiz.** Bu sizning "beauty uslubda, jonli" degan
talabingiz bilan to'liq mos keladi — aliver.com ni nusxalash aynan buni
imkonsiz qilardi.

---

# 1. aliver.com dan nimani olamiz

## 1.1 Katalog taksonomiyasi

Amaldagi tuzilma — ikki daraja: sakkizta asosiy kategoriya (Nail, Make up,
Foot & Hand, Hair Care, Skin Care, Men's Care, Oral, Other) va ularning
ichida ichki kategoriyalar. Mega-menyuda faqat ikkita kategoriya — Make up
va Nail — ochib ko'rsatiladi, chunki aylanmaning asosiy qismi shularda.

Bu mantiqni saqlaymiz, lekin **taksonomiyani tozalaymiz**. Hozir u
takrorlanadi: `Cleanser` va `Body Cleanser`; `Cream`, `Face Cream` va
`Facial Moisturisers`; `Foot Care`, `Foot & Hand`, `Foot Hand & Nail` va
`Foot Mask` — to'rttasi bir hududni qoplaydi. Mijoz qaysi biriga bosishni
bilmaydi, SEO esa o'zaro raqobatlashadi. `Digital Gift Card` kategoriyasi
menyuda turibdi va **nol mahsulotga ega**.

Qoida: har bir mahsulot **aniq bitta** asosiy kategoriyaga tegishli
bo'ladi; qolgan guruhlar — kolleksiya (marketing to'plami), kategoriya
emas.

## 1.2 Variant modeli — eng muhim texnik xulosa

Bu aliver.com dagi eng o'ziga xos narsa va uni to'g'ri tushunmaslik butun
loyihani buzadi.

Katalogda **rang/o'lcham** o'qlari deyarli ishlatilmaydi. Buning o'rniga
bitta o'q bor va u **to'plam, komplekt va dona sonini** kodlaydi. Misol
uchun "Magic Nail Polish Remover" da sakkizta variant: `Manual-practical
Set (2Pac) $26.99`, `Nail Removal & Repair Kit $25.99`, `2Pcs (Blue & Plum)
$15.99`, `Nail Remover (1Pac) $9.99` va hokazo. Jamaican Black Castor Oil
da esa **o'n to'qqizta** qiymat.

Bundan uchta talab kelib chiqadi. Birinchidan, variant tanlagich uzun
matnli 2–19 qiymatni ko'tara olishi kerak — rang doirachalari emas,
o'ralib ketadigan tugmalar yoki ochiluvchi ro'yxat. Ikkinchidan, narx
"eng arzon variantdan boshlab" ko'rsatiladi. Uchinchidan — va bu eng
qimmati — **dona/to'plam chegirmalari variant sifatida emas, alohida
mexanizm sifatida qurilishi kerak** (3.4-bo'limga qarang), aks holda
katalog boshqarib bo'lmas darajada shishadi.

Yana bir kuzatuv: variant o'qining nomi mahsulotdan mahsulotga
o'zgaradi — `Style`, `Size`, `Other`. Aynan shuning uchun kategoriya
filtrlari ishlamaydi: Nail kategoriyasidagi 65 mahsulotdan "Color" filtri
faqat 9 tasini qamraydi, "Size" esa `75ml` bilan `#8` (tirnoq o'lchami) ni
aralashtiradi. **Bizda variant o'qlari lug'atdan tanlanadi**, erkin matn
emas.

## 1.3 Mahsulot sahifasining kontent modeli

Tavsiflar bir xil tartibda yozilgan va bu tartib yaxshi: foyda matni →
`Specifications` (yorliq/qiymat juftliklari) → `HOW TO USE` (raqamlangan
qadamlar) → `Ingredient` → `Package Includes` → `Caution`. Buni
**tuzilmali maydonlar** sifatida qilamiz, HTML bloki sifatida emas — shunda
mahsulotlar bir xil ko'rinadi, tarjima qilinadi va filtrlanadi.

Ishonch matnlari ham takrorlanadi va go'zallik bozorida ishlaydi:
"vegan va cruelty-free", "10 Free (non-toxic)", "82% tabiiy manbali
tarkib". Bularni **belgi (badge) tizimi** sifatida qilamiz.

Rasmlar soni mahsulotdan mahsulotga 1 dan 23 gacha farq qiladi. Bu
tarqoqlik yomon ko'rinadi. Qoida: har bir mahsulotda **kamida 4 ta**
rasm — qadoq, mahsulot, tekstura/qo'llanish, natija.

## 1.4 Saqlab qolinadigan boshqa yechimlar

Mahsulot kartochkasida yashil nuqta bilan **«38 in stock, ready to ship»**
yozuvi bor. Bu oddiy, lekin kuchli ishonch signali — O'zbekistonda
"bormi-yo'qmi" savoli juda keskin, shuning uchun buni albatta olamiz.

Blog aslida **SEO dvigateli**: har bir mahsulot uchun bitta maqola,
jami ~65 ta. Bu strategiya ishlaydi va uni saqlaymiz.

Huquqiy sahifalar to'plami to'liq: FAQ, yetkazish, qaytarish, shartlar,
maxfiylik, intellektual mulk, to'lov usullari, yangi foydalanuvchi
qo'llanmasi. **Lekin** aliver.com da bir xil mavzuda **ikkita boshqa-boshqa
hujjat** bor: `/pages/refund-return-policy` va `/policies/refund-policy`
turli shartlarni yozadi. Bizda har bir siyosat uchun **bitta manba**
bo'ladi.

## 1.5 Olinmaydigan narsalar

Ikki ustunli takrorlanuvchi footer, bo'sh sahifalar, andoza matnlari,
Roboto shrifti, #3F72E5 ko'k rangi, 9 px li tugma matni, PayPal-ga
bog'langan to'lov oqimi va 250 ta davlat tanlagichi (bizda O'zbekiston,
keyinchalik MDH).

---

# 2. Brend va dizayn tizimi

Siz "beauty uslubda, jonli, ranglar yaxshi tanlangan" dedingiz. Quyida
buni aniq qiymatlarga aylantiraman, chunki "chiroyli bo'lsin" degan talab
tekshirib bo'lmaydi.

## 2.1 Logotip

Amaldagi logotip **yaxshi** va uni saqlaymiz: `ALIVER®` — yupqa, keng
oraliqli, geometrik display harflar; `I` harfi o'rnida stilizatsiyalangan
apostrof-tomchi; yuqorida `®`. Bu yagona element bo'lib, aliver.com da
haqiqatan brend darajasida ishlangan.

Talab: logotip **SVG** bo'ladi (rasm emas), bitta rangda ishlaydi, qora va
oq fonda ham o'qiladi, minimal kengligi 96 px. Animatsion variantda
apostrof-tomchi sahifa ochilganda **bir marta** tushadi (600 ms, keyin
to'xtaydi) — takrorlanuvchi animatsiya charchatadi.

## 2.2 Rang palitrasi

Asos: go'zallik brendi uchun ko'k rang noto'g'ri tanlov. Taklif — **issiq
atirgul + chuqur olxo'ri + shampan** uchligi. Ko'zni charchatmaydi, mahsulot
rasmlari (ko'pincha yashil, jigarrang, oq qadoq) bilan urishmaydi va
O'zbekiston bozorida "qimmat" o'qiladi.

| Token | Qiymat | Kontrast (oq fonda) | Vazifasi |
|---|---|---|---|
| `--alv-ink` | `#1A1218` | 18.4:1 | Asosiy matn, iliq qora |
| `--alv-ink-2` | `#4A4048` | 9.9:1 | Ikkilamchi matn |
| `--alv-muted` | `#6E6270` | 5.8:1 | Uchinchi darajali matn |
| `--alv-brand` | `#D42A64` | 4.7:1 | **Asosiy harakat**: tugma foni, havola, faol holat |
| `--alv-brand-deep` | `#A8285A` | 6.7:1 | Bosilgan va hover holati |
| `--alv-brand-soft` | `#E0457B` | 4.0:1 | **Faqat bezak**: gradient, katta sarlavha, fon dog'i |
| `--alv-plum` | `#3D1B33` | 15.0:1 | Chuqur fon, footer, premium bloklar |
| `--alv-champagne` | `#C9A86A` | 2.3:1 | **Faqat bezak**: chiziq, ramka, belgi foni — matn emas |
| `--alv-blush` | `#FDF4F7` | — | Yumshoq sirt |
| `--alv-surface` | `#FFFFFF` | — | Kartochka foni |
| `--alv-line` | `#EDE3E8` | — | Chegara |
| `--alv-mint` | `#1F7A5C` | 5.3:1 | Muvaffaqiyat, "omborda bor" |
| `--alv-amber` | `#9A5A12` | 5.5:1 | Ogohlantirish, "kam qoldi" |
| `--alv-danger` | `#C0392B` | 5.4:1 | Xato, bekor qilish |

Kontrast ustunini **hisoblab chiqdim**, ko'z bilan baholamadim. Sabab:
dastlab asosiy rang sifatida `#E0457B` ni tanlagandim va u yetarli deb
o'ylagandim — hisoblaganda **3.96:1** chiqdi, ya'ni WCAG AA (4.5:1) dan
past.

Ikkinchi tuzatish kodga joriy qilish paytida chiqdi va u muhimroq.
Bu jadvaldagi qiymatlar dastlab **sof oq** (`#FFFFFF`) fonda
hisoblangan edi. Saytning haqiqiy sahifa foni esa `#FFF9FC` — biroz
quyuqroq. `#D6336C` sof oqda 4.62:1 beradi, **haqiqiy fonda esa
4.44:1**, ya'ni amalda AA dan pastga tushadi. Shuning uchun asosiy
rang `#D42A64` ga o'zgartirildi: sahifa fonida 4.68:1, kartochka
fonida 4.87:1.

Xulosa: kontrast **har doim elementning haqiqiy foni** bilan
o'lchanadi, "oq" deb taxmin qilinmaydi.

Xuddi shu sababdan yashil va sariq ranglar ham quyuqlashtirildi: odatdagi
"yumshoq" yashil (`#2FA37C`) 3.16:1 beradi va kichik matn uchun
yaroqsiz.

Qoida: **`brand-soft` va `champagne` ranglarida hech qachon oddiy
o'lchamdagi matn yozilmaydi.** Ular chiziq, fon va katta sarlavha uchun.

## 2.3 Tipografika

| Rol | Shrift | Sabab |
|---|---|---|
| Display (sarlavha) | **Prata** | Yuqori kontrastli didone serif — go'zallik va parfyumeriya sohasining tili. Kirill va lotin to'liq. Playfair Display o'rniga tanlandi: u juda keng tarqalgan va saytni tanib bo'lmas qiladi |
| Matn | **Golos Text** | Kirill uchun maxsus loyihalangan (Paratype) — ruscha matn ritmi Inter'dan sezilarli yaxshi. Lotin ham to'liq, raqamlar tabular: narx jadvallari uchun muhim |

O'lchamlar (`clamp` bilan, mobil → desktop):

`h1` 34→62 px · `h2` 26→40 px · `h3` 20→26 px · matn 16→17 px ·
kichik 14 px · belgi 12 px.

Eng muhim tuzatish: **hech qanday interaktiv element matni 14 px dan
kichik bo'lmaydi.** aliver.com dagi 9 px li "Add to cart" — to'g'ridan-
to'g'ri konversiyani yo'qotadigan xato.

Shriftlar `font-display: swap` bilan, faqat kerakli belgilar to'plami
(latin + latin-ext + cyrillic) yuklanadi.

## 2.4 Harakat va "jonlilik"

Siz 3D/4D effektlar so'radingiz. Buni **o'lchovli** qilib beraman, chunki
nazoratsiz animatsiya saytni sekinlashtiradi va arzon ko'rsatadi.

Bosh sahifa hero qismida — **WebGL shader** (domain-warped fbm). U allaqachon
yozilgan va Three.js emas, xom shader: ~2 kB, kutubxona 150–600 kB o'rniga.
Kadr vaqti o'lchanadi; 24 kadrning o'rtachasi 24 ms dan oshsa, shader
o'chadi va statik gradient qoladi. Shu tariqa kuchsiz telefonda sayt
sekinlashmaydi.

Qolgan hamma joyda — CSS. Aniq ro'yxat:

Skroll paytida bloklar pastdan 16 px ko'tarilib paydo bo'ladi (`IntersectionObserver`,
har biri bir marta, 400 ms). Mahsulot kartochkasi ustiga kelganda rasm
ikkinchi rasmga 300 ms da almashadi va kartochka 4 px ko'tariladi.
Savatga qo'shilganda mahsulot rasmining nusxasi savat ikonasiga uchadi
(500 ms). Sahifalar orasida o'tishda kontent 200 ms da so'nadi. Narx
o'zgarganda raqam yuqoriga siljib almashadi.

Majburiy shart: `prefers-reduced-motion: reduce` bo'lsa **hamma
animatsiya o'chadi**, WebGL ham. Bu shunchaki xushmuomalalik emas — ba'zi
foydalanuvchilarda harakat bosh aylanishi chaqiradi.

## 2.5 Fotografiya

Hozirgi rasmlar yetkazib beruvchi uslubida: infografika, matn yozilgan
banner. Ular "go'zallik brendi" emas, "bozor" degan taassurot beradi.

Talab: har bir mahsulot uchun **bir xil sharoitda** olingan to'rtta rasm —
oq/bej fonda qadoq, tekstura yaqin plan, qo'llanish, natija. Kvadrat
1:1, kamida 1600 px, WebP + JPEG zaxira. Banner va lifestyle rasmlar 16:9
yoki 2:1.

---

# 3. Do'kon tomoni (storefront)

Bu bo'lim birinchi TZ ni **to'ldiradi**, bekor qilmaydi. Faqat
o'zgarishlar va yangi talablar yozilgan.

## 3.1 Bosh sahifa tuzilishi

aliver.com dagi tartibni oldim va tozaladim. Yuqoridan pastga:

E'lon chizig'i (bitta xabar, yopiladigan, cookie'da eslab qolinadi) →
sarlavha (logotip markazda, qidiruv chapda, kabinet va savat o'ngda) →
**hero** (WebGL, bitta kuchli xabar va bitta tugma — aylanadigan slayder
emas: ikkinchi slayd deyarli hech qachon ko'rilmaydi) → kategoriya
plitkalari (8 ta, rasm bilan) → **«Yangi kelganlar»** karuseli →
qiziqish blokari (nega ALIVER: original, yetkazish, to'lov) →
**«Ko'p sotilganlar»** → brend hikoyasi (qisqa, rasm bilan) → blog
(3 ta oxirgi maqola) → obuna → footer.

Olib tashlanadi: ikkinchi slayder, YouTube video bloki (sahifani
sekinlashtiradi va ko'rilmaydi), takrorlanuvchi bo'sh joy bloklari.

## 3.2 Katalog va filtrlar

Filtrlar **variantdan avtomatik emas, qo'lda belgilangan atributlardan**
yasaladi. aliver.com dagi asosiy xato shu edi.

Har bir mahsulotga majburiy atributlar: kategoriya, brend, hajm/o'lcham,
teri yoki soch turi (tegishli bo'lsa), asosiy tarkib, belgilar (vegan,
parabensiz va h.k.), narx.

Filtr paneli: mavjudlik, narx (ikki uchli slayder), kategoriya, brend,
belgi, atribut. Har bir filtr yonida **nechta mahsulot** borligi
ko'rsatiladi va nol natijali variant o'chirilgan holda turadi — mijoz
bo'sh natijaga bormaydi.

Saralash: mos kelishi bo'yicha, mashhurlik, yangilik, narx ↑, narx ↓,
reyting. Standart — mashhurlik.

Sahifalash: raqamli (cheksiz skroll emas — SEO va "3-sahifa" ga qaytish
uchun). Sahifada 24 ta.

URL har bir filtrda o'zgaradi (`?brend=aliver&narx=50000-200000`), ya'ni
havola ulashsa bo'ladi. Filtrlangan sahifalar `noindex` — indeks
ifloslanmasligi uchun.

## 3.3 Mahsulot sahifasi

Chapda rasm galereyasi (vertikal eskizlar, kattalashtirish, sur'atli
listlash), o'ngda **yopishib turuvchi** sotib olish bloki.

Sotib olish blokida: brend → nomi → reyting va sharhlar soni (bosilganda
sharhlarga sakraydi) → narx (eski narx chizilgan holda, chegirma foizi
belgisi bilan) → variant tanlagich (uzun matnlarni ko'taradigan tugmalar)
→ **ombor holati** ("12 dona bor, bugun jo'natiladi" / "kam qoldi" /
"tugadi — xabar bering") → soni → **Savatga** (asosiy, katta) →
**Bir bosishda buyurtma** (ikkilamchi) → yetkazish muddati va narxi
(mijoz shahriga qarab) → ishonch belgilari.

Pastda: tuzilmali tavsif (1.3-bo'limdagi tartib), tarkib ro'yxati,
qo'llanish qadamlari, savol-javob, sharhlar (rasm bilan, foydali deb
belgilash, reyting taqsimoti), **«Birga olinadi»** to'plami va
**«O'xshash mahsulotlar»**.

Yangi talab: **to'plam taklifi** — "buni + bunisi = 15% arzon", bitta
tugma bilan ikkalasi savatga tushadi.

## 3.4 Dona/to'plam chegirmalari

aliver.com da bu variant sifatida qilingan va katalogni shishirgan.
Bizda **alohida mexanizm**: mahsulotga "2 dona — 10%, 3 dona — 15%"
jadvali biriktiriladi, mahsulot sahifasida jadval ko'rinadi, soni
o'zgarganda narx darhol qayta hisoblanadi. Katalogda esa bitta mahsulot
qoladi.

## 3.5 Savat va checkout

Savat **yon panel** sifatida ochiladi (sahifa almashmaydi), to'liq
sahifa ham mavjud.

Savatda: bepul yetkazishgacha **progress chizig'i** (aliver.com da faqat
matn bor edi — chiziq sezilarli darajada yaxshi ishlaydi), soni
o'zgartirish, o'chirish + **«Qaytarish»** (undo), promokod maydoni,
"birga olinadi" taklifi, jami.

Checkout **bitta sahifada**, to'rt blok: aloqa → yetkazish → to'lov →
tasdiq. Mehmon sifatida buyurtma berish majburiy imkoniyat. Telefon
raqami maskasi `+998 (__) ___-__-__`. Manzil viloyat → tuman →
ko'cha ketma-ketligida.

To'lov: Click, Payme, Uzum, naqd (kuryerga). Har biri uchun holat
alohida kuzatiladi.

## 3.6 Kabinet

Buyurtmalar (holat kuzatuvi bilan), manzillar, sevimlilar, sharhlarim,
bonuslar, sozlamalar. Buyurtma holati **ko'rinadigan bosqichlar** bilan:
qabul qilindi → yig'ilmoqda → yo'lda → yetkazildi.

## 3.7 Til va valyuta

Interfeys **uz (lotin)** va **ru**. Kontent ham ikki tilda — mahsulot
nomi, tavsifi, kategoriya, blog. Tarjima yo'q bo'lsa asosiy tilga
qaytadi va admin panelda "tarjima kerak" belgisi chiqadi.

Valyuta — **so'm**, ichkarida har doim **tiyin** (`BigInt`). Suzuvchi
nuqta ishlatilmaydi.

---

# 4. Admin panel

Bu hujjatning asosiy qismi. Siz "hozirgi adminka juda oddiy, unaqa
bo'lmasligi kerak" dedingiz — to'g'ri. Quyida Shopify Admin darajasidagi
talablar.

Boshida bitta tamoyil: **jiddiy adminning uchdan bir qismi — Sozlamalar.**
Havaskor adminlar aynan shu qismni tashlab ketadi va natijada do'kon
ishlay boshlagach har bir o'zgarish dasturchiga tushadi.

## 4.1 Umumiy tuzilma

```
Bosh sahifa (dashboard)
Buyurtmalar → Qoralamalar · Tashlab ketilgan savatlar · Qaytarishlar
Mahsulotlar → Ombor · Kolleksiyalar · Kategoriyalar · Import/eksport
Mijozlar → Segmentlar · B2B kompaniyalar
Kontent → Sahifalar · Blog · Menyular · Fayllar · Bannerlar · Redirectlar
Marketing → Chegirmalar · Promokodlar · Kampaniyalar · UTM
Moliya → To'lovlar · Moslashtirish · Fiskal cheklar · Qaytarilgan pullar
Hisobotlar
Sozlamalar (~15 sahifa)
```

## 4.2 Barcha ro'yxatlar uchun umumiy talablar

Bu bo'lim eng muhimi, chunki u **har bir** ro'yxatga tegishli va aynan
shu narsa adminni "oddiy" dan "professional" ga o'tkazadi.

**Saqlangan ko'rinishlar (saved views).** Ro'yxat tepasida tab'lar:
standart ko'rinishlar (o'chirib bo'lmaydi) va foydalanuvchi yaratganlari.
Ko'rinish — bu filtr + qidiruv + ustunlar + saralash to'plami. "Toshkent,
yig'ilmagan, oxirgi 7 kun" bir bosishga aylanadi. Ko'rinish dinamik:
shartga mos yangi yozuv o'zi qo'shiladi. Nomini o'zgartirish, nusxalash,
o'chirish mumkin.

**Ustunlar.** Ko'rsatish/yashirish, tartibini sudrab o'zgartirish,
kenglikni o'zgartirish. Sozlama **har bir ko'rinish uchun alohida**
saqlanadi. "Dastlabki holatga qaytarish" tugmasi ko'rinarli joyda —
foydalanuvchi qo'rqmasdan tajriba qilsin.

**Filtrlar.** Bir nechta filtr birga ishlaydi, `va`/`yoki` mantiqi bilan.
Har bir filtrda `teng` / `teng emas` operatorlari.

**Ommaviy amallar.** Qatorlarni belgilash, `Shift` bilan diapazon,
"barcha sahifalardagi N ta" ni belgilash. Belgilangach pastda
**yopishib turuvchi panel** chiqadi: 2–3 ta asosiy amal va "Yana".
O'chirish kabi amallar **sonni aytib** tasdiqlaydi ("248 ta mahsulot
o'chirilsinmi?").

**Joyida tahrirlash va undo.** Teg, holat, soni kabi arzon
o'zgarishlar **darhol ko'rinadi** (optimistik), keyin server bilan
solishtiriladi; xato bo'lsa orqaga qaytadi va xabar chiqadi. Qaytarib
bo'ladigan amallar uchun tasdiq oynasi emas, **«Bekor qilish» tugmali
xabar** chiqadi.

**Klaviatura.** `Ctrl/Cmd+K` — global qidiruv. `?` — yorliqlar ro'yxati.
`G` + harf — bo'limga o'tish. `A` + harf — yangi yozuv. `/` — filtrga
fokus. O'q tugmalari + probel — qator belgilash. Kuniga 200 ta
buyurtma qayta ishlaydigan xodim uchun bu sezilarli tezlik.

**Bo'sh holatlar.** "Hali yozuv yo'q" (yaratish tugmasi bilan) va
"Bu filtrga mos natija yo'q" (filtrni tozalash tugmasi bilan) — **ikki
xil ekran**. Yuklanayotganda spinner emas, skelet qatorlar.

**Sahifalash** raqamli va barqaror kursor bilan. Minglab qator bo'lgan
joylarda (ombor, redirectlar) virtualizatsiya.

## 4.3 Buyurtmalar

### Ro'yxat

Ustunlar: raqam, sana, mijoz, jami, to'lov holati, yig'ish holati,
dona soni, yetkazish usuli, teglar.

Filtrlar: buyurtma holati (ochiq / arxiv / bekor), to'lov holati
(kutilmoqda / to'langan / qisman to'langan / qaytarilgan / qisman
qaytarilgan / bekor), yig'ish holati (yig'ilmagan / qisman / yig'ilgan /
kutilmoqda), yetkazish holati (yo'lda / yetkazildi / muvaffaqiyatsiz),
qaytarish holati, jami summa (oraliq), dona soni, yetkazish usuli,
hudud (viloyat/tuman), mahsulot, promokod, kanal, teg, sana (bugun /
7 kun / 30 kun / 90 kun / ixtiyoriy oraliq).

Tepada operativ ko'rsatkichlar chizig'i: davr bo'yicha buyurtmalar soni,
yig'ilganlari, qaytarilganlari, o'rtacha yig'ish vaqti.

Ommaviy amallar: yig'ish, to'lovni olish, yorliq chop etish, arxivlash,
teg qo'shish, eksport.

### Buyurtma sahifasi

Ikki ustunli: chapda ish oqimi, o'ngda kontekst.

Chapda — **yig'ilmagan mahsulotlar paneli** (rasm, nom, variant, SKU,
soni, narx), **yig'ish oynasi** (kuryer/pochta tanlash, trek raqami,
"mijozga xabar berish" belgisi), **to'lov paneli** (oraliq jami,
chegirma, yetkazish, soliq, jami, to'langan, qolgan; amallar: to'lovni
olish, qaytarish, bekor qilish, hisob-faktura yuborish).

**Vaqt chizig'i (timeline)** — eng muhim element. Tizim hodisalari
(to'lov, yig'ish, yuborilgan xabar, holat o'zgarishi) **xodim izohlari**
bilan aralash ko'rsatiladi. Izohga fayl biriktirish va mahsulot/mijozga
havola qo'yish mumkin. Yuborilgan SMS yoki e-pochtani shu yerdan
**qayta yuborish** mumkin.

O'ngda — izoh, mijoz kartasi (buyurtmalar soni, aloqa, manzillar,
mijozni almashtirish), qayerdan kelgani (UTM, referrer), teglar.

Qo'shimcha amallar: arxivlash, **bekor qilish** (sababi bilan, omborga
qaytarish tanlovi bilan, mijozga xabar berish belgisi bilan),
**nusxalash** (qoralama buyurtma yaratadi), hisob-faktura va yig'ish
varaqasini chop etish, tasdiqnomani qayta yuborish.

### Buyurtmani tahrirlash

Bu aksariyat oddiy adminlarda umuman yo'q va aynan shu yerda pul
yo'qoladi.

Mumkin: mahsulot qo'shish/olib tashlash, sonini o'zgartirish, qo'lda
qator qo'shish, yetkazish narxini o'zgartirish, qator chegirmasi,
manzilni tuzatish. Summa oshsa — mijozga **yangilangan hisob** yuboriladi;
kamaysa — farq qaytariladi.

Mumkin emas: **allaqachon yig'ilgan** qatorni o'chirish yoki kamaytirish,
buyurtma darajasidagi chegirmani o'zgartirish, yetkazish usulini
almashtirish. Bu cheklovlar TZ ga ataylab yoziladi — ularsiz hisobot va
ombor mos kelmay qoladi.

Tahrirlash **alohida huquq** sifatida beriladi.

### Qaytarish va bekor qilish

Qisman qaytarish, asl summagacha **takroran**. Yetkazish narxini alohida
qaytarish. **Omborga qaytarish belgisi standart yoqilgan**, har bir
qator uchun o'chirib bo'ladi. Ichki sabab (mijozga ko'rinmaydi) va
"mijozga xabar berish" belgisi.

Muhim qoida: **qaytarilgan pulni orqaga qaytarib bo'lmaydi** va
qaytarishdan keyin qaytarish so'rovi yaratib bo'lmaydi. Tizim bu
tartibni majburlaydi.

### Qoralama buyurtmalar

To'liq buyurtma yaratish ekrani: mahsulot qidirish, qo'lda qator
qo'shish, qator va buyurtma chegirmasi (sababi bilan), mijoz tanlash
yoki yaratish, **omborda rezerv qilish** tanlovi, izoh va teglar.
To'lov yo'llari: to'lov havolasi yuborish, "to'langan deb belgilash",
to'lov muddati qo'yish. To'langach haqiqiy buyurtmaga aylanadi.

Telefon orqali buyurtma qabul qilish O'zbekistonda keng tarqalgan —
bu ekran majburiy.

### Tashlab ketilgan savatlar

Mijoz aloqa ma'lumotini kiritib, to'lovni tugatmasa, **10 daqiqadan
keyin** savat tashlab ketilgan hisoblanadi. Ro'yxatda: mijoz, mahsulotlar,
summa, vaqt, xabar holati, qaytarish holati. Qaytarish xabari avtomatik
(kechikish sozlanadi) yoki qo'lda yuboriladi. Mijoz havola orqali
qaytib buyurtma bersa, holat o'zi o'zgaradi.

## 4.4 Mahsulotlar

### Ro'yxat va ommaviy tahrirlash

Ustunlar: rasm, nom, holat, ombor, narx, SKU, kategoriya, brend, teg.
Filtrlar: holat, kategoriya, brend, teg, ombor holati, narx oralig'i,
rasmi yo'qlar, tavsifi yo'qlar.

**Jadval ko'rinishidagi ommaviy tahrirlovchi**: bir nechta mahsulotning
bir nechta maydonini elektron jadval kabi tahrirlab, bitta amalda
saqlash. 500 ta mahsulot narxini ko'tarish shu bilan bir necha daqiqada
bajariladi.

### Mahsulot sahifasi

Asosiy: nom, tavsif (boy matn muharriri), **tuzilmali bloklar**
(tarkib, qo'llanish, spetsifikatsiya, ogohlantirish) — 1.3-bo'limga
muvofiq.

Media: rasm va video, **har biriga alt matn** (SEO va ekran o'quvchilar
uchun), tartibini sudrab o'zgartirish, variantga biriktirish.

Variantlar: o'qlar **lug'atdan** tanlanadi. Har bir variant uchun
SKU, shtrix-kod, narx, eski narx, **tannarx** (foydani hisoblash uchun),
og'irlik, ombor qoldig'i. Variantlar jadvalda ko'rsatiladi va joyida
tahrirlanadi.

Tashkiliy: kategoriya, brend, teglar, kolleksiyalar, mahsulot turi.

SEO: sarlavha (70 belgi), tavsif (160 belgi), URL, **qidiruv natijasi
ko'rinishi** (belgilar sanagichi bilan). URL o'zgarsa **avtomatik
redirect taklif qilinadi** — eski havolalar buzilmaydi.

Holat: qoralama / faol / arxiv, **rejalashtirilgan chop etish**
(sana va vaqt).

### Kolleksiyalar

Ikki xil: **qo'lda** (mahsulotlar tanlanadi, tartib sudrab
belgilanadi) va **avtomatik** (shart bo'yicha: "brend = ALIVER VA narx <
100 000 VA teg = yangi"). Avtomatik kolleksiya yangi mahsulot qo'shilganda
o'zi yangilanadi.

Har bir kolleksiyada SEO bloki va rasm.

### Import / eksport

Excel va CSV. Import **oldindan tekshiriladi**: nechta yangi, nechta
yangilanadi, nechta xato — xatolar **qator raqami va sababi bilan**
ro'yxat qilinadi va shu ro'yxatni yuklab olsa bo'ladi. Import fonda
bajariladi, jarayon foizi ko'rinadi, tugagach xabar keladi.

Eksport joriy filtrni hisobga oladi.

## 4.5 Ombor

Ko'p ombor (do'kon, asosiy sklad, filial). Har bir SKU uchun
**jami / rezervda / mavjud** alohida ko'rsatiladi — bu uchlik bo'lmasa
ortiqcha sotish (oversell) muqarrar.

Qoldiqni o'zgartirish **sababi bilan**: qabul qilindi, inventarizatsiya,
buzildi, yo'qoldi, qaytarildi. Har bir o'zgarish tarixda qoladi: kim,
qachon, qancha, nega.

Omborlar orasida ko'chirish. Kutilayotgan tovar (yo'ldagi partiya).
Kam qolganlar hisoboti va avtomatik ogohlantirish.

## 4.6 Mijozlar

Ro'yxat: ism, telefon, e-pochta, buyurtmalar soni, jami sarflagan,
oxirgi buyurtma, teg.

**Segmentlar** — shart bo'yicha dinamik guruh: "3 dan ko'p buyurtma
qilgan VA oxirgi 90 kunda faol emas". Segment chegirma va kampaniyada
ishlatiladi.

Mijoz sahifasi: buyurtmalar tarixi, umumiy qiymat (LTV), o'rtacha chek,
manzillar, izohlar (xodimlarga ko'rinadi), teglar, marketing roziligi,
**ma'lumotlarini eksport qilish va o'chirish** (shaxsiy ma'lumotlar
talabi).

## 4.7 Chegirmalar va narxlar

Ikki o'q: **usul** (promokod yoki avtomatik) va **tur**.

Turlari: mahsulotdan chegirma (foiz yoki summa, tanlangan mahsulot/
kolleksiyaga), buyurtmadan chegirma, **X olsang Y sovg'a**, bepul
yetkazish.

Sozlamalar: minimal summa yoki minimal dona, kimga tegishli (hamma /
segment / aniq mijoz), **umumiy foydalanish chegarasi** va **bitta
mijozga bir marta**, amal qilish sanasi (boshlanish va tugash), holati.

**Birikish matritsasi** — eng ko'p e'tibordan chetda qoladigan va eng
qimmatga tushadigan qism. Har bir chegirma qaysi turdagi boshqa
chegirma bilan **birga ishlashi mumkinligini** ochiq e'lon qiladi
(mahsulot / buyurtma / yetkazish). Busiz "ikkita kod qo'shib 90%
chegirma" hodisasi ertami-kechmi sodir bo'ladi.

Promokodlarni **ommaviy generatsiya qilish** (N ta noyob kod, CSV ga
eksport) — blogger va hamkorlar uchun.

B2B uchun **narx ro'yxatlari**: kompaniyaga biriktirilgan alohida
narxlar, dona bo'yicha pog'onali narx, minimal buyurtma miqdori.

## 4.8 Kontent

Sahifalar: boy matn muharriri (HTML manbasini ham tahrirlash mumkin),
chop etish holati va **rejalashtirilgan chop etish**, SEO bloki
ko'rinish namunasi bilan, URL o'zgarganda redirect taklifi.

Blog: bir nechta blog, har bir maqolada sarlavha, matn, **qisqacha**,
muqova rasmi, muallif, teglar, chop etish sanasi, SEO.

**Menyular**: nomlangan menyular, **uch darajagacha** ichma-ich,
sudrab tartiblash. Har bir element — matn + havola (mahsulot,
kategoriya, sahifa, blog yoki ixtiyoriy URL).

**Fayllar kutubxonasi**: yuklash, alt matn, qayerda ishlatilgani,
havolani nusxalash, almashtirish, o'chirish. Turi va o'lchami bo'yicha
filtr.

**Redirectlar**: qayerdan → qayerga, CSV import/eksport, ommaviy
o'chirish, qidiruv. Shopify'dan Aliver.uz ga ko'chishda bu **hayotiy
muhim**: eski havolalar ishlamasa, yig'ilgan SEO nolga tushadi.

**Bannerlar** va boshqa takrorlanuvchi kontent turlari uchun
**ta'rif/yozuv ajratmasi**: admin yangi "kontent turi"ni (masalan
"tarkib lug'ati") maydonlari bilan e'lon qiladi, keyin yozuvlar
qo'shadi. Har bir tur uchun alohida jadval yozilmaydi.

## 4.9 Hisobotlar

Bosh sahifada: bugungi tushum, buyurtmalar, o'rtacha chek, yangi
mijozlar, to'langan va bekor qilinganlar, kam qolgan mahsulotlar;
tushum, buyurtma, mijoz va konversiya grafiklari; davr tanlagichi
(bugun / kecha / 7 / 30 kun / oy / ixtiyoriy).

Hisobotlar to'plami:

**Sotuv** — vaqt bo'yicha, mahsulot bo'yicha, variant bo'yicha, brend
bo'yicha, promokod bo'yicha, hudud bo'yicha, kanal bo'yicha; o'rtacha
chek dinamikasi.

**Buyurtma** — vaqt bo'yicha, bekor qilish sabablari, yig'ish va
yetkazish vaqti.

**Mahsulot** — eng ko'p sotilgan, eng kam sotilgan, tugaganlar, ko'p
qaytariladiganlar, **sotilish tezligi** va **necha kunga ombor qolgan**.

**Mijoz** — yangi va qaytgan mijozlar, LTV, o'rtacha sarf, eng yaxshi
mijozlar, **kogorta tahlili**.

**Ombor** — qoldiq, rezerv, mavjud, tannarx qiymati, sotuv qiymati,
kam qolganlar, ABC tahlil.

**Moliya** — brutto va netto tushum, tannarx, yalpi foyda, chegirmalar,
qaytarishlar, yetkazish tushumi, soliqlar, to'lov turlari bo'yicha.

**Xatti-harakat** — konversiya voronkasi (sessiya → savat → checkout →
buyurtma), qidiruv so'rovlari, **natija bermagan qidiruvlar** (bu
katalogdagi bo'shliqni ko'rsatadi), qurilma bo'yicha sessiyalar.

Har bir hisobotda davr, filtr, ustun sozlamasi va **Excel/CSV eksport**.
Sozlangan hisobotni **saqlash** mumkin.

Qo'shimcha taklif: **hisobotni jadval bo'yicha pochtaga yuborish**
(masalan har dushanba ertalab haftalik sotuv). Shopify'da bu native
yo'q — bu yerda biz undan oldinda bo'lamiz va brend jamoasi uchun
haqiqatan foydali.

## 4.10 Sozlamalar

Do'kon (nomi, logotip, favicon, aloqa, manzil, vaqt mintaqasi, valyuta,
**buyurtma raqami formati** — prefiks/suffiks), to'lov provayderlari,
checkout sozlamalari, **yetkazish** (hududlar, tariflar, summa yoki
og'irlik bo'yicha shartlar, bepul yetkazish chegarasi, o'zi olib ketish),
soliqlar, omborlar, **bildirishnomalar**, xodimlar va huquqlar, tillar,
domenlar, siyosatlar, kontent turlari ta'riflari, API kalitlari va
webhook'lar, audit log.

**Bildirishnomalar** alohida e'tiborga loyiq. Har bir shablon (buyurtma
tasdiqlandi, jo'natildi, yetkazildi, bekor qilindi, qaytarish, parol
tiklash, OTP) uchun: mavzu va matnni **tahrirlash**, o'zgaruvchilar
ro'yxati, **oldindan ko'rish**, **sinov xabari yuborish**, avvalgi
versiyaga qaytarish. Ikki tilda. SMS shablonlari alohida.

Yana: **qaysi xodimga qaysi hodisada xabar borishi** sozlanadi (yangi
buyurtma, kam qoldi, to'lov muvaffaqiyatsiz).

## 4.11 Xodimlar va huquqlar

Sakkizta rol (birinchi TZ dagi ro'yxat to'g'ri): Super Admin,
Administrator, Operator, Ombor menejeri, Kontent menejeri, Marketing,
Moliya, Qo'llab-quvvatlash.

Huquqlar **modul × amal** kesishmasida beriladi: ko'rish, yaratish,
tahrirlash, o'chirish, eksport, tasdiqlash. Alohida "nozik" huquqlar
sifatida ajratiladi: **narxni o'zgartirish**, **chegirma yaratish**,
**buyurtmani tahrirlash**, **pul qaytarish**, **mijoz ma'lumotlarini
eksport qilish**, **xodim qo'shish**.

Amaliy misol: operator buyurtmani ko'radi va holatini o'zgartiradi,
lekin narxga tegolmaydi va pul qaytara olmaydi.

Har bir xodim uchun: ism, telefon, e-pochta, rol, holat, **oxirgi
kirish vaqti**, **2FA majburiymi**.

## 4.12 Operativ imkoniyatlar

**Global qidiruv** (`Ctrl/Cmd+K`): buyurtma raqami, mijoz telefoni va
ismi, mahsulot nomi, SKU, shtrix-kod, sahifa, chegirma. Natijalar
turlar bo'yicha guruhlanadi.

**Bildirishnomalar markazi**: yangi buyurtma, yangi sharh, kam qoldi,
to'lov muvaffaqiyatsiz, qaytarish so'rovi, B2B lid.

**Fon jarayonlari**: import, eksport, ommaviy tahrirlash — hammasi fonda,
jarayon foizi bilan; tugagach natija hisoboti (nechta muvaffaqiyatli,
nechta xato va nega).

**Audit log**: kim, qachon, qaysi modulda, qaysi yozuvni, **nimadan
nimaga** o'zgartirdi, qaysi IP dan. Filtrlanadi va eksport qilinadi.

## 4.13 O'zbekiston uchun maxsus talablar

To'lov: Click, Payme, Uzum — har biri uchun webhook idempotentligi
(bir xil xabar ikki marta kelsa ikki marta hisoblanmasligi).

**Fiskal chek (OFD)**: har bir to'lovdan keyin chek shakllanadi, admin
panelda holati ko'rinadi, muvaffaqiyatsiz bo'lsa qayta yuboriladi.

SMS: OTP va buyurtma xabarlari uchun mahalliy provayder (Eskiz,
Play Mobile) — abstraksiya orqali, provayderni almashtirish kodni
o'zgartirmasin.

Hududlar: viloyat → tuman ma'lumotnomasi, har biriga yetkazish tarifi
va muddati.

Telefon — asosiy identifikator (e-pochta emas), format `+998`.

---

# 5. Birinchi TZ ga nisbatan o'zgarishlar

Quyida faqat **farqlar**. Qolgan hamma narsa kuchida.

**Qo'shiladi:** saqlangan ko'rinishlar va ustun sozlamalari (4.2);
buyurtmani tahrirlash va uning cheklovlari (4.3); qoralama buyurtmalar
(4.3); tashlab ketilgan savatlar (4.3); ommaviy jadval tahrirlovchisi
(4.4); avtomatik kolleksiyalar (4.4); ko'p ombor va sabab bilan
o'zgartirish (4.5); mijoz segmentlari (4.6); chegirmalarning birikish
matritsasi va ommaviy promokod (4.7); menyular muharriri, fayllar
kutubxonasi, redirect boshqaruvi, kontent turlari (4.8); kogorta,
ABC va konversiya voronkasi hisobotlari, hisobotni pochtaga yuborish
(4.9); tahrirlanadigan bildirishnoma shablonlari (4.10); nozik huquqlar
(4.11); global qidiruv, fon jarayonlari (4.12); dona/to'plam chegirmasi
alohida mexanizm sifatida (3.4); to'plam taklifi (3.3).

**O'zgaradi:** 58-bo'lim (admin tuzilmasi) 4.1 bilan almashtiriladi —
`Reports` va `Users` o'rniga to'liq ierarxiya. 62–66-bo'limlar
(hisobotlar) 4.9 bilan kengaytiriladi. 74-bo'lim (huquqlar) 4.11 bilan
aniqlashtiriladi. Mahsulot tavsifi endi HTML bloki emas, **tuzilmali
maydonlar**.

**Olib tashlanadi:** ko'p valyuta va 250 davlat tanlagichi (O'zbekiston,
keyin MDH); PayPal; bosh sahifada ikkinchi slayder va video bloki.

---

# 6. Tavsiya etilgan tartib

Tartib ataylab "eng ko'rinadigan" dan emas, **eng ko'p to'siq
bo'layotgan** dan boshlanadi.

**1-navbat — adminni ochish.** Navigatsiyadagi ikkita kamchilikni
tuzatish (`docs/ADMIN-HOLAT.md`) va Dashboard'ni yozish. Bu bir necha
kunlik ish, lekin allaqachon qurilgan 20 ta sahifani darrov ishlatadi.

**2-navbat — sozlamalar va xodimlar.** Ularsiz do'konni haqiqiy ishga
tushirib bo'lmaydi: har bir o'zgarish uchun bazaga kirish kerak bo'ladi.

**3-navbat — ro'yxatlar platformasi (4.2).** Saqlangan ko'rinishlar,
ustunlar, ommaviy amallar — bir marta yoziladi, hamma ro'yxatga
qo'llaniladi. Shuning uchun uni alohida modul sifatida qurish kerak,
har bir sahifada takrorlash emas.

**4-navbat — buyurtma sahifasini kuchaytirish:** vaqt chizig'i,
tahrirlash, qoralama buyurtmalar.

**5-navbat — dizayn tizimi (2-bo'lim)** va bosh sahifa, katalog,
mahsulot sahifalarini yangi vizual tilga o'tkazish.

**6-navbat — chegirmalar, kolleksiyalar, kontent, hisobotlar.**

**7-navbat — sharhlar, B2B narx ro'yxatlari, kogorta hisobotlari.**

Dizayn beshinchi o'rinda turgani g'alati tuyulishi mumkin. Sabab: hozir
sayt **ishlamayotgan** joylari borligi uchun yo'qotmoqda, chiroyli
emasligi uchun emas. Admin ochilmaguncha va sozlamalar qo'shilmaguncha
har bir o'zgarish dasturchiga tushadi — bu esa dizaynni ham sekinlashtiradi.
