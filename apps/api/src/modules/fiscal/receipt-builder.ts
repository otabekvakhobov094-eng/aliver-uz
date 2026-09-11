import { type Tiyin, vatFromGross } from '../../common/money';

/**
 * Fiskal chek pozitsiyasi — O'zbekiston OFD lari kutadigan ko'rinishda.
 *
 * Maydonlar ataylab provayder nomlari bilan (Name, SPIC, VAT…): chek
 * payload'i o'zgarmagan holda saqlanadi va nizo bo'lganda aynan nima
 * yuborilgani ko'rinadi.
 *
 * Ikkita nozik joy:
 *  - `Amount` — miqdor MINGGA ko'paytirilgan holda (3 kasrli aniqlik).
 *    1 dona = 1000. Bu OFD talabi, bizning "dona" tushunchamiz emas.
 *  - `VAT` — narx ICHIDAGI QQS (O'zbekistonda narx QQS bilan
 *    ko'rsatiladi), shuning uchun `vatFromGross` ishlatiladi, ko'paytirish
 *    emas.
 */
export interface FiscalItem {
  Name: string;
  Barcode: string | null;
  Labels: string[] | null;
  /** IKPU — mahsulot va xizmatlar yagona klassifikatori kodi. */
  SPIC: string;
  Units: number | null;
  PackageCode: string | null;
  /** Bir dona narxi, tiyin. */
  Price: number;
  /** Miqdor × 1000. */
  Amount: number;
  /** Pozitsiyaning umumiy summasi ichidagi QQS, tiyin. */
  VAT: number;
  VATPercent: number;
  /** Pozitsiyaga tushgan chegirma, tiyin. */
  Discount: number;
  Other: number;
}

export interface FiscalReceiptPayload {
  Items: FiscalItem[];
  /** Naqd to'langan summa, tiyin. */
  ReceivedCash: number;
  /** Karta orqali to'langan summa, tiyin. */
  ReceivedCard: number;
  Location: { Latitude: number | null; Longitude: number | null } | null;
  /** Bizning ichki ma'lumot — OFD ga ketmaydi, lekin yozuvda qoladi. */
  Meta: {
    orderNumber: string;
    orderId: string;
    paymentProvider: string;
    type: 'SALE' | 'REFUND';
    /** Yetkazib berish alohida pozitsiya sifatida qo'shilganmi. */
    shippingIncluded: boolean;
  };
}

export interface ReceiptOrderItem {
  productName: string;
  variantName: string | null;
  barcode: string | null;
  ikpuCode: string;
  /** O'lchov birligi kodi (soliq klassifikatori), masalan "1" — dona. */
  unitCode: string | null;
  packageCode: string | null;
  quantity: number;
  /** Bir dona narxi (chegirmasiz), tiyin. */
  unitPrice: Tiyin;
  /** Pozitsiyaga tushgan chegirma, tiyin. */
  discountAmount: Tiyin;
  vatRate: number;
}

export interface BuildReceiptParams {
  orderId: string;
  orderNumber: string;
  paymentProvider: string;
  items: ReceiptOrderItem[];
  /** Yetkazib berish narxi, tiyin. 0 bo'lsa pozitsiya qo'shilmaydi. */
  shippingTotal: Tiyin;
  shippingIkpu?: string | null;
  shippingVatRate?: number;
  type?: 'SALE' | 'REFUND';
}

/** Yetkazib berish xizmati uchun standart IKPU (sozlamadan kelmasa). */
export const DEFAULT_SHIPPING_IKPU = '10112001001000000';

/** Birlik kodi bazada satr, OFD esa son kutadi. */
function parseUnits(code: string | null): number | null {
  if (!code) return null;
  const n = Number(code);
  return Number.isFinite(n) ? n : null;
}

export class FiscalBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FiscalBuildError';
  }
}

/**
 * Buyurtmadan fiskal chek payload'ini quradi.
 *
 * Chek buyurtmaning MUZLATILGAN nusxasidan quriladi (order_items), joriy
 * katalogdan emas: chek berilgandan keyin katalogda narx yoki IKPU
 * o'zgarsa, chek o'zgarmasligi kerak.
 */
export function buildReceipt(params: BuildReceiptParams): FiscalReceiptPayload {
  if (params.items.length === 0) {
    throw new FiscalBuildError('Chekda birorta ham pozitsiya yo‘q');
  }

  const items: FiscalItem[] = params.items.map((i) => {
    if (!i.ikpuCode || i.ikpuCode.trim().length === 0) {
      throw new FiscalBuildError(
        `"${i.productName}" uchun IKPU kodi yo‘q — fiskal chek berib bo‘lmaydi`,
      );
    }
    if (i.quantity <= 0) {
      throw new FiscalBuildError(`"${i.productName}" miqdori musbat bo‘lishi kerak`);
    }

    const gross = i.unitPrice * BigInt(i.quantity) - i.discountAmount;
    if (gross < 0n) {
      throw new FiscalBuildError(`"${i.productName}" chegirmasi pozitsiya summasidan katta`);
    }

    return {
      Name: [i.productName, i.variantName].filter(Boolean).join(', '),
      Barcode: i.barcode,
      Labels: null,
      SPIC: i.ikpuCode,
      Units: parseUnits(i.unitCode),
      PackageCode: i.packageCode ?? null,
      Price: Number(i.unitPrice),
      Amount: i.quantity * 1000,
      VAT: Number(vatFromGross(gross, i.vatRate)),
      VATPercent: i.vatRate,
      Discount: Number(i.discountAmount),
      Other: 0,
    };
  });

  // Yetkazib berish ham xizmat — u ham chekka tushishi kerak.
  if (params.shippingTotal > 0n) {
    const vatRate = params.shippingVatRate ?? 12;
    items.push({
      Name: 'Yetkazib berish xizmati',
      Barcode: null,
      Labels: null,
      SPIC: params.shippingIkpu ?? DEFAULT_SHIPPING_IKPU,
      Units: null,
      PackageCode: null,
      Price: Number(params.shippingTotal),
      Amount: 1000,
      VAT: Number(vatFromGross(params.shippingTotal, vatRate)),
      VATPercent: vatRate,
      Discount: 0,
      Other: 0,
    });
  }

  const total = items.reduce(
    (s, it) => s + (BigInt(it.Price) * BigInt(it.Amount)) / 1000n - BigInt(it.Discount),
    0n,
  );

  // Naqd va karta ajratiladi: OFD chekda to'lov turini talab qiladi.
  const isCash = params.paymentProvider === 'CASH_ON_DELIVERY';

  return {
    Items: items,
    ReceivedCash: isCash ? Number(total) : 0,
    ReceivedCard: isCash ? 0 : Number(total),
    Location: null,
    Meta: {
      orderNumber: params.orderNumber,
      orderId: params.orderId,
      paymentProvider: params.paymentProvider,
      type: params.type ?? 'SALE',
      shippingIncluded: params.shippingTotal > 0n,
    },
  };
}

/** Chekning umumiy summasi va QQS i — yozuvga saqlash uchun. */
export function receiptTotals(payload: FiscalReceiptPayload): { total: Tiyin; vat: Tiyin } {
  let total = 0n;
  let vat = 0n;
  for (const it of payload.Items) {
    total += (BigInt(it.Price) * BigInt(it.Amount)) / 1000n - BigInt(it.Discount);
    vat += BigInt(it.VAT);
  }
  return { total, vat };
}

/**
 * Qaytarish cheki. Qisman qaytarishda pozitsiyalar proporsional
 * kamaytirilmaydi — bu noto'g'ri bo'lardi. Buning o'rniga bitta
 * "qaytarish" pozitsiyasi beriladi va unda umumiy summa ko'rsatiladi.
 * Pozitsiyalar bo'yicha aniq qaytarish 6-etapdagi qaytarish moduli
 * pozitsiyalarni bilgani uchun o'sha yerdan quriladi.
 */
export function buildRefundReceipt(params: {
  orderId: string;
  orderNumber: string;
  paymentProvider: string;
  amount: Tiyin;
  ikpuCode: string;
  vatRate: number;
}): FiscalReceiptPayload {
  if (params.amount <= 0n) throw new FiscalBuildError('Qaytarish summasi musbat bo‘lishi kerak');

  return {
    Items: [
      {
        Name: `Qaytarish — buyurtma ${params.orderNumber}`,
        Barcode: null,
        Labels: null,
        SPIC: params.ikpuCode,
        Units: null,
        PackageCode: null,
        Price: Number(params.amount),
        Amount: 1000,
        VAT: Number(vatFromGross(params.amount, params.vatRate)),
        VATPercent: params.vatRate,
        Discount: 0,
        Other: 0,
      },
    ],
    ReceivedCash: params.paymentProvider === 'CASH_ON_DELIVERY' ? Number(params.amount) : 0,
    ReceivedCard: params.paymentProvider === 'CASH_ON_DELIVERY' ? 0 : Number(params.amount),
    Location: null,
    Meta: {
      orderNumber: params.orderNumber,
      orderId: params.orderId,
      paymentProvider: params.paymentProvider,
      type: 'REFUND',
      shippingIncluded: false,
    },
  };
}
