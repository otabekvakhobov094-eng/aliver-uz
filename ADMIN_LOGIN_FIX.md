# Admin login tuzatishi

## Nima bo'layotgan edi

Login va parol kiritilardi, xato chiqmasdi, panel ochilib darhol yopilardi.

## Nega

Cookie brauzerga **umuman saqlanmasdi**, va bu jimgina sodir bo'ladi:
server cookie yuboradi, brauzer uni rad etadi, hech kim xato ko'rmaydi.

Zanjir shunday edi:

1. Login `200 OK` qaytaradi.
2. Brauzer cookie ni **rad etadi**.
3. Panel ochiladi va birinchi so'rovni (`/admin/permissions`) yuboradi.
4. Cookie yo'q → `401`.
5. `AdminShell` har qanday xatoda login sahifasiga qaytaradi.

Natija: ekran ochilib yopiladi, xato ko'rinmaydi.

Cookie ni rad etishning **ikkita mustaqil sababi** bor edi — ikkalasi ham
tuzatilishi kerak, biri yetarli emas.

### 1-sabab: `Domain=localhost`

`apps/api/src/modules/auth/tokens.service.ts` da:

```ts
domain: this.config.get<string>('COOKIE_DOMAIN', 'localhost'),
```

`render.yaml` da `COOKIE_DOMAIN` ko'rsatilmagan, ya'ni standart qiymat
ishlagan. `aliver-uz-api-stage.onrender.com` javobida
`Set-Cookie: ...; Domain=localhost` bo'lsa, brauzer cookie ni butunlay
tashlaydi: domen javob bergan xostga mos emas.

### 2-sabab: cross-site cookie

```
admin  →  https://aliver-uz-admin-stage.onrender.com
API    →  https://aliver-uz-api-stage.onrender.com
```

Brauzer uchun bu **ikki xil sayt**. Cross-site javobda:

* `SameSite=Lax` cookie — butunlay rad etiladi;
* `SameSite=None` — uchinchi tomon cookie si: Safari uni doim bloklaydi
  (O'zbekistonda iPhone ulushi katta), Chrome bosqichma-bosqich o'chirmoqda.

`.onrender.com` Public Suffix List da, shuning uchun `domain=.onrender.com`
bilan umumiy cookie qo'yib ham **bo'lmaydi**.

> Shu sababli `SameSite=None` ga o'tish — vaqtinchalik yechim. U bugun
> Chrome'da ishlab, ertaga Safari'da ishlamaydi.

## Nima qilindi

### Asosiy yechim: same-origin API proxy

Brauzer endi API ga to'g'ridan-to'g'ri bormaydi. U **o'z domenidagi**
`/api/...` ga so'rov yuboradi, Next.js esa uni serverda API ga uzatadi.

```
brauzer → https://…-admin-stage.onrender.com/api/admin/auth/login
             ↓ (Next.js serverda uzatadi)
          https://…-api-stage.onrender.com/api/admin/auth/login
```

Brauzer uchun cookie **o'z domenidan** kelgan bo'ladi — ya'ni birinchi
tomon cookie si. Uni Safari ham, uchinchi tomon cookie'lari o'chirilgan
Chrome ham bloklamaydi.

`API_ORIGIN` ataylab **`NEXT_PUBLIC_` emas**: u qiymat brauzer paketiga
tushmaydi, shuning uchun so'rovlarni yana tashqi domenga yo'naltirib
xatoni qaytarib keltirib bo'lmaydi.

### O'zgargan fayllar

| Fayl | O'zgarish |
|---|---|
| `apps/api/src/modules/auth/tokens.service.ts` | Domen faqat aniq ko'rsatilganda qo'yiladi; `localhost` e'tiborsiz; `SameSite` sozlanadi |
| `apps/api/src/modules/auth/tokens.cookie.spec.ts` | **Yangi** — 9 ta test, xato qaytib kelmasligi uchun |
| `apps/api/src/config/configuration.ts` | `COOKIE_DOMAIN` standarti bo'sh; `COOKIE_SAMESITE`, `TRUST_PROXY`; `none`+`secure=false` ishga tushishda rad etiladi |
| `apps/api/src/main.ts` | `trust proxy` |
| `apps/admin/src/lib/api-base.ts` | **Yangi** — brauzerda `/api`, serverda to'liq manzil |
| `apps/admin/src/lib/api.ts` | `apiBase()` ishlatadi |
| `apps/admin/next.config.mjs` | `/api/:path*` → `API_ORIGIN` rewrite |
| `apps/admin/src/app/login/page.tsx` | Panelga o'tishdan oldin sessiya tekshiriladi; xatolar ko'rinadi |
| `apps/web/src/lib/api-base.ts` | **Yangi** |
| `apps/web/src/lib/{api,catalog-api,shop-api,content-api}.ts` | `apiBase()` |
| `apps/web/src/middleware.ts` | `serverApiBase()` |
| `apps/web/next.config.mjs` | Rewrite |
| `render.yaml` | `API_ORIGIN`, `COOKIE_SAMESITE`, `COOKIE_DOMAIN=""`, `TRUST_PROXY=1` |

### Yo'l-yo'lakay topilgan ikkinchi nosozlik: `trust proxy`

Render reverse proxy orqasida ishlaydi, ya'ni `req.ip` **hamma uchun bir
xil** — proxy ning IP si. Chastota cheklovlari IP bo'yicha ishlaydi:

* bog'lanish formasi — 5/soat,
* buyurtma — 10/soat,
* OTP — 20/soat.

Ya'ni bitta odam formani 5 marta yuborsa, **butun sayt uchun** limit
tugardi. `TRUST_PROXY=1` bilan haqiqiy mijoz IP si o'qiladi.

Bu login bilan bog'liq emas, lekin productionda tezda sezilardi.

## Tekshirish

Tuzatish faqat kodda emas, **ishlatib** sinaldi: admin ilovasi qurildi va
ishga tushirildi, login so'rovi proxy orqali yuborildi.

```
1. Login (admin domeni orqali)     → 200, Set-Cookie: ...; SameSite=Lax   (Domain YO'Q)
2. Cookie saqlandi                  → #HttpOnly_127.0.0.1 ... access_token
3. Sessiya bilan /admin/permissions → 200
4. Sessiyasiz /admin/permissions    → 401
```

Testlar: API `336` ta, admin `8` ta — hammasi o'tadi. Web va admin
production build muvaffaqiyatli.

## Deploy

1. `render.yaml` o'zgarganini tasdiqlang.
2. Agar Render'da o'zgaruvchilar **qo'lda** kiritilgan bo'lsa (Blueprint
   emas), quyidagilarni o'zi qo'ying:

   **`aliver-uz-admin-stage`** va **`aliver-uz-web-stage`**:
   * `NEXT_PUBLIC_API_URL` — **o'chiring**
   * `API_ORIGIN=https://aliver-uz-api-stage.onrender.com`

   **`aliver-uz-api-stage`**:
   * `COOKIE_DOMAIN` — **bo'sh** (yoki butunlay o'chiring)
   * `COOKIE_SAMESITE=lax`
   * `TRUST_PROXY=1`

3. Uchala xizmatni qayta deploy qiling.
4. Admin panelga kiring. Agar parol noto'g'ri bo'lsa, endi
   **"Email yoki parol noto'g'ri"** deb yozadi — jimgina qaytarmaydi.

> `NEXT_PUBLIC_*` qiymatlari **qurilish paytida** paketga kiradi.
> Ularni o'zgartirgandan keyin `Deploy latest commit` emas, to'liq
> qayta qurish kerak.

---

## Alohida: staging ochiq turibdi

`render.yaml` da API uchun `APP_ENV=development` va `NODE_ENV=development`
qo'yilgan. Bu maket rejimidagi tekshiruvni chetlab o'tish uchun qilingan,
lekin ikkita natijasi bor:

1. `/api/docs` (Swagger) **ommaga ochiq**.
2. `/api/payments/mock/confirm` ochiq: buyurtma id sini bilgan **har kim**
   uni "to'langan" deb belgilashi mumkin.

Staging manzili ochiq internetda turganda bu xavfli. Ikki variant:

* staging'ni parol bilan yopish (Render'da IP allowlist yoki basic auth), yoki
* `APP_ENV=staging` qilib, Click/Payme **sandbox** kalitlarini kiritish —
  shunda maket rejimi kerak bo'lmaydi.

Buni hozir hal qilish shart emas, lekin haqiqiy mijozlarga ko'rsatishdan
oldin yopilishi kerak.
