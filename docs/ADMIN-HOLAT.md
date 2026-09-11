# Admin panel — TZ talablari va haqiqiy holat

Sana: 2026-09-11 · Tekshirilgan commit: `26e3a1a`

## 1. Avval yaxshi xabar: login tuzaldi

Siz yuborgan ekran surati buni tasdiqlaydi — panelga `SUPER_ADMIN` sifatida
kirdingiz. "Ochilib yopiladi" muammosi yo'q. Sabab ham tasdiqlandi: endi
`https://aliver-uz-admin-stage.onrender.com/api/health` javob beryapti,
ya'ni brauzer API ga o'z domeni orqali boradi va cookie birinchi tomon
cookie'si bo'ladi.

Ya'ni autentifikatsiya, rollar, huquqlar va audit log ishlaydi.

## 2. Panel nega bo'sh ko'rinadi

Bu **ikkita alohida kamchilik**, ikkalasi ham bosqichma-bosqich qurish
paytidan qolib ketgan. Muhimi: bu sahifalar yo'qligidan emas.

**Birinchi sabab.** Bosh sahifa (`apps/admin/src/app/page.tsx`) hamon
1-etap maketi. Sidebar u yerda `<span>` bilan chizilgan — havola emas,
shuning uchun hech narsa bosilmaydi. Matn ham o'sha paytdan: "1-etap
yakunlandi… 2-etap — katalog". Bu matn 2-etapdan keyin yangilanmagan.

**Ikkinchi sabab, undan ham jiddiyroq.** Haqiqiy qobiq `AdminShell`
mavjud va u to'g'ri `<Link>` ishlatadi, lekin ichida shunday shart bor:

```js
const ready = item.stage <= 2;
href={ready ? item.href : '#'}
pointerEvents: ready ? 'auto' : 'none'
```

Natija teskari chiqqan. Bosiladigan bo'limlar — Kolleksiyalar, Adminlar,
Rollar, Sozlamalar — aynan **sahifasi yo'q** bo'lganlar, ya'ni 404 beradi.
Ishlaydigan 20 ta sahifa esa — Buyurtmalar, Ombor, To'lovlar, Mijozlar,
Qaytarishlar, Fiskal cheklar, Hisobotlar, Audit log va boshqalar —
`stage > 2` bo'lgani uchun o'chirib qo'yilgan.

Shuning uchun panel tayyor emasdek ko'rinadi. Aslida kodning katta qismi
joyida, faqat unga yo'l berilmagan.

## 3. Aslida nima qurilgan

20 ta admin sahifasi to'liq yozilgan va API ga ulangan. Admin API mijozida
500 dan ortiq qator, backendda 31 ta kontroller bor. Eng katta sahifalar:
Yetkazish (482 qator), Buyurtmalar (424), Bildirishnomalar (407), Audit log
(367), To'lovlar (331), Ombor (314), Moslashtirish (304), Import (283).

Bular maket emas — ular haqiqiy endpointlarni chaqiradi, holat o'zgartiradi,
filtrlaydi.

## 4. TZ bo'yicha bo'limma-bo'lim holat

TZning 58-bo'limi sidebar tarkibini belgilaydi. Quyida har bir talab va
uning haqiqiy holati.

| TZ bo'limi | API | Admin sahifa | Holat |
|---|---|---|---|
| Dashboard (59, 60) | qisman | **yo'q** | 1-etap maketi; KPI va grafiklar yo'q |
| Orders (36) | bor | bor | ishlaydi, menyudan o'chirilgan |
| Products | bor | bor | ishlaydi |
| Categories | bor | bor | ishlaydi |
| Collections | **bor** (CRUD to'liq) | **yo'q** | faqat UI kerak |
| Inventory (66) | bor | bor | ishlaydi, menyudan o'chirilgan |
| Customers (612–639) | bor | bor | ishlaydi, menyudan o'chirilgan |
| Reviews | **yo'q** | **yo'q** | faqat baza modeli bor |
| Discounts (673) | **yo'q** (faqat engine) | **yo'q** | chegirma checkoutda ishlaydi, boshqarib bo'lmaydi |
| Banners (708) | bor | `/content` ichida | ishlaydi |
| Pages (740) | bor | bor | ishlaydi |
| Blog | bor | `/content` ichida | ishlaydi |
| B2B | bor | bor | ishlaydi |
| Reports (62–66) | 1 ta endpoint | 1 ta sahifa | TZda 7 ta hisobot, bittasi bor |
| Users (72) | **yo'q** | **yo'q** | admin yaratib bo'lmaydi |
| Roles (73, 74) | qisman | **yo'q** | huquqlar kodda, UI yo'q |
| Notifications (71) | bor | bor | ishlaydi |
| Audit Logs (75) | bor | bor | ishlaydi |
| Settings (76) | bor | bor | 23 ta sozlama, turi va tekshiruvi bilan |

TZda ko'rsatilmagan, lekin qo'shimcha qurilganlar: Import, To'lovlar,
Moslashtirish, Fiskal cheklar, Yetkazish, Qaytarishlar.

## 5. Haqiqatan yetishmaydigan ishlar

**Dashboard (TZ 59–60).** Hozir umuman yo'q. TZ talab qiladi: bugungi
tushum, bugungi buyurtmalar, o'rtacha chek, yangi mijozlar, to'langan va
bekor qilingan buyurtmalar, kam qolgan mahsulotlar; to'rtta grafik; sana
filtri (bugun, kecha, 7 kun, 30 kun, oy, ixtiyoriy).

**Hisobotlar (TZ 62–66).** Bitta umumiy sahifa bor. TZ yettita alohida
hisobot va Excel/CSV eksportini talab qiladi. Hozir eksport faqat
Moslashtirish sahifasida bor.

**Adminlar va Rollar (TZ 72–74).** Sakkizta rol TZda sanalgan, huquqlar
kodda belgilangan, lekin panel orqali yangi admin yaratib ham, rolini
o'zgartirib ham bo'lmaydi. Amalda hamma `SUPER_ADMIN` bilan ishlaydi —
bu xavfsizlik nuqtai nazaridan yomon.

**Sozlamalar (TZ 76).** `Setting` jadvali bor va uni buyurtma, fiskal,
chegirma va qaytarish xizmatlari **o'qiydi**. Lekin yozish uchun na API,
na sahifa bor. Ya'ni do'kon nomi, logo, telefon, Telegram bot tokeni —
hammasi faqat bazaga qo'lda SQL bilan kiritiladi.

**Chegirmalar (TZ 673–694).** Engine yozilgan va checkoutda ishlaydi,
lekin promo-kod yaratish uchun interfeys yo'q.

**Sharhlar (TZ 647).** `Review` modeli bazada bor, boshqa hech narsa yo'q.

**Kolleksiyalar.** Backend to'liq tayyor (`GET/POST/PUT/DELETE
/admin/collections` va mahsulot biriktirish). Faqat sahifa yozilmagan —
bu eng arzon ish.

**Global qidiruv (TZ 61).** Buyurtma raqami, telefon, ism, mahsulot, SKU,
barcode bo'yicha yagona qidiruv yo'q. Barcode qidiruvi faqat Mahsulotlar
sahifasi ichida bor.

## 6. Qanday tartibda qilish kerak

Birinchi navbatda — **navigatsiya**. Bu bir necha qatorlik o'zgarish va
undan keyin 20 ta tayyor sahifa darrov ishlay boshlaydi. Bugungi holatda
qilingan ishning katta qismi shunchaki ko'rinmayapti.

Ikkinchidan — **Dashboard**, chunki panelning birinchi ekrani aynan shu va
hozir u loyihaning eski maketini ko'rsatib turibdi.

Uchinchidan — **Sozlamalar va Adminlar**, chunki ularsiz do'konni haqiqiy
ishga tushirib bo'lmaydi: sozlamalarni o'zgartirish uchun bazaga kirish
kerak, xodimlarga esa super-admin huquqidan boshqa narsa berib bo'lmaydi.

To'rtinchidan — **Kolleksiyalar** (backend tayyor), keyin **Chegirmalar**,
**Hisobotlar eksporti**, **Sharhlar** va **global qidiruv**.

---

## 7. Yangilanish — 11.09.2026, `dashboard` commiti

2-bo'limdagi ikkala kamchilik tuzatildi va 6-bo'limdagi birinchi ikki
navbat bajarildi.

Navigatsiya mezoni o'zgardi: endi `stage` emas, **route mavjudmi** degan
savol hal qiladi (`NavItem.ready`). Natijada **19 ta bo'lim bosiladigan
bo'ldi**; sahifasi yo'q 6 tasi «tez orada» belgisi bilan o'chirilgan
holda turadi va 404 bermaydi. Brauzerda o'lchab tekshirildi.

Bosh sahifa 1-etap maketidan **haqiqiy Dashboard**ga almashtirildi:
tushum, to'langan buyurtmalar, o'rtacha chek, yangi mijozlar, barcha va
bekor qilingan buyurtmalar, kam qolgan mahsulot; oldingi davr bilan
taqqoslash foizi; kunlik tushum grafigi; davr tanlagichi (bugun, kecha,
7 kun, 30 kun, shu oy). Yangi endpoint — `GET /admin/reports/dashboard`.

Davr **serverda** hisoblanadi, Toshkent vaqti bo'yicha. Brauzer vaqt
mintaqasiga tayansak, server UTC da ishlagani uchun "bugungi tushum"
tunda noto'g'ri chiqardi.

### Yo'l-yo'lakay topilgan production xatosi

Tekshirish paytida ma'lum bo'ldiki, Next.js `rewrites()` manzilini
**qurilish paytida** `.next/routes-manifest.json` ga yozadi. VPS
compose faylida `API_ORIGIN` esa faqat **ishga tushirish** o'zgaruvchisi
edi — ya'ni tasvir ichida proxy `localhost:4000` ga qotib qolardi va
**admin login VPS'da yana ishlamas edi**, aynan Render'dagi kabi.

Tuzatildi: `API_ORIGIN` endi `apps/web/Dockerfile` va
`apps/admin/Dockerfile` da build argumenti, compose'da esa
`build.args` orqali beriladi. Render'da bu muammo yo'q edi, chunki u
build paytida ham o'zgaruvchilarni beradi.

### Qolgan ish

Admin paneli **mobil ekranga moslashmagan** — 400 px kenglikda
gorizontal skroll paydo bo'ladi, chunki sidebar 240 px qat'iy. Bu
avvaldan mavjud nuqson; tuzatish uchun yig'iladigan sidebar kerak.

## 8. Sozlamalar — 11.09.2026

`Setting` jadvali kalit/qiymat, ya'ni o'zi hech narsa tushuntirmaydi.
Uni xom holda ko'rsatish JSON muharriri bo'lardi: xodim
`returns.refundShipping` ga nima yozish mumkinligini bilmaydi va bir
kun `"true"` yozib qaytarish hisobini buzadi.

Shuning uchun har bir kalit serverda **ta'riflangan**: turi, guruhi,
o'zbekcha nomi, izohi, chegaralari va ruxsat etilgan qiymatlari. UI shu
ta'rifdan to'g'ri boshqaruv elementini chizadi, API esa shu ta'rif
bo'yicha tekshiradi. Ro'yxatda yo'q kalitni yozib bo'lmaydi — aks holda
panel orqali ixtiyoriy kalit yaratilib, kod uni hech qachon o'qimaydi.

23 ta sozlama, 9 guruh. Ulardan **7 tasi nozik** deb belgilangan
(STIR, IKPU kodi, QQS, maksimal chegirma, chegirmalarni birlashtirish,
ochilgan mahsulotni qabul qilish, valyuta) — ularni faqat `SUPER_ADMIN`
o'zgartira oladi.

Saqlash **bitta tranzaksiyada**: bitta maydon xato bo'lsa hech narsa
saqlanmaydi. Yarmi saqlanib yarmi qolishi sozlamalarni bir-biriga zid
holatga olib keladi — masalan `quietFrom` yangilanib `quietTo` eski
qolsa, tinch vaqt oralig'i teskari bo'ladi.

Ta'riflar seed bilan solishtirib tekshirildi: 23 = 23, ortiqchasi ham,
yetishmagani ham yo'q.
