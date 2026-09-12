import {
  DEFAULT_SHIPPING_IKPU,
  FiscalBuildError,
  buildReceipt,
  buildRefundReceipt,
  receiptTotals,
  type ReceiptOrderItem,
} from './receipt-builder';

const item = (over: Partial<ReceiptOrderItem> = {}): ReceiptOrderItem => ({
  productName: 'Namlantiruvchi krem',
  variantName: '50 ml',
  barcode: '4780000000017',
  ikpuCode: '03306001001000000',
  unitCode: '1',
  packageCode: null,
  quantity: 2,
  unitPrice: 18_900_000n, // 189 000 so'm
  discountAmount: 0n,
  vatRate: 12,
  ...over,
});

const base = {
  orderId: 'o1',
  orderNumber: 'ALV-260910-4821',
  paymentProvider: 'CLICK',
  shippingTotal: 0n,
};

describe('fiskal chek quruvchi', () => {
  it('pozitsiyani OFD formatiga o‘giradi', () => {
    const r = buildReceipt({ ...base, items: [item()] });
    const it = r.Items[0]!;

    expect(it.Name).toBe('Namlantiruvchi krem, 50 ml');
    expect(it.SPIC).toBe('03306001001000000');
    expect(it.Price).toBe(18_900_000);
    // Miqdor MINGGA ko'paytiriladi — OFD talabi.
    expect(it.Amount).toBe(2000);
    expect(it.Units).toBe(1);
    expect(it.VATPercent).toBe(12);
  });

  it('QQS narx ICHIDAN hisoblanadi, ustiga qo‘shilmaydi', () => {
    const r = buildReceipt({ ...base, items: [item({ quantity: 1, unitPrice: 11_200_000n })] });
    // 112 000 so'm ichidagi 12% QQS = 112000 * 12 / 112 = 12 000 so'm
    expect(r.Items[0]!.VAT).toBe(1_200_000);
  });

  it('chegirma pozitsiyaga tushadi va QQS undan keyin hisoblanadi', () => {
    const r = buildReceipt({
      ...base,
      items: [item({ quantity: 1, unitPrice: 11_200_000n, discountAmount: 1_120_000n })],
    });
    expect(r.Items[0]!.Discount).toBe(1_120_000);
    // Chegirmadan keyin 100 800 so'm, undagi QQS = 10 800 so'm
    expect(r.Items[0]!.VAT).toBe(1_080_000);
  });

  it('yetkazib berish alohida pozitsiya bo‘ladi', () => {
    const r = buildReceipt({ ...base, items: [item()], shippingTotal: 2_500_000n });
    expect(r.Items).toHaveLength(2);
    expect(r.Items[1]!.Name).toBe('Yetkazib berish xizmati');
    expect(r.Items[1]!.SPIC).toBe(DEFAULT_SHIPPING_IKPU);
    expect(r.Meta.shippingIncluded).toBe(true);
  });

  it('bepul yetkazishda qo‘shimcha pozitsiya bo‘lmaydi', () => {
    const r = buildReceipt({ ...base, items: [item()], shippingTotal: 0n });
    expect(r.Items).toHaveLength(1);
    expect(r.Meta.shippingIncluded).toBe(false);
  });

  it('naqd to‘lovda summa ReceivedCash ga tushadi', () => {
    const r = buildReceipt({
      ...base,
      paymentProvider: 'CASH_ON_DELIVERY',
      items: [item({ quantity: 1 })],
    });
    expect(r.ReceivedCash).toBe(18_900_000);
    expect(r.ReceivedCard).toBe(0);
  });

  it('onlayn to‘lovda summa ReceivedCard ga tushadi', () => {
    const r = buildReceipt({ ...base, items: [item({ quantity: 1 })] });
    expect(r.ReceivedCard).toBe(18_900_000);
    expect(r.ReceivedCash).toBe(0);
  });

  it('IKPU kodisiz chek berilmaydi', () => {
    expect(() => buildReceipt({ ...base, items: [item({ ikpuCode: '' })] })).toThrow(
      FiscalBuildError,
    );
  });

  it('bo‘sh chek yaratilmaydi', () => {
    expect(() => buildReceipt({ ...base, items: [] })).toThrow(/pozitsiya/);
  });

  it('chegirma pozitsiyadan katta bo‘lsa to‘xtaydi', () => {
    expect(() =>
      buildReceipt({ ...base, items: [item({ quantity: 1, discountAmount: 99_000_000n })] }),
    ).toThrow(FiscalBuildError);
  });

  it('miqdor nol bo‘lsa to‘xtaydi', () => {
    expect(() => buildReceipt({ ...base, items: [item({ quantity: 0 })] })).toThrow(/miqdori/);
  });
});

describe('chek summalari', () => {
  it('umumiy summa va QQS pozitsiyalardan yig‘iladi', () => {
    const r = buildReceipt({
      ...base,
      items: [item({ quantity: 2, unitPrice: 11_200_000n })],
      shippingTotal: 2_500_000n,
    });
    const t = receiptTotals(r);
    expect(t.total).toBe(22_400_000n + 2_500_000n);
    expect(t.vat).toBeGreaterThan(0n);
  });

  it('summa buyurtma summasiga teng bo‘ladi', () => {
    const items = [
      item({ quantity: 2, unitPrice: 18_900_000n, discountAmount: 1_890_000n }),
      item({ quantity: 1, unitPrice: 29_600_000n, discountAmount: 0n }),
    ];
    const expected = 18_900_000n * 2n - 1_890_000n + 29_600_000n + 3_000_000n;
    const t = receiptTotals(buildReceipt({ ...base, items, shippingTotal: 3_000_000n }));
    expect(t.total).toBe(expected);
  });
});

describe('qaytarish cheki', () => {
  it('bitta pozitsiyadan iborat bo‘ladi', () => {
    const r = buildRefundReceipt({
      orderId: 'o1',
      orderNumber: 'ALV-260910-4821',
      paymentProvider: 'PAYME',
      amount: 5_000_000n,
      ikpuCode: '03306001001000000',
      vatRate: 12,
    });
    expect(r.Items).toHaveLength(1);
    expect(r.Meta.type).toBe('REFUND');
    expect(receiptTotals(r).total).toBe(5_000_000n);
  });

  it('nol summani rad etadi', () => {
    expect(() =>
      buildRefundReceipt({
        orderId: 'o1',
        orderNumber: 'x',
        paymentProvider: 'PAYME',
        amount: 0n,
        ikpuCode: 'a',
        vatRate: 12,
      }),
    ).toThrow(FiscalBuildError);
  });
});

describe('bonus ball chekda', () => {
  /*
   * Ball buyurtma sarlavhasida saqlanadi, pozitsiyalarda emas.
   * Shuning uchun chek MIJOZDAN OLINMAGAN pulni olingan deb
   * ko'rsatardi: 2 000 000 tiyinlik savatda 100 ball sarflansa,
   * kartadan 1 000 000 yechiladi, chekda esa 2 000 000 turardi —
   * QQS ham o'sha katta summadan hisoblanardi.
   */
  const line = item({ quantity: 1, unitPrice: 2_000_000n });

  it('chek summasi haqiqatda olingan pulga teng', () => {
    const r = buildReceipt({ ...base, items: [line], loyaltyAmount: 1_000_000n });
    expect(r.ReceivedCard).toBe(1_000_000);
  });

  it('ballsiz chek o‘zgarmaydi', () => {
    const r = buildReceipt({ ...base, items: [line] });
    expect(r.ReceivedCard).toBe(2_000_000);
  });

  it('QQS qolgan summadan hisoblanadi', () => {
    const withPoints = buildReceipt({ ...base, items: [line], loyaltyAmount: 1_000_000n });
    const without = buildReceipt({ ...base, items: [line] });
    expect(withPoints.Items[0]!.VAT).toBeLessThan(without.Items[0]!.VAT);
  });

  it('bir nechta pozitsiyaga proporsional tushadi va yig‘indi saqlanadi', () => {
    const r = buildReceipt({
      ...base,
      items: [
        item({ quantity: 1, unitPrice: 1_000_000n, barcode: '1' }),
        item({ quantity: 1, unitPrice: 3_000_000n, barcode: '2' }),
      ],
      loyaltyAmount: 1_000_000n,
    });
    expect(r.ReceivedCard).toBe(3_000_000);
    const discounts = r.Items.reduce((s, it) => s + it.Discount, 0);
    expect(discounts).toBe(1_000_000);
  });

  it('yetkazib berish pozitsiyasiga ball tushmaydi', () => {
    const r = buildReceipt({
      ...base,
      items: [line],
      shippingTotal: 500_000n,
      loyaltyAmount: 1_000_000n,
    });
    const shipping = r.Items[r.Items.length - 1]!;
    expect(shipping.Name).toContain('Yetkazib berish');
    expect(shipping.Discount).toBe(0);
    expect(r.ReceivedCard).toBe(1_500_000);
  });

  it('chekda yordamchi maydon qolmaydi', () => {
    const r = buildReceipt({ ...base, items: [line], loyaltyAmount: 500_000n });
    expect(Object.keys(r.Items[0]!)).not.toContain('_gross');
  });
});
