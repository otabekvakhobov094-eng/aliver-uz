-- Xodim izohi uchun ALOHIDA ustun.
--
-- Ilgari adminka `comment` ustuniga yozardi — o'sha ustunga ariza
-- beruvchining O'ZI yozgan matn tushadi. Ya'ni xodim "qo'ng'iroq
-- qildim" deb yozsa, mijozning arizasi o'chib ketardi va uni
-- tiklashning iloji yo'q edi (audit jurnalida ham `before` yozilmasdi).
--
-- `ContactMessage` da bu to'g'ri qilingan: u yerda `note` alohida.
ALTER TABLE "b2b_leads" ADD COLUMN "note" TEXT;
