import { BadRequestException } from '@nestjs/common';

/**
 * Yetkazib berish narxi va muddati.
 *
 * TZ 29–30: hudud bo'yicha narx, bepul yetkazish chegarasi, taxminiy muddat.
 * Ekspertiza (prototipdagi checkout ekrani): ekspress FAQAT Toshkent shahrida —
 * boshqa hududda uni tanlab bo'lmaydi va narxi ham qo'shilmaydi.
 */

export type DeliveryType = 'COURIER' | 'EXPRESS' | 'PICKUP';

export interface DeliveryOptionInput {
  code: string;
  type: DeliveryType;
  nameUz: string;
  nameRu: string;
  descUz?: string | null;
  descRu?: string | null;
  /** Usulning standart narxi, tiyin. */
  basePrice: bigint;
  basefreeThreshold?: bigint | null;
  baseDaysMin: number;
  baseDaysMax: number;
  /** Hudud bo'yicha ustunlik (bo'lmasa standart qiymatlar ishlatiladi). */
  region?: {
    price: bigint;
    freeThreshold?: bigint | null;
    daysMin?: number | null;
    daysMax?: number | null;
    isAvailable: boolean;
  } | null;
}

export interface QuoteContext {
  /** Chegirmadan keyingi mahsulotlar summasi — bepul yetkazish shundan hisoblanadi. */
  subtotalAfterDiscount: bigint;
  /** Chegirma "bepul yetkazish" bergan bo'lsa. */
  freeShippingFromDiscount?: boolean;
}

export interface DeliveryQuote {
  code: string;
  type: DeliveryType;
  nameUz: string;
  nameRu: string;
  descUz: string | null;
  descRu: string | null;
  price: bigint;
  /** Chegirmasiz asl narx — "bepul" belgisini ko'rsatish uchun. */
  basePrice: bigint;
  isFree: boolean;
  freeThreshold: bigint | null;
  /** Bepul yetkazishgacha qancha qoldi (0 bo'lsa allaqachon bepul). */
  amountToFree: bigint;
  daysMin: number;
  daysMax: number;
  available: boolean;
  unavailableReasonUz: string | null;
  unavailableReasonRu: string | null;
}

export function quoteOption(option: DeliveryOptionInput, ctx: QuoteContext): DeliveryQuote {
  const region = option.region ?? null;

  // Hudud uchun ochilmagan usul — narx ham hisoblanmaydi.
  //
  // OLIB KETISH ham istisno emas: admin uni hudud uchun o'chirsa,
  // checkout da ham ko'rinmasligi kerak (avval u har doim "mavjud" deb
  // qaytardi va admin belgisi e'tiborsiz qolardi).
  const available = region?.isAvailable ?? true;

  const basePrice = region ? region.price : option.basePrice;
  const freeThreshold = region?.freeThreshold ?? option.basefreeThreshold ?? null;

  let price = option.type === 'PICKUP' ? 0n : basePrice;
  let isFree = price === 0n;

  if (!isFree && ctx.freeShippingFromDiscount) {
    price = 0n;
    isFree = true;
  }
  // Bepul yetkazish chegarasi faqat oddiy kuryerga tegishli: ekspress —
  // qo'shimcha xizmat, u chegara bilan bepul bo'lmaydi.
  if (!isFree && option.type === 'COURIER' && freeThreshold != null) {
    if (ctx.subtotalAfterDiscount >= freeThreshold) {
      price = 0n;
      isFree = true;
    }
  }

  const amountToFree =
    option.type === 'COURIER' && freeThreshold != null && !isFree
      ? freeThreshold - ctx.subtotalAfterDiscount
      : 0n;

  return {
    code: option.code,
    type: option.type,
    nameUz: option.nameUz,
    nameRu: option.nameRu,
    descUz: option.descUz ?? null,
    descRu: option.descRu ?? null,
    price,
    basePrice,
    isFree,
    freeThreshold,
    amountToFree: amountToFree > 0n ? amountToFree : 0n,
    daysMin: region?.daysMin ?? option.baseDaysMin,
    daysMax: region?.daysMax ?? option.baseDaysMax,
    available,
    unavailableReasonUz: available ? null : 'Bu hududda mavjud emas',
    unavailableReasonRu: available ? null : 'Недоступно в этом регионе',
  };
}

export function quoteAll(options: DeliveryOptionInput[], ctx: QuoteContext): DeliveryQuote[] {
  return options
    .map((o) => quoteOption(o, ctx))
    .sort((a, b) => Number(a.price - b.price) || a.daysMax - b.daysMax);
}

/** Checkout da tanlangan usulni tekshiradi va narxini qaytaradi. */
export function pickQuote(quotes: DeliveryQuote[], code: string): DeliveryQuote {
  const quote = quotes.find((q) => q.code === code);
  if (!quote) throw new BadRequestException('Yetkazib berish usuli topilmadi');
  if (!quote.available) {
    throw new BadRequestException('Tanlangan yetkazib berish usuli bu hududda mavjud emas');
  }
  return quote;
}

/** Taxminiy yetkazish oynasi: bugundan boshlab. */
export function estimateWindow(
  quote: DeliveryQuote,
  from: Date = new Date(),
): { from: Date; to: Date } {
  const day = 24 * 3600 * 1000;
  return {
    from: new Date(from.getTime() + quote.daysMin * day),
    to: new Date(from.getTime() + quote.daysMax * day),
  };
}
