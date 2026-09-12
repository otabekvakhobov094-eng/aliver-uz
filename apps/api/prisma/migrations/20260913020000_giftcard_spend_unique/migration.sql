-- Bitta buyurtmada bitta sertifikat bir marta sarflanadi.
--
-- Kodda bu kafolat ALLAQACHON yozilgan edi: `giftcard.service.ts`
-- izohida «ikki marta yozilishining oldini baza oladi: (giftCardId,
-- orderId) bo'yicha unikal indeks» deyilgan. Indeks esa yo'q edi.
--
-- Hozir bu xato emas — `spend()` hech qayerdan chaqirilmaydi. Lekin
-- to'lovga ulangan kuni kafolat jimgina yo'q bo'lib chiqardi: takroriy
-- webhook bitta sertifikatni ikki marta sarflardi.
--
-- Qisman indeks: qaytarish (REFUND) takrorlanishi mumkin, chiqim
-- (SPEND) esa yo'q.
CREATE UNIQUE INDEX "gift_card_entries_spend_once_per_order"
  ON "gift_card_entries" ("giftCardId", "orderId")
  WHERE "kind" = 'SPEND' AND "orderId" IS NOT NULL;
