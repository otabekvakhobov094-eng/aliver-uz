# ALIVER.UZ — keyingi qadamlar

Sana: 2026-09-12 · Commit: `241c3bd`

Bu hujjat bitta savolga javob beradi: **siz nima qilishingiz kerak.**
Kod tomondagi ishlar tugagan va commit qilingan; quyidagilarning
hammasi sizning qo'lingizdagi amallar.

---

## 1. Eng muhimi: deploy

Hozir Render'da **eski** kod turibdi. Buni brauzerda tekshirib
ko'rdim: telefon ko'rinishida logotip hali ham kabinet ikonkasining
ustiga chiqib turibdi — bu xato kodda allaqachon tuzatilgan, lekin
deploy bo'lmagan.

Ya'ni quyida sanab o'tilgan tuzatishlarning **birortasi ham hozir
saytda yo'q**. Birinchi qadam — kodni yuborish:

```bash
cd C:\Users\VOBEX\aliver-uz
git fetch aliver-uz-241c3bd.bundle "*:refs/remotes/bundle/*"
git merge bundle/main          # yoki: git reset --hard bundle/main
git push origin main
```

Keyin Render → Deploys bo'limida deploy **tugaganiga** ishonch hosil
qiling. Oldingi deploy ham tushmay qolgan edi.

---

## 2. Deploy'dan keyin — bazani tuzatish

Tartib muhim: har biri oldingisiga tayanadi.

### 2.1. Menyu nishonlarini tuzatish

```bash
npm run fix:menu             # nima o'zgarishini ko'rsatadi
npm run fix:menu -- --commit # yozadi
```

Nima qiladi: bazadagi inglizcha kategoriya slug'larini (`hair-care`,
`skin-care`, `nail`…) sayt kutayotgan o'zbekchaga qayta nomlaydi va
saytda ko'rinmay qolgan olti menyu bandini tiklaydi.

### 2.2. Katalogni qaytadan import qilish

```bash
npm run migrate:aliver-catalog
```

Nima qiladi: 556 ta mahsulotni yangi tasnif bo'yicha qayta
joylashtiradi (yuz va tana endi alohida), **teglarni yozadi** —
usiz bosh sahifadagi «Vosita tanlash» hech qachon natija bermaydi —
va variant nomlarini tozalaydi.

Qoldiqqa tegmaydi.

### 2.3. Nom, tavsif va narxlarni tuzatish

```bash
npm run fix:catalog             # ko'rsatadi
npm run fix:catalog -- --commit # yozadi
```

Hozir saytda shunday nomlar turibdi: «Aliver Bowling lab Tint»,
«teri Tone Adjusting CC krem», «Aliver Wispy Natural ko'z Lash
Clusters». Narxlar ham dollardan konvertatsiya qilingan holicha:
«636 071 so'm».

### 2.4. Qoldiq kiritish

Hozir **556 ta mahsulotning hammasi «Tugagan»** holatida — ya'ni
saytda hech narsa sotilmaydi.

Adminka → Ombor → «Fayldan qoldiq kiritish». Shablonni o'sha yerdan
yuklab olasiz. Fayl «shu son bo'lsin» ma'nosida ishlaydi: ikki marta
yuklasangiz qoldiq ikki barobar bo'lib ketmaydi.

---

## 3. Adminkada qo'lda to'ldiriladigan narsalar

**Sozlamalar** bo'limida:

- tashkilot nomi — hozir «MCHJ «ALIVER UZZ»» deb turibdi (ikki `Z`);
- STIR — hozir o'rnida namuna raqam turibdi;
- telefon, Telegram, e-pochta, ish vaqti — bularsiz «Aloqa» sahifasi
  bo'sh qoladi (ataylab: noto'g'ri raqam ko'rsatgandan ko'ra
  ko'rsatmagan yaxshi).

**Huquqiy sahifalar** — ommaviy oferta, maxfiylik siyosati, qaytarish
shartlari, yetkazish va to'lov. Ular ataylab nashr qilinmagan:
haqiqiy do'kon uchun huquqiy matnni o'ylab yozish mumkin emas. Matnni
yuristdan oling va adminka → Sahifalar bo'limiga kiriting.

**Render → Environment**:

- `APP_ENV=staging` qo'ying (hozir `development`);
- `META_TEST_EVENT_CODE` ni **relizdan oldin o'chiring** — aks holda
  haqiqiy xaridlar Meta'da test hodisa bo'lib qoladi;
- `GIFTCARD_SECRET` bo'lishi shart, aks holda sovg'a sertifikatlari
  moduli umuman ishga tushmaydi.

**Rasmlar** hali `cdn.shopify.com` dan kelmoqda. Shopify'dan butunlay
chiqishdan oldin ularni o'z saqlagichingizga ko'chirish kerak.

---

## 4. Bugun nima tuzatildi

Qisqacha, sabablari bilan. Hammasining umumiy tomoni bor: ularning
**birortasi ham xato bermagan** — shuning uchun ularni hech kim
nosozlik deb aytmagan.

**Sessiya 15 daqiqada o'lardi.** Kirish tokeni 900 soniya yashaydi,
uzaytirish tokeni 30 kun. Ikkinchisi berilardi, bazaga yozilardi va
hech qachon ishlatilmasdi — adminda uzaytirish yo'li umuman yo'q edi.
Xodim forma to'ldirib turgan joyida login oynasiga uchib ketardi.
Xuddi shu narsa saytdagi mijozda ham bor edi.

**Sarlavhadagi olti band saytda ko'rinmasdi.** Menyu bir tasnifga,
katalog boshqasiga qarab turgan. Nishoni yo'q band saytdan tushib
qoladi — xato bermay.

**«Vosita tanlash» hech qachon natija bermasdi.** U `?tags=…` bilan
filtrlaydi, importer esa teg umuman yaratmasdi.

**Kolleksiyaga mahsulot qo'shib bo'lmasdi.** Yaratish bor edi,
tarkibini tahrirlash yo'q: kolleksiya bo'sh qolardi va saytda bo'sh
sahifa bo'lib chiqardi.

**O'chirilgan mahsulotni tiklab bo'lmasdi.** Serverda tiklash yo'li
bor edi, ro'yxat esa o'chirilganlarni doim yashirardi.

**Panel har bosishda yonib-o'chardi.** Har bir sahifa qobiqni qayta
quradi va qobiq huquqlarni qaytadan so'rardi — shu vaqtda butun
interfeys «Yuklanmoqda…» ga almashardi.

**Uxlab qolgan serverga kirgan birinchi mijoz** «filtr noto'g'ri
ko'rsatilgan» degan xabarni ko'rardi. Filtrda ayb yo'q edi.

**Variant nomi** «1 bottle / 1 bottle /  / » bo'lib chiqardi.

**Uchta sahifada sarlavha yo'q edi** — brauzer yorlig'ida ular boshqa
yigirmatadan sahifadan farq qilmasdi.

**Adminka endi ikki tilda** (o'zbekcha va ruscha), 799 ta satr
tarjima qilingan.

---

## 5. Endi bunday xatolar qaytmaydi

`npm run lint` ichida to'qqizta mashina tekshiruvi bor. Ularning har
biri ALLAQACHON sodir bo'lgan xatoni qaytib kelishidan to'sadi:

| Tekshiruv | Nimadan qo'riqlaydi |
|---|---|
| `check:prisma` | bazada yo'q maydonga murojaat |
| `check:nav` | menyu bandining nishoni yo'qligi |
| `check:chrome` | sahifada sarlavha, header yoki footer yo'qligi |
| `check:api` | adminka serverda yo'q yo'lga borishi va aksincha |
| `check:slugs` | saytda qattiq yozilgan slug katalogda yaratilmasligi |
| `check:i18n` | tarjimasiz qolgan matn |
| `check:scripts` | skriptlardagi qoidalar buzilishi |
| `typecheck` | tur xatolari (Prisma stub bilan — endi haqiqatan tekshiradi) |

Testlar: API 687, sayt 52, adminka 17, UI 4, skriptlar 9.
