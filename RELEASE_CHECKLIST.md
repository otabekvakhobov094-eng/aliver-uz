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

## Ballar va sertifikatlar muddati (yangi)

- [ ] `loyalty-expiry` vazifasi kuniga 03:00 da ishlayotganini tekshiring
      (loglar: «Ballar: N ogohlantirish, M ball kuydirildi»).
- [ ] Birinchi kuydirishdan OLDIN adminda «Bonus ballar → Tez orada
      kuyadi» ro'yxatini ko'rib chiqing. Ro'yxat kutilmaganda katta
      bo'lsa — sabab eski import bo'lishi mumkin, kuydirishni
      to'xtatib turing.
- [ ] SMS yuborilishini tekshiring: kuyishga 14 kun qolgan bitta
      test mijozi.
- [ ] Sertifikatlar: «Sovg'a sertifikatlari» ekranida 30 kunlik
      ogohlantirish bloki ko'rinishini tekshiring.

## To'lovlarni moslashtirish (yangi)

- [ ] Birinchi haqiqiy hafta tugagach: Click va Payme kabinetidan
      vypiskani yuklab oling va «Moslashtirish → Vypiska fayli»
      orqali solishtiring. Hisobotda «Manba: ... kabinetidan
      yuklangan vypiska» deb yozilishi kerak.
- [ ] Agar ogohlantirish «MUSTAQIL MANBA EMAS» deb tursa — hisobot
      hech narsani isbotlamaydi, faylni yuklang.

## Uzum bilan tenglashtirish (yangi)

- [ ] `UZUM_PRICE_MARKUP_PERCENT` ni belgilang (komissiya + foyda).
      Bo'sh qolsa narx umuman solishtirilmaydi.
- [ ] `UZUM_STOCK_RESERVE` — oxirgi donani ikki joyda sotmaslik uchun.
- [ ] «Uzum Seller → Farqni hisoblash» dan CSV oling va Uzum
      kabinetidagi ommaviy tahrirlashga yuklang.
