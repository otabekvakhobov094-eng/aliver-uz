-- Mahsulotning uchta asosiy tarkibi va isbot qatori (TZ-3, 2.3).
--
-- `keyIngredients` JSONB: alohida jadval emas, chunki bu tartiblangan
-- qisqa ro'yxat va u faqat o'z mahsuloti bilan birga o'qiladi —
-- bog'lanish ham, indekslash ham kerak emas.
--
-- Hammasi NULL bo'lishi mumkin: mavjud mahsulotlar migratsiyadan keyin
-- ham ishlayveradi, maydonlar kontent to'ldirilgan sari to'ladi.
ALTER TABLE "products" ADD COLUMN "keyIngredients" JSONB;
ALTER TABLE "products" ADD COLUMN "claimUz" TEXT;
ALTER TABLE "products" ADD COLUMN "claimRu" TEXT;
