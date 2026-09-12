/**
 * Jurnalga yoziladigan mijoz IP si.
 *
 * NEGA ALOHIDA. Adminka `/api/...` ni O'Z SERVERI orqali uzatadi —
 * cookie birinchi tomon bo'lishi uchun. Natijada API ga so'rov
 * adminka serveridan keladi va `req.ip` operatorning emas, proksining
 * manzilini ko'rsatadi. Audit jurnalidagi «qayerdan» ustuni to'lgan
 * ko'rinadi, lekin «bu amalni kim qildi» degan savolga javob
 * bermaydi — bu eng yomon turdagi xato: ustun bor, ishonchsizligi
 * esa ko'rinmaydi.
 *
 * Adminkaning uzatuvchisi `X-Forwarded-For` ni O'ZGARTIRMASDAN
 * yuboradi (buni sinab ko'rdim), ya'ni haqiqiy mijoz manzili shu
 * ro'yxatning ENG CHAPIDA turadi.
 *
 * DIQQAT: bu qiymat FAQAT jurnal uchun. Chastota cheklovlari va
 * xavfsizlik qarorlari avvalgidek `req.ip` ga tayanadi: `X-Forwarded-For`
 * ni mijozning o'zi ham yozib yuborishi mumkin, ya'ni unga tayanib
 * kimnidir bloklash yoki o'tkazib yuborish mumkin emas.
 */

/** Ichki tarmoq manzili — jurnalda ma'nosi yo'q. */
const PRIVATE = /^(::1|::ffff:127\.|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fc|fd)/i;

export function auditIp(req: {
  ip?: string | null;
  headers?: Record<string, string | string[] | undefined>;
}): string | null {
  const raw = req.headers?.['x-forwarded-for'];
  const header = Array.isArray(raw) ? raw[0] : raw;

  for (const part of (header ?? '').split(',')) {
    const candidate = part.trim();
    if (!candidate) continue;
    // Ichki manzil o'tkazib yuboriladi: u proksining o'zi.
    if (PRIVATE.test(candidate)) continue;
    return candidate;
  }

  const direct = req.ip ?? null;
  if (direct && PRIVATE.test(direct)) return null;
  return direct;
}
