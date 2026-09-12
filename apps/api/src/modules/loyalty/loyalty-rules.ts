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
