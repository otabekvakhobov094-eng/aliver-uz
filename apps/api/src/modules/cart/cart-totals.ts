import { vatFromGross } from '../../common/money';

/**
 * Savat va buyurtma summalari.
 *
 * Barcha qiymatlar tiyinda. QQS narx ICHIDA hisoblanadi: O'zbekistonda
 * mijozga ko'rsatiladigan narx QQS bilan, chekda esa QQS summasi alohida
 * ko'rsatiladi (ekspertiza A-1, A-5).
 */

export interface TotalsLine {
  /** Chegirmasiz pozitsiya summasi: dona narxi × miqdor. */
  lineTotal: bigint;
  /** QQS stavkasi, foizda (mahsulotdan). */
  vatRate: number;
}

export interface TotalsInput {
  lines: TotalsLine[];
  /** Chegirmaning pozitsiyalar bo'yicha taqsimoti (uzunligi lines bilan bir xil). */
  discountPerLine: bigint[];
  shipping: bigint;
}

export interface Totals {
  subtotal: bigint;
  discountTotal: bigint;
  shippingTotal: bigint;
  vatTotal: bigint;
  grandTotal: bigint;
  /** Har pozitsiya uchun yakuniy qiymatlar — buyurtma nusxasiga yoziladi. */
  lines: Array<{ lineTotal: bigint; discountAmount: bigint; netTotal: bigint; vatAmount: bigint }>;
}

export function computeTotals(input: TotalsInput): Totals {
  if (input.discountPerLine.length !== input.lines.length) {
    throw new Error('cart-totals: chegirma taqsimoti pozitsiyalar soniga mos emas');
  }

  const lines = input.lines.map((line, i) => {
    const discountAmount = input.discountPerLine[i] ?? 0n;
    if (discountAmount > line.lineTotal) {
      throw new Error('cart-totals: pozitsiya chegirmasi pozitsiya summasidan katta');
    }
    const netTotal = line.lineTotal - discountAmount;
    return {
      lineTotal: line.lineTotal,
      discountAmount,
      netTotal,
      vatAmount: vatFromGross(netTotal, line.vatRate),
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0n);
  const discountTotal = lines.reduce((s, l) => s + l.discountAmount, 0n);
  const vatTotal = lines.reduce((s, l) => s + l.vatAmount, 0n);
  const grandTotal = subtotal - discountTotal + input.shipping;

  if (grandTotal < 0n) throw new Error('cart-totals: yakuniy summa manfiy');

  return {
    subtotal,
    discountTotal,
    shippingTotal: input.shipping,
    vatTotal,
    grandTotal,
    lines,
  };
}
