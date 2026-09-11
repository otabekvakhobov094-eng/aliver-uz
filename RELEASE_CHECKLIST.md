# ALIVER UZ production reliz tekshiruv ro‘yxati

## Relizdan oldin

- Click va Payme jangovar merchant kalitlari tasdiqlangan
- OFD terminali va fiskal chek test savdosi tasdiqlangan
- SMS sender nomi operator tomonidan aktivlashtirilgan
- Telegram webhook va maxfiy token o‘rnatilgan
- `aliver.uz` va `admin.aliver.uz` DNS yozuvlari serverga qaragan
- TLS sertifikat va avtomatik yangilanish sozlangan
- PostgreSQL backup boshqa server yoki object storage ga nusxalanadi
- Shaxsiy ma’lumotlar saqlanadigan hudud bo‘yicha yurist xulosasi olingan

## Reliz gate

1. `npm run release:check`
2. Legacy CSV lar uchun `npm run migrate:legacy -- --type=... --file=...` dry-run
3. Production bazaning backup va SHA-256 tekshiruvi
4. `prisma migrate deploy`
5. Ilovalarni rolling restart
6. `/api/health`, Web, Admin, Click/Payme va fiskal chek smoke testi

## Rollback

- Ilova xatosida oldingi image tag ga qaytish
- Schema mos bo‘lmasa backupni alohida bazaga tiklab tekshirish
- Legacy importni `--rollback --checkpoint=...` bilan qaytarish
- To‘lov yoki OFD xatosida yangi checkoutni vaqtincha yopish, mavjud webhooklarni yo‘qotmaslik
