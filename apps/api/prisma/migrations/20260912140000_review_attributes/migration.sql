-- Sharh atributlari va «menga o'xshaganlar» filtri — TZ-3.
--
-- Atributlar HAM mijoz profilida, HAM sharhda saqlanadi va bu ataylab
-- takrorlanish: mijoz teri turini o'zgartirsa, eski sharh o'sha paytdagi
-- holatni aks ettirishi kerak. Aks holda «quruq teri uchun zo'r» degan
-- sharh bir kunda «yog'li teri uchun zo'r» ga aylanib qolardi.

CREATE TYPE "SkinType" AS ENUM ('NORMAL', 'DRY', 'OILY', 'COMBINATION', 'SENSITIVE');
CREATE TYPE "HairType" AS ENUM ('STRAIGHT', 'WAVY', 'CURLY', 'COILY');
-- Aniq yosh SO'RALMAYDI: u shaxsiy ma'lumot va sharh ostida
-- ko'rsatilganda mijozni aniqlashga yaqinlashtiradi.
CREATE TYPE "AgeBand" AS ENUM ('UNDER_25', 'FROM_25_TO_34', 'FROM_35_TO_44', 'OVER_45');

ALTER TABLE "customers" ADD COLUMN "skinType" "SkinType";
ALTER TABLE "customers" ADD COLUMN "hairType" "HairType";
ALTER TABLE "customers" ADD COLUMN "ageBand"  "AgeBand";

ALTER TABLE "reviews" ADD COLUMN "skinType" "SkinType";
ALTER TABLE "reviews" ADD COLUMN "hairType" "HairType";
ALTER TABLE "reviews" ADD COLUMN "ageBand"  "AgeBand";

-- Filtr aynan shu uch maydon bo'yicha qidiradi.
CREATE INDEX "reviews_productId_status_skinType_idx"
  ON "reviews" ("productId", "status", "skinType");
