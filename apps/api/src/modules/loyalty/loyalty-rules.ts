import type { Tiyin } from '../../common/money';

/**
 * Sodiqlik dasturi qoidalari — TZ-3.
 *
 * «Ikki valyuta» degani: mijoz BALLARNI ko'radi, lekin ularning qiymati
 * har doim SO'MDA ham yoziladi. Faqat ball ko'rsatish mijozga hech
 * narsa demaydi — «1 250 ball» qancha ekanini u bilmaydi va shuning
 * uchun ishlatmaydi ham.
 *
 * Ataylab Prisma dan mustaqil: bu pul hisobi va u to'g'ridan-to'g'ri
 * sinaladi. Ball BUTUN SON, so'm esa har doim tiyinda.
 */

/** Har 1 000 so'mga 1 ball. */
export const POINTS_PER_SUM: Tiyin = 1_000_00n;

/** 1 ball = 100 so'm. Ya'ni qaytim 10%. */
export const TIYIN_PER_POINT: Tiyin = 100_00n;

/**
 * Bitta buyurtmada ballar bilan qoplash mumkin bo'lgan ULUSH.
 *
 * 100% ga ruxsat berilmaydi va bu ataylab: to'liq ball bilan to'langan
 * buyurtmada to'lov provayderi umuman ishtirok etmaydi, fiskal chek esa
 * nol summaga chiqadi — ikkalasi ham alohida holat va ular qo'shimcha
 * xato manbai bo'lardi. Yarmi amalda yetarli va sanoatda odatiy.
 */
export const MAX_REDEEM_SHARE = 50; // foiz

/** Faoliyatsizlikdan keyin ballar kuyadi. */
export const EXPIRY_MONTHS = 12;

/**
 * Buyurtma uchun beriladigan ball.
 *
 * Hisob CHEGIRMADAN KEYINGI, YETKAZISHSIZ summadan olinadi:
 *   — chegirmadan keyin, aks holda aksiya ustiga ball ham berilib,
 *     bitta chegirma ikki marta beriladi;
 *   — yetkazishsiz, chunki yetkazish bizning daromadimiz emas.
 *
 * Pastga yaxlitlanadi: yarim ball degan narsa yo'q.
 */
export function pointsForOrder(params: {
  itemsTotalAfterDiscount: Tiyin;
  /** Ball bilan qoplangan qism — unga ball BERILMAYDI. */
  paidWithPoints?: Tiyin;
}): number {
  const base = params.itemsTotalAfterDiscount - (params.paidWithPoints ?? 0n);
  if (base <= 0n) return 0;
  return Number(base / POINTS_PER_SUM);
}

/** Ball → so'm (tiyinda). */
export function pointsToTiyin(points: number): Tiyin {
  if (points <= 0) return 0n;
  return BigInt(Math.floor(points)) * TIYIN_PER_POINT;
}

/** So'm (tiyinda) → ball, pastga yaxlitlab. */
export function tiyinToPoints(amount: Tiyin): number {
  if (amount <= 0n) return 0;
  return Number(amount / TIYIN_PER_POINT);
}

export interface RedeemPlan {
  /** Haqiqatda ishlatiladigan ball. */
  points: number;
  /** Uning so'mdagi qiymati, tiyinda. */
  amount: Tiyin;
  /** Shu buyurtmada ishlatish mumkin bo'lgan eng ko'p ball. */
  maxPoints: number;
  /** Nega so'ralgandan kam berildi. */
  reason: 'ok' | 'balance' | 'cap' | 'nothing';
}

/**
 * Ball ishlatish rejasi.
 *
 * Uchta chegara bir vaqtda qo'llanadi va eng KICHIGI g'olib chiqadi:
 * mijozning balansi, buyurtmaning ulush chegarasi, va so'ralgan miqdor.
 * Ularni alohida tekshirish har safar bittasini unutishga olib kelardi.
 */
export function planRedeem(params: {
  requestedPoints: number;
  balance: number;
  /** Chegirmadan keyingi mahsulot summasi (yetkazishsiz). */
  itemsTotalAfterDiscount: Tiyin;
}): RedeemPlan {
  const capAmount =
    (params.itemsTotalAfterDiscount * BigInt(MAX_REDEEM_SHARE)) / 100n;
  const capPoints = tiyinToPoints(capAmount);
  const maxPoints = Math.max(0, Math.min(params.balance, capPoints));

  const requested = Math.max(0, Math.floor(params.requestedPoints));
  const points = Math.min(requested, maxPoints);

  let reason: RedeemPlan['reason'] = 'ok';
  if (maxPoints === 0) reason = 'nothing';
  else if (requested > params.balance) reason = 'balance';
  else if (requested > capPoints) reason = 'cap';

  return { points, amount: pointsToTiyin(points), maxPoints, reason };
}

/** Ballning kuyish sanasi — oxirgi harakatdan hisoblanadi. */
export function expiresAt(lastActivity: Date, months = EXPIRY_MONTHS): Date {
  const d = new Date(lastActivity);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Buyurtma bekor qilinganda yoki qaytarilganda ballarni qaytarish.
 *
 * Ikki tomonlama: berilgan ball OLINADI, ishlatilgan ball QAYTARILADI.
 * Faqat bittasini qilish mijozni yo yutuqda, yo zararda qoldirardi.
 */
export function reversalFor(params: { earned: number; redeemed: number }): {
  take: number;
  giveBack: number;
} {
  return {
    take: Math.max(0, params.earned),
    giveBack: Math.max(0, params.redeemed),
  };
}

/* ==========================================================================
   BALLARNING KUYISHI
   ========================================================================== */

/**
 * Kuyishdan necha kun oldin ogohlantiriladi.
 *
 * 14 kun ataylab: bir hafta kam — mijoz ta'tilda bo'lsa xabarni
 * ko'rmaydi; bir oy ko'p — xabar unutiladi va ball baribir kuyadi.
 * Ikki hafta ichida odam bitta buyurtma berishga ulguradi, buyurtma
 * esa muddatni yana 12 oyga uzaytiradi.
 */
export const EXPIRY_WARN_DAYS = 14;

/**
 * Ballning holati.
 *
 *  - `none`    — kuyadigan ball yo'q (balans nol yoki manfiy);
 *  - `active`  — muddat hali uzoq;
 *  - `warning` — kuyishga `warnDays` yoki undan kam qoldi;
 *  - `due`     — muddat o'tdi, ball kuyishi kerak.
 */
export type ExpiryStage = 'none' | 'active' | 'warning' | 'due';

export interface ExpiryState {
  stage: ExpiryStage;
  /** Kuyish sanasi. Balans nol bo'lsa — `null`. */
  expiresAt: Date | null;
  /** Kuyishgacha qolgan to'liq kunlar. Muddat o'tgan bo'lsa — manfiy. */
  daysLeft: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Ballning kuyish holati.
 *
 * FAOLIYAT deganda mijozning o'z harakati tushuniladi: ball olish,
 * ishlatish, admin tuzatishi yoki qaytarish. Tizimning o'zi yozadigan
 * EXPIRE yozuvi faoliyat EMAS — aks holda kuydirish amali muddatni
 * o'zi qaytadan uzaytirib, ball hech qachon kuymasdi.
 *
 * Balans nol bo'lsa sana umuman ko'rsatilmaydi: «0 ball 12 oydan keyin
 * kuyadi» degan yozuv mijozni chalg'itadi.
 */
export function expiryState(params: {
  lastActivityAt: Date | null;
  balance: number;
  now: Date;
  months?: number;
  warnDays?: number;
}): ExpiryState {
  if (!params.lastActivityAt || params.balance <= 0) {
    return { stage: 'none', expiresAt: null, daysLeft: null };
  }

  const at = expiresAt(params.lastActivityAt, params.months ?? EXPIRY_MONTHS);
  const warnDays = params.warnDays ?? EXPIRY_WARN_DAYS;

  // Yuqoriga yaxlitlash: muddat tugashiga 0.4 kun qolgan bo'lsa ham
  // «1 kun qoldi» deyiladi, «0 kun» emas.
  const daysLeft = Math.ceil((at.getTime() - params.now.getTime()) / DAY_MS);

  if (at.getTime() <= params.now.getTime()) {
    return { stage: 'due', expiresAt: at, daysLeft };
  }
  if (daysLeft <= warnDays) {
    return { stage: 'warning', expiresAt: at, daysLeft };
  }
  return { stage: 'active', expiresAt: at, daysLeft };
}

/**
 * Ogohlantirish takrorlanmasligi uchun kalit.
 *
 * Kalitga KUYISH SANASI kiradi, yuborilgan vaqt emas. Shuning uchun
 * bitta muddat davrida faqat bitta xabar ketadi, mijoz biror amal
 * qilib muddatni uzaytirsa esa sana o'zgaradi va keyingi davrda yana
 * bitta xabar ketadi. Buning uchun alohida jadval kerak emas.
 */
export function expiryWarnKey(customerId: string, at: Date): string {
  return `${customerId}:${at.toISOString().slice(0, 10)}`;
}
