import { createHash, randomBytes } from 'node:crypto';
import type { Tiyin } from '../../common/money';

/**
 * Sovg'a sertifikati — TZ-3.
 *
 * Sertifikat pul kabi narsa va shu sababdan uchta qoida boshqa
 * modullardan qat'iyroq:
 *
 *   1. Kod BAZADA OCHIQ SAQLANMAYDI. Faqat xesh. Baza nusxasi
 *      chiqib ketsa (zaxira, xodim, tekshiruv), ochiq kod bilan
 *      hammasini darhol ishlatib bo'lardi — parol bilan bir xil
 *      mantiq.
 *   2. Balans harakatlar yig'indisi, alohida ustun emas — sodiqlik
 *      ballaridagi bilan bir xil sabab.
 *   3. Qisman ishlatish qo'llanadi: 500 000 lik sertifikatdan
 *      120 000 ishlatilsa, qolgani kuyib ketmasligi kerak.
 *
 * Ataylab Prisma dan mustaqil.
 */

/** Kod uzunligi va alifbo. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // I, O, 0, 1 yo'q
const GROUP = 4;
const GROUPS = 4; // ALV-XXXX-XXXX-XXXX-XXXX

/**
 * Kod yaratish.
 *
 * Chalkashadigan belgilar (I/1, O/0) alifboda YO'Q: kod telefonda
 * aytiladi va qo'lda teriladi. Bitta noto'g'ri o'qilgan harf — bu
 * qo'llab-quvvatlashga qo'ng'iroq.
 *
 * `randomBytes` — `Math.random()` emas: sertifikat pul, va taxmin
 * qilinadigan kod to'g'ridan-to'g'ri o'g'irlik yo'li.
 */
export function generateCode(): string {
  const bytes = randomBytes(GROUP * GROUPS);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  const parts: string[] = [];
  for (let i = 0; i < GROUPS; i += 1) parts.push(out.slice(i * GROUP, (i + 1) * GROUP));
  return `ALV-${parts.join('-')}`;
}

/** Kodni tekshirish va solishtirish uchun normal shaklga keltirish. */
export function normaliseCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '').replace(/^ALV-?/, '').replace(/-/g, '');
}

/**
 * Kod xeshi.
 *
 * Parol emas, shuning uchun bcrypt kerak emas: kod 20 belgili tasodifiy
 * qiymat va lug'at hujumi unga ta'sir qilmaydi. Lekin SHA-256 «sir»
 * bilan olinadi — bazani ko'rgan odam kod ro'yxatini oldindan
 * hisoblab qo'ya olmasin.
 */
export function hashCode(code: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${normaliseCode(code)}`).digest('hex');
}

export type GiftCardStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

export interface GiftCardState {
  status: GiftCardStatus;
  /** Qolgan summa, tiyinda. */
  remaining: Tiyin;
  usable: boolean;
  reason: 'ok' | 'expired' | 'cancelled' | 'empty';
}

/**
 * Sertifikatning joriy holati.
 *
 * Muddat va bekor qilish BALANSDAN oldin tekshiriladi: muddati o'tgan
 * sertifikatda pul qolgan bo'lishi mumkin va sababni aniq aytish
 * kerak, «pul yo'q» deb emas.
 */
export function cardState(params: {
  initialAmount: Tiyin;
  spent: Tiyin;
  expiresAt: Date | null;
  cancelledAt: Date | null;
  now?: Date;
}): GiftCardState {
  const now = params.now ?? new Date();
  const remaining = params.initialAmount - params.spent;

  if (params.cancelledAt) {
    return { status: 'CANCELLED', remaining, usable: false, reason: 'cancelled' };
  }
  if (params.expiresAt && params.expiresAt <= now) {
    return { status: 'EXPIRED', remaining, usable: false, reason: 'expired' };
  }
  if (remaining <= 0n) {
    return { status: 'USED', remaining: 0n, usable: false, reason: 'empty' };
  }
  return { status: 'ACTIVE', remaining, usable: true, reason: 'ok' };
}

/**
 * Buyurtmada qancha ishlatiladi.
 *
 * Qisman ishlatish QO'LLANADI: 500 000 lik sertifikatdan 120 000
 * ishlatilsa, qolgan 380 000 keyingi buyurtmaga qoladi. Aks holda
 * mijoz sertifikatni to'liq ishlatish uchun keraksiz narsa sotib
 * olishga majbur bo'lardi.
 *
 * Yetkazish narxi ham qoplanadi — sodiqlik ballaridan farqli. Sertifikat
 * sotib olingan pul, ya'ni u buyurtmaning istalgan qismiga o'tadi.
 */
export function planGiftUse(params: { remaining: Tiyin; orderTotal: Tiyin }): {
  amount: Tiyin;
  leftOnCard: Tiyin;
  coversWholeOrder: boolean;
} {
  const amount = params.remaining < params.orderTotal ? params.remaining : params.orderTotal;
  const safe = amount > 0n ? amount : 0n;
  return {
    amount: safe,
    leftOnCard: params.remaining - safe,
    // Butun buyurtma qoplansa to'lov provayderi kerak emas — chaqiruvchi
    // buni bilishi kerak, aks holda u nol summaga to'lov ochardi.
    coversWholeOrder: safe >= params.orderTotal && params.orderTotal > 0n,
  };
}

/** Kodni ko'rsatish uchun maskalash: ALV-••••-••••-••••-7K3P */
export function maskCode(code: string): string {
  const flat = normaliseCode(code);
  const tail = flat.slice(-4);
  return `ALV-••••-••••-••••-${tail}`;
}

/* ==========================================================================
   MUDDAT TUGASHIDAN OLDIN OGOHLANTIRISH
   ========================================================================== */

/**
 * Ogohlantirish bosqichlari — muddat tugashiga necha kun qolganda.
 *
 * IKKITA, chunki sertifikat sotib olingan PUL. Bitta xabar yetarli
 * emas: 30 kun odamga xarid rejalashtirishga vaqt beradi, 7 kun esa
 * unutganlarga oxirgi eslatma. Ballarda bitta ogohlantirish yetarli —
 * ular bepul berilgan; bu yerda esa mijoz haqiqiy pul to'lagan.
 *
 * Kamayish tartibida: birinchi mos keladigan bosqich tanlanadi.
 */
export const GIFTCARD_WARN_DAYS = [30, 7] as const;

export interface GiftCardExpiryWarning {
  /** Qaysi bosqich ishga tushdi. `null` — hozircha ogohlantirish kerak emas. */
  milestone: number | null;
  daysLeft: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sertifikat bo'yicha ogohlantirish kerakmi.
 *
 * Faqat ISHLATSA BO'LADIGAN kartalar uchun: bekor qilingan, allaqachon
 * tugagan yoki puli qolmagan kartaga «muddati tugayapti» deb yozish
 * mijozni chalg'itadi va ishonchni yo'qotadi.
 */
export function giftCardWarning(params: {
  expiresAt: Date | null;
  remaining: Tiyin;
  cancelledAt: Date | null;
  now: Date;
  milestones?: readonly number[];
}): GiftCardExpiryWarning {
  const none: GiftCardExpiryWarning = { milestone: null, daysLeft: null };
  if (!params.expiresAt || params.cancelledAt || params.remaining <= 0n) return none;

  const daysLeft = Math.ceil((params.expiresAt.getTime() - params.now.getTime()) / DAY_MS);
  if (daysLeft <= 0) return none; // allaqachon tugagan — ogohlantirish kech

  const milestones = params.milestones ?? GIFTCARD_WARN_DAYS;
  // Kamayish tartibida: 30 kunlik oyna ichida bo'lsa 30, 7 kunlik
  // oynaga kirgach 7. Har bir bosqich uchun alohida kalit beriladi,
  // shuning uchun ikkinchi xabar birinchisini bosib o'tmaydi.
  const ordered = [...milestones].sort((a, b) => a - b);
  const hit = ordered.find((m) => daysLeft <= m);
  return hit === undefined ? none : { milestone: hit, daysLeft };
}

/**
 * Ogohlantirish takrorlanmasligi uchun kalit.
 *
 * Kalitga KARTA, MUDDAT SANASI va BOSQICH kiradi. Sana kalitda
 * bo'lgani uchun admin muddatni uzaytirsa yangi davr boshlanadi va
 * mijoz yana xabar oladi; bosqich kalitda bo'lgani uchun 30 kunlik
 * xabar 7 kunlik xabarni to'sib qo'ymaydi.
 */
export function giftCardWarnKey(cardId: string, at: Date, milestone: number): string {
  return `${cardId}:${at.toISOString().slice(0, 10)}:${milestone}`;
}
