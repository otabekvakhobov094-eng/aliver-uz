# Migratsiyalar

Birinchi migratsiyani yaratish:

```bash
npm run db:migrate -- --name init
```

## Qo'lda qo'shiladigan SQL

Prisma quyidagilarni o'zi generatsiya qilmaydi — migratsiya faylining oxiriga
qo'lda qo'shiladi.

### 1. Soft delete bilan unikal slug (ekspertiza B-6)

O'chirilgan mahsulot slugni band qilib turmasligi kerak:

```sql
DROP INDEX IF EXISTS "products_slug_key";
CREATE UNIQUE INDEX "products_slug_active_key"
  ON "products" ("slug") WHERE "deletedAt" IS NULL;

DROP INDEX IF EXISTS "categories_slug_key";
CREATE UNIQUE INDEX "categories_slug_active_key"
  ON "categories" ("slug") WHERE "deletedAt" IS NULL;

DROP INDEX IF EXISTS "collections_slug_key";
CREATE UNIQUE INDEX "collections_slug_active_key"
  ON "collections" ("slug") WHERE "deletedAt" IS NULL;
```

### 2. Ombor qoldig'i hech qachon manfiy bo'lmaydi (ekspertiza A-6)

Ilova darajasidagi tekshiruvdan tashqari, bazaning o'zi ham himoya qiladi:

```sql
ALTER TABLE "inventory"
  ADD CONSTRAINT "inventory_stock_non_negative"
  CHECK ("totalStock" >= 0 AND "reservedStock" >= 0 AND "reservedStock" <= "totalStock");
```

### 3. Buyurtma summalari manfiy bo'lmaydi

```sql
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_totals_non_negative"
  CHECK ("subtotal" >= 0 AND "discountTotal" >= 0 AND "shippingTotal" >= 0 AND "grandTotal" >= 0);

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0);
```

### 4. Qidiruv indekslari (2-etap — MAJBURIY)

`Product.searchText` — oldindan normallashtirilgan matn (kirill lotinga
o'girilgan, apostroflar olib tashlangan). Imlo xatosiga chidamli qidiruv
`similarity()` funksiyasiga tayanadi, u esa `pg_trgm` kengaytmasini talab
qiladi (ekspertiza B-14):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Asosiy qidiruv indeksi
CREATE INDEX "products_search_trgm"
  ON "products" USING GIN ("searchText" gin_trgm_ops);

-- Katalog filtri tez-tez shu ustunlar bo'yicha boradi
CREATE INDEX "products_facets"
  ON "products" ("status", "inStock", "hasSale") WHERE "deletedAt" IS NULL;
```

Kengaytmasiz `similarity()` xato beradi va imlo xatosiga chidamli qidiruv
ishlamaydi (aniq moslik bo'yicha qidiruv baribir ishlaydi).

### 5. Variant o'lchamlari bo'yicha filtr

`ProductVariant.options` — JSONB. Hajm bo'yicha filtr tez ishlashi uchun:

```sql
CREATE INDEX "product_variants_options_gin"
  ON "product_variants" USING GIN ("options" jsonb_path_ops);
```

### 6. Reyting 1..5 oralig'ida

```sql
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
```


### 7. Rezerv va savat indekslari (3-etap — MAJBURIY)

Rezerv muddatini tekshiruvchi cron har daqiqada ishlaydi, savat tozalash
esa har soatda. Indekssiz ikkalasi ham butun jadvalni skanerlaydi:

```sql
-- Muddati o'tgan rezervlar (faqat HELD holatidagilar qidiriladi)
CREATE INDEX "stock_reservations_expiring"
  ON "stock_reservations" ("expiresAt") WHERE "status" = 'HELD';

-- Eskirgan savatlarni tozalash
CREATE INDEX "carts_expiring" ON "carts" ("expiresAt");

-- Buyurtmalar ro'yxati admin panelda sana bo'yicha teskari tartibda
CREATE INDEX "orders_placed_at_desc"
  ON "orders" ("placedAt" DESC) WHERE "deletedAt" IS NULL;

-- Kuzatuv: raqam + telefon juftligi bo'yicha qidiriladi (TZ 39)
CREATE INDEX "orders_number_phone" ON "orders" ("number", "contactPhone");
```

### 8. Rezerv miqdori musbat bo'ladi

```sql
ALTER TABLE "stock_reservations"
  ADD CONSTRAINT "stock_reservations_quantity_positive" CHECK ("quantity" > 0);

ALTER TABLE "cart_items"
  ADD CONSTRAINT "cart_items_quantity_positive" CHECK ("quantity" > 0);
```

### 9. Idempotentlik kaliti (3-etap)

`Order.idempotencyKey` Prisma da `@unique` — bu yetarli, qo'shimcha SQL
kerak emas. Lekin NULL qiymatlar unikallikka kirmasligini eslatib
qo'yamiz: kalitsiz buyurtmalar cheksiz bo'lishi mumkin, bu to'g'ri
xatti-harakat.

### 10. Buyurtma raqami unikal

Raqam tasodifiy 4 xonali qismga ega, kunlik to'qnashuv ehtimoli bor.
Kod to'qnashuvda qayta urinadi, lekin baza ham himoyalanadi:

```sql
-- Prisma allaqachon "orders_number_key" yaratadi; qo'shimcha shart yo'q.
```


### 11. To'lov va fiskal chek indekslari (4-etap — MAJBURIY)

Webhook idempotentligi `webhook_events` dagi unikal indeksga tayanadi —
Prisma uni `@@unique([provider, externalId, method])` dan o'zi yaratadi.
Qolganlari qo'lda qo'shiladi:

```sql
-- Fiskal navbat har daqiqada shu shart bo'yicha qidiradi
CREATE INDEX "fiscal_receipts_due"
  ON "fiscal_receipts" ("nextRetryAt") WHERE "status" = 'PENDING';

-- Buyurtmaga bitta sotuv cheki: yuborilgan yoki navbatdagi chek
-- ikkilanmasligi kerak
CREATE UNIQUE INDEX "fiscal_receipts_one_sale"
  ON "fiscal_receipts" ("orderId")
  WHERE "type" = 'SALE' AND "status" IN ('PENDING', 'SENT');

-- Moslashtirish davr bo'yicha o'qiydi
CREATE INDEX "payments_provider_created"
  ON "payments" ("provider", "createdAt" DESC);

CREATE INDEX "payments_paid_at" ON "payments" ("paidAt") WHERE "status" = 'PAID';

-- Webhook loglari tez o'sadi; provayder + sana bo'yicha o'qiladi
CREATE INDEX "webhook_events_provider_created"
  ON "webhook_events" ("provider", "createdAt" DESC);
```

### 12. Pul cheklovlari (4-etap)

```sql
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0);

-- Qaytarilgan summa hech qachon to'lov summasidan oshmaydi.
-- Ilova darajasida ham tekshiriladi, lekin baza oxirgi to'siq bo'lib qoladi.
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_refund_within_amount"
  CHECK ("refundedAmount" >= 0 AND "refundedAmount" <= "amount");

ALTER TABLE "fiscal_receipts"
  ADD CONSTRAINT "fiscal_receipts_total_positive" CHECK ("totalAmount" > 0);
```

### 13. Webhook loglarini tozalash (4-etap)

`webhook_events` va `payment_logs` cheksiz o'sadi. Nizolar uchun ular
kerak, lekin abadiy emas — 18 oy yetarli (buxgalteriya muddati).
Cron yoki `pg_cron` bilan:

```sql
DELETE FROM "webhook_events" WHERE "createdAt" < NOW() - INTERVAL '18 months';
DELETE FROM "payment_logs"   WHERE "createdAt" < NOW() - INTERVAL '18 months';
```


### 14. Bitta buyurtmaga bitta faol jo'natma (5-etap — MAJBURIY)

Ikki operator bir vaqtda kuryer biriktirsa, ikkita jo'natma paydo
bo'lardi va mijoz bir kuryerni, varaqa esa boshqasini ko'rsatardi.
Prisma qisman unikal indeksni yaratmaydi — qo'lda qo'shiladi:

```sql
CREATE UNIQUE INDEX "shipments_one_active"
  ON "shipments" ("orderId")
  WHERE "status" NOT IN ('DELIVERED', 'RETURNED');
```

Kod bu indeksga tayanadi: P2002 kelsa mavjud jo'natma yangilanadi.

### 15. Bildirishnomalar navbati indekslari (5-etap)

```sql
-- Navbat har daqiqada shu shart bo'yicha o'qiydi
CREATE INDEX "notifications_due"
  ON "notifications" ("scheduledAt") WHERE "status" = 'PENDING';

-- Osilgan yozuvlarni tiklash (SENDING bo'lib qolganlar)
CREATE INDEX "notifications_stuck"
  ON "notifications" ("updatedAt") WHERE "status" = 'SENDING';

-- Buyurtma kartochkasidagi xabarlar tarixi
CREATE INDEX "notifications_order_created"
  ON "notifications" ("orderId", "createdAt" DESC);
```

### 16. Audit log — faqat qo'shiladi (5-etap)

Audit yozuvini tahrirlash yoki o'chirish IMKONI BO'LMASLIGI kerak,
aks holda uning ma'nosi qolmaydi. Ilova darajasida bunday endpoint
yo'q; baza darajasida esa alohida rol beriladi:

```sql
-- Ilova foydalanuvchisi audit logga faqat YOZADI
REVOKE UPDATE, DELETE ON "audit_logs" FROM aliver_app;
GRANT INSERT, SELECT ON "audit_logs" TO aliver_app;

-- Loglar cheksiz o'smasligi uchun 24 oydan keyin arxivga ko'chiriladi
-- (o'chirish emas — arxiv jadvaliga). Buni alohida xizmat bajaradi.
CREATE INDEX "audit_logs_created" ON "audit_logs" ("createdAt");
```

### 17. Yetkazish narxi cheklovlari (5-etap)

```sql
ALTER TABLE "delivery_methods"
  ADD CONSTRAINT "delivery_methods_days_order"
  CHECK ("estimatedDaysMax" >= "estimatedDaysMin");

ALTER TABLE "delivery_method_regions"
  ADD CONSTRAINT "delivery_method_regions_days_order"
  CHECK ("daysMin" IS NULL OR "daysMax" IS NULL OR "daysMax" >= "daysMin");

ALTER TABLE "delivery_method_regions"
  ADD CONSTRAINT "delivery_method_regions_price_positive" CHECK ("price" >= 0);
```


### 18. Bitta buyurtmaga bitta ochiq qaytarish (6-etap — MAJBURIY)

Ikki so'rov bir xil pozitsiyani qaytarsa, pul ikki marta ketardi.
Ilova darajasida tranzaksiya ichida tekshiriladi, baza esa oxirgi
to'siq bo'ladi:

```sql
CREATE UNIQUE INDEX "returns_one_open"
  ON "returns" ("orderId")
  WHERE "status" IN ('REQUESTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED');
```

### 19. Qaytarish cheklovlari (6-etap)

```sql
ALTER TABLE "returns"
  ADD CONSTRAINT "returns_refund_non_negative" CHECK ("refundAmount" >= 0);

ALTER TABLE "return_items"
  ADD CONSTRAINT "return_items_quantity_positive" CHECK ("quantity" > 0);

-- Qaytarilgan miqdor buyurtmadagi miqdordan oshmaydi
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_refunded_within_quantity"
  CHECK ("refundedQuantity" >= 0 AND "refundedQuantity" <= "quantity");

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_refunded_within_total"
  CHECK ("refundedAmount" >= 0 AND "refundedAmount" <= "lineTotal");
```

Oxirgi ikkita cheklov eng muhimi: ular pozitsiya bo'yicha qaytarilgan
summa mijoz to'lagan summadan oshib ketishiga umuman yo'l qo'ymaydi.

### 20. Mijoz kabineti indekslari (6-etap)

```sql
-- Standart manzil bitta bo'ladi
CREATE UNIQUE INDEX "addresses_one_default"
  ON "addresses" ("customerId")
  WHERE "isDefault" = true AND "deletedAt" IS NULL;

-- Rozilik tarixi tez o'qilishi uchun
CREATE INDEX "consents_customer_type_created"
  ON "consents" ("customerId", "type", "createdAt" DESC);

CREATE INDEX "returns_customer_created"
  ON "returns" ("customerId", "createdAt" DESC);
```
