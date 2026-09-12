-- Sharh manbasi — Uzum Market do'konidan import uchun.
--
-- Manba MAJBURIY va uni yashirib bo'lmaydi: Uzum'dagi do'kondan olingan
-- sharh aliver.uz da qilingan xarid EMAS. Uni belgisiz ko'rsatish
-- mijozga «bu odam shu saytda sotib olgan» deb aytardi va
-- «tasdiqlangan xarid» yorlig'i yolg'on bo'lib qolardi.

CREATE TYPE "ReviewSource" AS ENUM ('SITE', 'UZUM', 'IMPORT');

-- Sukut bo'yicha SITE: mavjud sharhlarning hammasi aynan shunday.
ALTER TABLE "reviews" ADD COLUMN "source" "ReviewSource" NOT NULL DEFAULT 'SITE';
ALTER TABLE "reviews" ADD COLUMN "externalId" TEXT;
ALTER TABLE "reviews" ADD COLUMN "externalAuthor" TEXT;

-- Uzum sharhida bizda mijoz YO'Q — ustun ixtiyoriy bo'ladi.
ALTER TABLE "reviews" ALTER COLUMN "customerId" DROP NOT NULL;

-- Bir xil tashqi sharh IKKI MARTA import qilinmasin. Sinxronizatsiya
-- qayta-qayta ishga tushiriladi va bu kafolat kodda emas, BAZADA.
CREATE UNIQUE INDEX "reviews_source_externalId_key"
  ON "reviews" ("source", "externalId")
  WHERE "externalId" IS NOT NULL;
