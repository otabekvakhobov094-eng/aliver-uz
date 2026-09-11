import type { Tiyin } from '../../common/money';

/**
 * Qaytarish siyosati.
 *
 * TZ 56-bo'limda "tovar 14 kun ichida qaytariladi" deyilgan, lekin
 * muddat qaysi paytdan boshlanishi, kosmetika uchun ochilgan qadoq
 * qaytariladimi va yetkazish narxi qaytariladimi — yozilmagan
 * (ekspertiza A-2). Bu fayl aynan shu savollarga javob beradi va
 * javoblar BITTA joyda turadi: yurist xulosasi kelganda faqat shu
 * fayldagi qiymatlar o'zgaradi.
 *
 * Muhim: O'zbekiston qonunchiligida parfyumeriya-kosmetika mahsuloti
 * sifatli bo'lsa qaytarilmaydigan tovarlar ro'yxatida. Shuning uchun
 * standart siyosat: OCHILMAGAN qadoq — qaytariladi, ochilgan —
 * faqat nuqson yoki noto'g'ri tovar bo'lsa.
 */

export type ReasonCode = 'WRONG_ITEM' | 'NOT_SUITABLE' | 'DAMAGED' | 'QUALITY' | 'OTHER';

export const REASON_LABEL: Record<ReasonCode, { uz: string; ru: string }> = {
  WRONG_ITEM: { uz: 'Boshqa tovar keldi', ru: 'Пришёл не тот товар' },
  NOT_SUITABLE: { uz: 'To‘g‘ri kelmadi', ru: 'Не подошёл' },
  DAMAGED: { uz: 'Shikastlangan holda keldi', ru: 'Повреждён при доставке' },
  QUALITY: { uz: 'Sifat muammosi', ru: 'Проблема с качеством' },
  OTHER: { uz: 'Boshqa sabab', ru: 'Другая причина' },
};

/**
 * Sabab BIZNING aybimiz bilanmi.
 *
 * Bizning aybimiz bo'lsa yetkazib berish narxi ham qaytariladi va
 * ochilgan qadoq ham qabul qilinadi.
 */
export const OUR_FAULT: ReasonCode[] = ['WRONG_ITEM', 'DAMAGED', 'QUALITY'];

export function isOurFault(reason: ReasonCode): boolean {
  return OUR_FAULT.includes(reason);
}

export interface ReturnPolicy {
  /** Necha kun ichida qaytarish mumkin. */
  windowDays: number;
  /**
   * Ochilgan kosmetika qaytariladimi.
   * `false` — faqat bizning aybimiz bo'lsa (standart).
   */
  acceptOpened: boolean;
  /**
   * Yetkazish narxi qaytariladimi.
   * `ourFaultOnly` — faqat bizning aybimiz bo'lsa (standart).
   */
  refundShipping: 'never' | 'ourFaultOnly' | 'always';
}

export const DEFAULT_POLICY: ReturnPolicy = {
  windowDays: 14,
  acceptOpened: false,
  refundShipping: 'ourFaultOnly',
};

/* ========================================================================
   MUDDAT
   ======================================================================== */

export type EligibilityReason =
  'OK' | 'NOT_DELIVERED' | 'WINDOW_EXPIRED' | 'ALREADY_RETURNED' | 'NOTHING_TO_RETURN';

export const ELIGIBILITY_MESSAGE: Record<EligibilityReason, { uz: string; ru: string }> = {
  OK: { uz: '', ru: '' },
  NOT_DELIVERED: {
    uz: 'Buyurtma hali yetkazilmagan — qaytarish yetkazilgandan keyin mumkin',
    ru: 'Заказ ещё не доставлен — возврат возможен после доставки',
  },
  WINDOW_EXPIRED: {
    uz: 'Qaytarish muddati tugagan',
    ru: 'Срок возврата истёк',
  },
  ALREADY_RETURNED: {
    uz: 'Bu buyurtma bo‘yicha qaytarish so‘rovi allaqachon ochilgan',
    ru: 'По этому заказу уже открыт возврат',
  },
  NOTHING_TO_RETURN: {
    uz: 'Qaytarish mumkin bo‘lgan pozitsiya qolmagan',
    ru: 'Не осталось позиций, доступных к возврату',
  },
};

/**
 * Muddat YETKAZILGAN paytdan boshlanadi, buyurtma berilgan paytdan
 * emas: mijoz tovarni ko'rmasdan turib muddatni yo'qotmasligi kerak.
 */
export function deadlineFor(deliveredAt: Date, policy: ReturnPolicy = DEFAULT_POLICY): Date {
  return new Date(deliveredAt.getTime() + policy.windowDays * 24 * 3600 * 1000);
}

export function daysLeft(
  deliveredAt: Date,
  now: Date = new Date(),
  policy: ReturnPolicy = DEFAULT_POLICY,
): number {
  const ms = deadlineFor(deliveredAt, policy).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 3600 * 1000)));
}

/* ========================================================================
   QAYSI POZITSIYALARNI QAYTARISH MUMKIN
   ======================================================================== */

export interface OrderItemSnapshot {
  id: string;
  productName: string;
  variantName: string | null;
  sku: string;
  quantity: number;
  /** Dona narxi, tiyin (muzlatilgan nusxa). */
  unitPrice: Tiyin;
  /** Shu pozitsiyaga tushgan chegirma, tiyin. */
  discountAmount: Tiyin;
  /** (unitPrice * quantity) - discountAmount */
  lineTotal: Tiyin;
  /** Allaqachon qaytarilgan miqdor. */
  refundedQuantity: number;
}

export interface ReturnableLine extends OrderItemSnapshot {
  /** Yana qancha dona qaytarish mumkin. */
  returnableQuantity: number;
  /** Bitta dona uchun qaytariladigan summa (chegirma hisobga olingan). */
  refundPerUnit: Tiyin;
}

/**
 * Bitta dona uchun qaytariladigan summa.
 *
 * Chegirma pozitsiyaga TAQSIMLANGAN holda saqlanadi, shuning uchun
 * mijozga chegirmasiz narxni qaytarib bo'lmaydi — aks holda u
 * chegirma summasini "yutib" olardi. Formula: satr jami / miqdor,
 * qoldiq esa oxirgi donaga qo'shiladi (tiyin yo'qolmasligi uchun).
 */
export function refundPerUnit(item: OrderItemSnapshot): Tiyin {
  if (item.quantity <= 0) return 0n;
  return item.lineTotal / BigInt(item.quantity);
}

/**
 * Bir nechta dona uchun aniq summa.
 *
 * Hamma donalar qaytarilsa — AYNAN satr jami qaytariladi, bo'linish
 * qoldig'i yo'qolmaydi.
 */
export function refundForQuantity(item: OrderItemSnapshot, quantity: number): Tiyin {
  if (quantity <= 0) return 0n;
  const remaining = item.quantity - item.refundedQuantity;
  const qty = Math.min(quantity, remaining);
  if (qty <= 0) return 0n;

  // Hammasi (yoki qolgan hammasi) qaytarilsa — qoldiqni ham beramiz.
  const alreadyRefunded = perUnitTotal(item, item.refundedQuantity);
  if (qty === remaining) return item.lineTotal - alreadyRefunded;

  return perUnitTotal(item, item.refundedQuantity + qty) - alreadyRefunded;
}

function perUnitTotal(item: OrderItemSnapshot, quantity: number): Tiyin {
  if (quantity <= 0) return 0n;
  if (quantity >= item.quantity) return item.lineTotal;
  return refundPerUnit(item) * BigInt(quantity);
}

export function returnableLines(items: OrderItemSnapshot[]): ReturnableLine[] {
  return items
    .map((i) => ({
      ...i,
      returnableQuantity: Math.max(0, i.quantity - i.refundedQuantity),
      refundPerUnit: refundPerUnit(i),
    }))
    .filter((i) => i.returnableQuantity > 0);
}

/* ========================================================================
   YETKAZIB BERISH NARXI
   ======================================================================== */

/**
 * Yetkazib berish narxi qaytariladimi.
 *
 * Standart qoida: faqat bizning aybimiz bilan (noto'g'ri tovar,
 * shikastlangan, sifat) VA butun buyurtma qaytarilganda. Mijoz bitta
 * pozitsiyani "to'g'ri kelmadi" deb qaytarsa, kuryer baribir yurgan —
 * bu xarajat qaytarilmaydi.
 */
export function shippingRefund(params: {
  shippingTotal: Tiyin;
  reason: ReasonCode;
  /** Butun buyurtma qaytarilyaptimi. */
  wholeOrder: boolean;
  policy?: ReturnPolicy;
}): Tiyin {
  const policy = params.policy ?? DEFAULT_POLICY;
  if (policy.refundShipping === 'never') return 0n;
  if (policy.refundShipping === 'always') return params.shippingTotal;
  return isOurFault(params.reason) && params.wholeOrder ? params.shippingTotal : 0n;
}

/* ========================================================================
   YIG'MA HISOB
   ======================================================================== */

export interface RequestedLine {
  orderItemId: string;
  quantity: number;
}

export interface RefundQuote {
  lines: Array<{
    orderItemId: string;
    productName: string;
    quantity: number;
    amount: Tiyin;
  }>;
  itemsTotal: Tiyin;
  shippingRefund: Tiyin;
  total: Tiyin;
  wholeOrder: boolean;
}

export class ReturnPolicyError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ReturnPolicyError';
  }
}

/**
 * So'ralgan pozitsiyalar bo'yicha qaytariladigan summani hisoblaydi.
 *
 * Hisob FAQAT muzlatilgan nusxaga tayanadi (order_items): katalogda
 * narx o'zgargan bo'lsa ham mijoz to'lagan summasini oladi.
 */
export function quoteRefund(params: {
  items: OrderItemSnapshot[];
  requested: RequestedLine[];
  shippingTotal: Tiyin;
  reason: ReasonCode;
  policy?: ReturnPolicy;
}): RefundQuote {
  if (params.requested.length === 0) {
    throw new ReturnPolicyError('NO_ITEMS', 'Qaytariladigan pozitsiya tanlanmagan');
  }

  const byId = new Map(params.items.map((i) => [i.id, i]));
  const seen = new Set<string>();
  const lines: RefundQuote['lines'] = [];
  let itemsTotal = 0n;

  for (const req of params.requested) {
    if (seen.has(req.orderItemId)) {
      throw new ReturnPolicyError('DUPLICATE_ITEM', 'Bitta pozitsiya ikki marta ko‘rsatilgan');
    }
    seen.add(req.orderItemId);

    const item = byId.get(req.orderItemId);
    if (!item) {
      throw new ReturnPolicyError('ITEM_NOT_FOUND', 'Pozitsiya bu buyurtmada yo‘q');
    }
    if (req.quantity <= 0) {
      throw new ReturnPolicyError('BAD_QUANTITY', 'Miqdor musbat bo‘lishi kerak');
    }

    const remaining = item.quantity - item.refundedQuantity;
    if (req.quantity > remaining) {
      throw new ReturnPolicyError(
        'TOO_MANY',
        `"${item.productName}" bo‘yicha ${remaining} donadan ortiq qaytarib bo‘lmaydi`,
      );
    }

    const amount = refundForQuantity(item, req.quantity);
    itemsTotal += amount;
    lines.push({
      orderItemId: item.id,
      productName: item.productName,
      quantity: req.quantity,
      amount,
    });
  }

  // Butun buyurtma qaytarilyaptimi: hamma pozitsiyaning hamma donasi.
  const wholeOrder = params.items.every((i) => {
    const req = params.requested.find((r) => r.orderItemId === i.id);
    const returning = (req?.quantity ?? 0) + i.refundedQuantity;
    return returning >= i.quantity;
  });

  const shipping = shippingRefund({
    shippingTotal: params.shippingTotal,
    reason: params.reason,
    wholeOrder,
    policy: params.policy,
  });

  return {
    lines,
    itemsTotal,
    shippingRefund: shipping,
    total: itemsTotal + shipping,
    wholeOrder,
  };
}

/**
 * Ochilgan qadoq qabul qilinadimi.
 *
 * Kosmetika sifatli bo'lsa va qadoq ochilgan bo'lsa — qaytarilmaydi
 * (qonun talabi). Nuqson yoki noto'g'ri tovar bo'lsa — qaytariladi.
 */
export function acceptsOpened(reason: ReasonCode, policy: ReturnPolicy = DEFAULT_POLICY): boolean {
  return policy.acceptOpened || isOurFault(reason);
}
