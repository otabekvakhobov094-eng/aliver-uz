import { contentApi } from './content-api';

/**
 * Huquqiy sahifalarga havola — FAQAT nashr qilingani.
 *
 * NEGA. Rasmiylashtirish sahifasidagi majburiy rozilik yonida ikkita
 * havola bor: ommaviy oferta va maxfiylik siyosati. Ular qattiq
 * yozilgan edi, sahifalar esa seed'da NASHR QILINMAGAN holatda
 * turadi — matnini yurist beradi. Ya'ni xaridor «nimaga roziman?»
 * deb bosganida 404 ga tushardi. Aynan shu xato footerda ham bor edi
 * va u menyuni serverdan olish bilan hal qilingan.
 *
 * Bu yerda yo'l boshqacha, chunki forma mijoz komponenti: sahifalar
 * SERVERDA tekshiriladi va natija propda beriladi. Nashr qilinmagan
 * sahifa uchun `null` qaytadi — o'shanda matn havolasiz chiqadi.
 * Rozilik baribir kuchda: matn yurist matnini nashr qilgan kuni
 * havolaga aylanadi.
 */
export interface LegalLinks {
  offer: string | null;
  privacy: string | null;
}

async function published(slug: string, locale: string): Promise<string | null> {
  try {
    await contentApi.page(slug);
    return `/${locale}/sahifa/${slug}`;
  } catch {
    // Nashr qilinmagan sahifa 404 beradi — bu kutilgan holat.
    return null;
  }
}

export async function legalLinks(locale: string): Promise<LegalLinks> {
  const [offer, privacy] = await Promise.all([
    published('public-offer', locale),
    published('privacy-policy', locale),
  ]);
  return { offer, privacy };
}
