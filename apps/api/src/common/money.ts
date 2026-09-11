/**
 * Pul bilan ishlash. ALIVER.UZ da pul HAR DOIM tiyinda, butun sonda saqlanadi.
 *
 * Sabab: suzuvchi nuqtali sonda 0.1 + 0.2 !== 0.3. Buyurtma summalari
 * tiyin darajasida farq qila boshlaydi va bu hisobotlarda chiqadi.
 * Ekspertiza A-5 bandi.
 */

export type Tiyin = bigint;

export const SUM = 100n; // 1 so'm = 100 tiyin

/** So'mdan tiyinga. Faqat butun so'm qabul qilinadi. */
export function sumToTiyin(sum: number): Tiyin {
  if (!Number.isFinite(sum)) throw new Error('money: son emas');
  if (!Number.isInteger(sum)) throw new Error('money: butun so‘m kutilgan');
  return BigInt(sum) * SUM;
}

/** Tiyindan so'mga (ko'rsatish uchun; hisob-kitobda ishlatilmaydi). */
export function tiyinToSum(t: Tiyin): number {
  return Number(t / SUM);
}

/**
 * Foiz chegirmasi. Yarim yuqoriga yaxlitlanadi (banker's rounding emas —
 * mijoz foydasiga emas, lekin bir ma'noli va takrorlanadigan).
 */
export function percentOf(amount: Tiyin, percent: number): Tiyin {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new Error('money: foiz 0..100 oralig‘ida butun son bo‘lishi kerak');
  }
  const p = BigInt(percent);
  return (amount * p + 50n) / 100n;
}

/** Narxni eng yaqin `step` so'mga yaxlitlash (masalan 100 so'mgacha). */
export function roundToSum(amount: Tiyin, stepSum = 100): Tiyin {
  const step = BigInt(stepSum) * SUM;
  if (step <= 0n) return amount;
  const rem = amount % step;
  return rem === 0n ? amount : amount - rem + (rem * 2n >= step ? step : 0n);
}

/**
 * Umumiy chegirmani pozitsiyalar bo'yicha proporsional taqsimlaydi.
 * Yaxlitlash qoldig'i eng katta pozitsiyaga qo'shiladi, shunda
 * yig'indi har doim `total` ga TENG bo'ladi.
 *
 * Bu qisman qaytarishda majburiy: qaytariladigan summa aynan shu
 * taqsimotdan hisoblanadi (ekspertiza A-2, A-5).
 */
export function allocateDiscount(lineTotals: Tiyin[], discount: Tiyin): Tiyin[] {
  if (discount <= 0n || lineTotals.length === 0) return lineTotals.map(() => 0n);

  const sum = lineTotals.reduce((a, b) => a + b, 0n);
  if (sum <= 0n) return lineTotals.map(() => 0n);
  if (discount > sum) throw new Error('money: chegirma pozitsiyalar yig‘indisidan katta');

  const parts = lineTotals.map((line) => (line * discount) / sum);
  const allocated = parts.reduce((a, b) => a + b, 0n);
  let remainder = discount - allocated;

  // Qoldiqni eng katta pozitsiyalardan boshlab bittalab tarqatamiz.
  const order = lineTotals
    .map((v, i) => ({ v, i }))
    .sort((a, b) => (b.v > a.v ? 1 : b.v < a.v ? -1 : 0));

  let k = 0;
  while (remainder > 0n && order.length > 0) {
    const idx = order[k % order.length]!.i;
    parts[idx] = parts[idx]! + 1n;
    remainder -= 1n;
    k += 1;
  }
  return parts;
}

/**
 * Narxdan QQS ni ajratib olish. O'zbekistonda narx odatda QQS bilan
 * ko'rsatiladi, chekda esa QQS summasi alohida ko'rsatiladi.
 * vatRate — foizda (masalan 12).
 */
export function vatFromGross(gross: Tiyin, vatRate: number): Tiyin {
  if (vatRate <= 0) return 0n;
  const r = BigInt(vatRate);
  return (gross * r + (100n + r) / 2n) / (100n + r);
}

/** Ko'rsatish uchun formatlash: 574000 tiyin -> "5 740" */
export function formatTiyin(t: Tiyin): string {
  const sum = t / SUM;
  return sum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
