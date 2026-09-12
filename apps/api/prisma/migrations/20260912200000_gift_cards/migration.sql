-- Sovg'a sertifikati — TZ-3.
--
-- KOD OCHIQ SAQLANMAYDI: faqat xeshi va oxirgi 4 belgi. Baza nusxasi
-- chiqib ketsa, ochiq kod bilan hammasini darhol ishlatib bo'lardi.

CREATE TYPE "GiftCardEntryKind" AS ENUM ('SPEND', 'REFUND', 'ADJUST');

CREATE TABLE "gift_cards" (
  "id"            UUID NOT NULL,
  "codeHash"      TEXT NOT NULL,
  -- Oxirgi 4 belgi: qidiruv va ko'rsatish uchun, kodni tiklashga yetmaydi.
  "codeTail"      TEXT NOT NULL,
  "initialAmount" BIGINT NOT NULL,
  "purchasedById" UUID,
  "recipientName"  TEXT,
  "recipientPhone" TEXT,
  "message"        TEXT,
  "expiresAt"      TIMESTAMP(3),
  "cancelledAt"    TIMESTAMP(3),
  "cancelReason"   TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gift_cards_codeHash_key" ON "gift_cards" ("codeHash");
CREATE INDEX "gift_cards_codeTail_idx" ON "gift_cards" ("codeTail");
CREATE INDEX "gift_cards_purchasedById_idx" ON "gift_cards" ("purchasedById");

ALTER TABLE "gift_cards"
  ADD CONSTRAINT "gift_cards_purchasedById_fkey"
  FOREIGN KEY ("purchasedById") REFERENCES "customers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "gift_card_entries" (
  "id"         UUID NOT NULL,
  "giftCardId" UUID NOT NULL,
  "kind"       "GiftCardEntryKind" NOT NULL,
  -- Chiqim MUSBAT, qaytarish MANFIY: yig'indi har doim «sarflangan».
  "amount"     BIGINT NOT NULL,
  "orderId"    UUID,
  "comment"    TEXT,
  "adminId"    UUID,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gift_card_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gift_card_entries_giftCardId_createdAt_idx"
  ON "gift_card_entries" ("giftCardId", "createdAt");
CREATE INDEX "gift_card_entries_orderId_idx" ON "gift_card_entries" ("orderId");

ALTER TABLE "gift_card_entries"
  ADD CONSTRAINT "gift_card_entries_giftCardId_fkey"
  FOREIGN KEY ("giftCardId") REFERENCES "gift_cards"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gift_card_entries"
  ADD CONSTRAINT "gift_card_entries_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Bitta sertifikat bitta buyurtmada IKKI MARTA ishlatilmasin: so'rov
-- takror kelsa yoki mijoz ikki marta bossa, pul ikkilanib ketardi.
-- Kafolat kodda emas, BAZADA.
CREATE UNIQUE INDEX "gift_card_entries_card_order_spend_unique"
  ON "gift_card_entries" ("giftCardId", "orderId")
  WHERE "orderId" IS NOT NULL AND "kind" = 'SPEND';
