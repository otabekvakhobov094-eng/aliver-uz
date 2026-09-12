-- Savatda namuna tanlash — TZ-3.
--
-- Namuna savatga oddiy pozitsiya sifatida QO'SHILMAYDI. U bepul,
-- miqdori o'zgarmaydi, chegirma hisobiga kirmaydi va summaga
-- qo'shilmaydi — uni `cart_items` ga qo'yish har bir hisob-kitobga
-- «bu qator namunami?» degan shartni tarqatib yuborardi.

ALTER TABLE "products" ADD COLUMN "isSample" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "products_isSample_status_idx" ON "products" ("isSample", "status");

ALTER TABLE "carts" ADD COLUMN "sampleVariantId" UUID;
ALTER TABLE "carts"
  ADD CONSTRAINT "carts_sampleVariantId_fkey"
  FOREIGN KEY ("sampleVariantId") REFERENCES "product_variants"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "carts_sampleVariantId_idx" ON "carts" ("sampleVariantId");
