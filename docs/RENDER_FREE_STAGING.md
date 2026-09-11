# Vaqtinchalik bepul staging — Render

Repo ildizidagi `render.yaml` quyidagilarni yaratadi:

- ALIVER.UZ Web;
- Admin CMS;
- NestJS API;
- PostgreSQL;
- Redis-compatible Render Key Value.

## Joylashtirish

1. Loyihani GitHub/GitLab/Bitbucket reposiga yuboring.
2. Render Dashboard → **New → Blueprint** ni tanlang.
3. Reponi ulang va `render.yaml` faylini tasdiqlang.
4. So‘ralganda `SEED_SUPERADMIN_PASSWORD` uchun kuchli vaqtinchalik parol kiriting.
5. Deploy tugagach `/api/health`, Web va Admin manzillarini tekshiring.

Birinchi API deploy avtomatik ravishda Prisma migratsiyalari, seed va ALIVER.com katalog importini bajaradi. Import uchun 2026-09-11 kungi Markaziy bank kursi — `1 USD = 11 783.47 UZS` qo‘yilgan.

## Cheklovlar

- Bu faqat staging/demo muhitidir, production emas.
- Bepul web service 15 daqiqa trafiksiz qolsa uxlaydi; qayta uyg‘onishi taxminan bir daqiqa.
- Bepul PostgreSQL 30 kundan keyin tugaydi va backup bermaydi.
- Bepul Key Value qayta ishga tushganda ma’lumotini yo‘qotishi mumkin.
- Click, Payme, OFD va SMS vaqtinchalik stendda mock/console rejimida qoladi.
- Shu sabab API uchun `APP_ENV=development` va `NODE_ENV=development` qo‘yilgan;
  Web hamda Admin esa optimallashtirilgan production buildda ishlaydi.
- Bu ochiq demo stendda haqiqiy to‘lov qabul qilinmaydi. Real Click/Payme va OFD
  kalitlari olingach API `staging` yoki `production` rejimiga qaytarilishi shart.

## Staging URL’lari

- Web: `https://aliver-uz-web-stage.onrender.com`
- Admin: `https://aliver-uz-admin-stage.onrender.com`
- API: `https://aliver-uz-api-stage.onrender.com/api`

Agar Render global nom band bo‘lgani uchun servis nomini o‘zgartirsa, Web/Admin’dagi `NEXT_PUBLIC_API_URL` va API’dagi `CORS_ORIGINS`, `WEB_URL`, `ADMIN_URL` qiymatlarini yangi URL’larga moslang.
