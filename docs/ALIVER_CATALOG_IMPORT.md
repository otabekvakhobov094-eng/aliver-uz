# ALIVER.com katalogini ko‘chirish

Migrator rasmiy Shopify katalogidan mahsulotlar, variantlar, USD narxlar, qoldiq va barcha rasm URL’larini olib ALIVER.UZ PostgreSQL bazasiga `upsert` qiladi. Xaridor ko‘radigan nom, tavsif va rasm alt-matnlari faqat o‘zbekcha/ruscha maydonlarga yoziladi; `nameEn` bo‘sh qoladi.

## Tekshirish

```bash
npm run migrate:aliver-catalog
```

Bu dry-run: bazaga yozmaydi, faqat mahsulot/variant/rasm sonini chiqaradi.

## Staging import

```bash
DATABASE_URL='postgresql://...' \
ALIVER_WAREHOUSE_CODE=MAIN \
npm run migrate:aliver-catalog -- --commit --usd-to-uzs=KURS
```

`KURS` — reliz paytidagi tasdiqlangan USD → UZS kursi. Import qayta ishga tushirilsa mavjud mahsulot va SKUlar yangilanadi, dublikat yaratilmaydi. Manba nusxasini audit uchun saqlash mumkin:

```bash
npm run migrate:aliver-catalog -- --save-snapshot=aliver-catalog.json
```

Keyin tarmoqsiz qayta import:

```bash
npm run migrate:aliver-catalog -- --snapshot=aliver-catalog.json --commit --usd-to-uzs=KURS
```

Rasmlar avval rasmiy Shopify CDN URL’lari orqali darhol ko‘rinadi. Keyingi media-sync jarayonida ular ALIVER.UZ object storage’iga ko‘chirilishi mumkin.

## Muhim tekshiruv

Importdan keyin admin CMS’da IKPU, tarkib va ogohlantirish matnlarini mahsulot qadog‘i bilan solishtirib tasdiqlash kerak. Migrator umumiy kosmetika IKPU kodini qo‘yadi; mahsulotga xos MXIK mavjud bo‘lsa `--ikpu=...` orqali almashtiriladi.
