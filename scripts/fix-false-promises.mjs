/**
 * Bajarilmaydigan va'dalarni bazadan olib tashlaydi.
 *
 * NEGA. Seed'da banner «25% chegirma — Wine Lip Tint» deb sarlavha
 * qo'yardi, chegirmalar modulida esa bunday qoida YO'Q edi: xaridor
 * lab bo'yog'ini savatga solib, hech qanday chegirma ko'rmasdi.
 * Kodda bu tuzatildi, LEKIN matn allaqachon bazaga yozilib bo'lgan
 * edi — seed esa endi mavjud qatorga tegmaydi (va to'g'ri qiladi:
 * marketing o'zgartirgan matnni qayta yozib yuborish undan ham
 * yomon). Natijada yolg'on va'da saytda abadiy qolib ketardi.
 *
 * Shuning uchun aniq nishonli tuzatish: FAQAT o'zimiz yozgan eski
 * sarlavha topilsa almashtiriladi. Boshqa har qanday matnga —
 * xodim qo'lda yozganiga — tegilmaydi.
 *
 * Har deployda ishlaydi va idempotent: ikkinchi marta hech narsa
 * topmaydi.
 */
import { PrismaClient } from '@prisma/client';

/** Eski (yolg'on) → yangi (halol) matn. */
const RENAMES = [
  {
    titleUz: '25% chegirma — Wine Lip Tint',
    to: {
      titleUz: 'Wine Lip Tint — ipakdek matn',
      titleRu: 'Wine Lip Tint — шелковистая текстура',
    },
  },
];

if (!process.env.DATABASE_URL) {
  console.log('DATABASE_URL yo‘q — banner tuzatish o‘tkazib yuborildi.');
  process.exit(0);
}

const prisma = new PrismaClient();
let fixed = 0;

try {
  for (const rule of RENAMES) {
    const rows = await prisma.banner.findMany({ where: { titleUz: rule.titleUz } });
    for (const row of rows) {
      await prisma.banner.update({ where: { id: row.id }, data: rule.to });
      console.log(`  banner tuzatildi: «${rule.titleUz}» → «${rule.to.titleUz}»`);
      fixed += 1;
    }
  }

  /*
   * Takrorlangan banner. Sarlavha o'zgargach seed eskisini
   * topolmay qoldi va YANGISINI yaratdi — ikkalasi ham faol
   * turib qoldi. Bosh sahifa ikkitasini ham ko'rsatadi, ya'ni
   * bir xil aksiya ikki marta chiqadi.
   *
   * Eng eskisi qoldiriladi (uning tartib raqami va tahrirlari
   * bor), keyingilari o'chirilmaydi — faqat FAOL EMAS qilinadi:
   * o'chirish xodimning ishini yo'q qilishi mumkin.
   */
  const promos = await prisma.banner.findMany({
    where: { placement: 'PROMO', isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  const seen = new Set();
  for (const row of promos) {
    if (!seen.has(row.titleUz)) {
      seen.add(row.titleUz);
      continue;
    }
    await prisma.banner.update({ where: { id: row.id }, data: { isActive: false } });
    console.log(`  takrorlangan banner o‘chirildi (faol emas): «${row.titleUz}»`);
    fixed += 1;
  }

  if (fixed === 0) console.log('Bannerlar joyida.');
} finally {
  await prisma.$disconnect();
}
