-- Uzum to'lov provayderi.
--
-- Postgres'da enum qiymatini qo'shish `ALTER TYPE ... ADD VALUE` bilan
-- bajariladi. Bu amal ESKI Postgres'da tranzaksiya ichida ishlamaydi,
-- Prisma esa migratsiyani tranzaksiyaga o'raydi — 12 va undan yuqori
-- versiyada ruxsat berilgan, loyiha esa 16 da ishlaydi.
--
-- `IF NOT EXISTS` qo'yilgan: migratsiya ikki marta ishlasa ham xato
-- bermasin (masalan qo'lda qo'shilgan bazada).
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'UZUM';
