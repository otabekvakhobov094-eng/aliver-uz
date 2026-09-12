-- Sodiqlik dasturi — TZ-3.
--
-- Balans ALOHIDA ustunda saqlanmaydi: u har doim harakatlar yig'indisi.
-- Alohida ustun tezroq bo'lardi, lekin u bir marta haqiqatdan chetga
-- chiqsa, qaysi biri to'g'riligini aniqlashning iloji bo'lmasdi — pul
-- bilan bog'liq joyda bu qabul qilinmaydi.

CREATE TYPE "LoyaltyEntryKind" AS ENUM ('EARN', 'REDEEM', 'EXPIRE', 'ADJUST', 'REVERSAL');

CREATE TABLE "loyalty_entries" (
  "id"         UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "kind"       "LoyaltyEntryKind" NOT NULL,
  -- Ball butun son: yarim ball degan narsa yo'q.
  "points"     INTEGER NOT NULL,
  -- Ballning O'SHA PAYTDAGI so'mdagi qiymati. Kurs keyin o'zgarishi
  -- mumkin, tarix esa o'zgarmasligi kerak.
  "amount"     BIGINT NOT NULL DEFAULT 0,
  "orderId"    UUID,
  "comment"    TEXT,
  "adminId"    UUID,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loyalty_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "loyalty_entries_customerId_createdAt_idx"
  ON "loyalty_entries" ("customerId", "createdAt");
CREATE INDEX "loyalty_entries_orderId_idx" ON "loyalty_entries" ("orderId");

ALTER TABLE "loyalty_entries"
  ADD CONSTRAINT "loyalty_entries_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "loyalty_entries"
  ADD CONSTRAINT "loyalty_entries_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Bitta buyurtma uchun bir xil turdagi yozuv IKKI MARTA bo'lmasligi
-- kerak: webhook takror kelsa yoki operator ikki marta bossa, ball
-- ikkilanib ketardi. Bu kafolat kod darajasida emas, BAZADA.
CREATE UNIQUE INDEX "loyalty_entries_order_kind_unique"
  ON "loyalty_entries" ("orderId", "kind")
  WHERE "orderId" IS NOT NULL AND "kind" IN ('EARN', 'REDEEM', 'REVERSAL');
