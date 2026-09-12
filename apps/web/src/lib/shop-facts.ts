import { serverGet } from './server-get';

/**
 * Saytdagi va'dalar uchun haqiqiy raqamlar.
 *
 * NEGA. «400 000 so'mdan yuqori bepul», «300 000 so'mdan namuna
 * bepul», «buyurtmaning yarmigacha ball bilan» — uchalasi ham
 * matnga QATTIQ yozilgan edi, haqiqiy qiymatlar esa boshqa joyda
 * yashaydi. Xodim adminda chegarani o'zgartirsa, sayt eski raqamni
 * va'da qilishda davom etardi, savat esa yangisini qo'llardi.
 *
 * Server javob bermasa `null` qaytadi — o'shanda va'da umuman
 * ko'rsatilmaydi. Noto'g'ri raqamdan ko'ra raqamsiz gap yaxshi.
 */
export interface ShopFacts {
  freeShippingFrom: string | null;
  sampleFrom: string | null;
  loyaltyMaxRedeemPercent: number | null;
  loyaltyPointsPerSum: string | null;
}

const EMPTY: ShopFacts = {
  freeShippingFrom: null,
  sampleFrom: null,
  loyaltyMaxRedeemPercent: null,
  loyaltyPointsPerSum: null,
};

export async function getShopFacts(): Promise<ShopFacts> {
  try {
    const raw = await serverGet<Partial<ShopFacts>>('/shop-facts', 60);
    return { ...EMPTY, ...raw };
  } catch {
    return EMPTY;
  }
}

/** Tiyin → «400 000» ko'rinishidagi satr. */
export function sumOf(tiyin: string | null): string | null {
  if (!tiyin) return null;
  const value = BigInt(tiyin) / 100n;
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
