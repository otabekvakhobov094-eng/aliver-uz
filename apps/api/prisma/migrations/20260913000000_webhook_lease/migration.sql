-- Webhook hodisasini ishlov berish uchun "ijaraga olish" vaqti.
--
-- Ilgari faqat `processedAt` bor edi: yozuv yaratilgan, lekin ishlov
-- tugamagan bo'lsa, u abadiy "ishlanmoqda" holatida qolardi. Jarayon
-- o'sha paytda qayta ishga tushsa (deploy, OOM), provayderning har bir
-- keyingi urinishi "hozir ishlanmoqda" javobini olardi — to'lov esa
-- hech qachon yakunlanmasdi. Mijozdan pul yechilgan, buyurtma esa
-- to'lanmagan bo'lib qolardi.
--
-- `claimedAt` — ijara muhlati. Muhlat o'tgan yozuvni keyingi urinish
-- qayta egallaydi.
ALTER TABLE "webhook_events"
  ADD COLUMN "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "webhook_events_processedAt_claimedAt_idx"
  ON "webhook_events" ("processedAt", "claimedAt");
