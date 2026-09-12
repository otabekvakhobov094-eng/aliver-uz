import type { Tiyin } from '../../common/money';

/**
 * Savatdagi namuna qoidalari — TZ-3.
 *
 * Naqsh go'zallik savdosida standart va sababi oddiy: namuna tanlash
 * o'rtacha chekni ko'taradi, chunki mijoz ostonagacha yetish uchun
 * yana bitta narsa qo'shadi. Sephora, Cult Beauty va Douglas — uchalasi
 * ham shu bilan ishlaydi.
 *
 * Ataylab Prisma dan mustaqil: qoidalar sof hisob va ular to'g'ridan
 * to'g'ri sinaladi.
 */

/** Namuna ochiladigan osona, tiyinda. Sozlamadan keladi. */
export const DEFAULT_SAMPLE_THRESHOLD: Tiyin = 30_000_00n; // 300 000 so'm

export interface SampleState {
  /** Namuna tanlash ochilganmi. */
  unlocked: boolean;
  /** Ochilmagan bo'lsa — yana qancha kerak, tiyinda. */
  remaining: Tiyin;
  threshold: Tiyin;
  /** Tanlangan namuna hali ham haqli mi. */
  keepsSelection: boolean;
}

/**
 * Osona CHEGIRMADAN KEYINGI summaga qo'llanadi.
 *
 * Bu ataylab: aks holda mijoz promo-kod bilan 300 000 dan pastga
 * tushib, baribir namuna olardi — va bu chegirmani ikki marta
 * bergandek bo'lardi. Yetkazish narxi ham hisobga olinmaydi: u
 * mahsulot emas.
 */
export function sampleState(params: {
  subtotalAfterDiscount: Tiyin;
  threshold?: Tiyin;
  hasSelection: boolean;
}): SampleState {
  const threshold = params.threshold ?? DEFAULT_SAMPLE_THRESHOLD;
  const unlocked = params.subtotalAfterDiscount >= threshold;
  return {
    unlocked,
    remaining: unlocked ? 0n : threshold - params.subtotalAfterDiscount,
    threshold,
    // Mijoz namunani tanlab, keyin mahsulot olib tashlasa — tanlov
    // bekor bo'ladi. Aks holda u bepul namunani ostonaga yetmasdan
    // olib qolardi.
    keepsSelection: params.hasSelection && unlocked,
  };
}

/**
 * Progress — «yana 45 000 so'm qo'shsangiz namuna bepul».
 *
 * 0 dan 1 gacha. Interfeys buni chiziq qilib ko'rsatadi va bu
 * ostonaga yetish istagini aniq qiladi.
 */
export function sampleProgress(subtotalAfterDiscount: Tiyin, threshold: Tiyin): number {
  if (threshold <= 0n) return 1;
  if (subtotalAfterDiscount >= threshold) return 1;
  // BigInt bo'linmasi kasr bermaydi — to'g'ridan-to'g'ri bo'lish har
  // doim 0 yoki 1 chiqarardi va chiziq hech qachon qimirlamasdi.
  // Shuning uchun avval ko'paytiramiz.
  //
  // Aniqlik 1/10000: 300 000 so'mlik osonada bu 30 so'mlik qadam,
  // ya'ni chiziq mijoz qo'shadigan har qanday haqiqiy summada
  // siljiydi. Bundan kichik qiymat nolga yaxlitlanadi va bu to'g'ri —
  // 1 so'm progressni ko'rsatmasligi kerak.
  const scaled = (subtotalAfterDiscount * 10000n) / threshold;
  return Number(scaled) / 10000;
}
