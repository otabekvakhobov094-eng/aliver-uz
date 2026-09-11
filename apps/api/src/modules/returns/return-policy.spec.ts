import {
  DEFAULT_POLICY,
  ReturnPolicyError,
  acceptsOpened,
  daysLeft,
  deadlineFor,
  isOurFault,
  quoteRefund,
  refundForQuantity,
  refundPerUnit,
  returnableLines,
  shippingRefund,
  type OrderItemSnapshot,
} from './return-policy';

const item = (over: Partial<OrderItemSnapshot> = {}): OrderItemSnapshot => {
  const quantity = over.quantity ?? 2;
  const unitPrice = over.unitPrice ?? 18_900_000n;
  const discountAmount = over.discountAmount ?? 0n;
  return {
    id: 'i1',
    productName: 'Namlantiruvchi krem',
    variantName: '50 ml',
    sku: 'ALV-CRM-50',
    quantity,
    unitPrice,
    discountAmount,
    lineTotal: unitPrice * BigInt(quantity) - discountAmount,
    refundedQuantity: 0,
    ...over,
  };
};

describe('qaytarish muddati', () => {
  const delivered = new Date('2026-09-01T10:00:00Z');

  it('muddat yetkazilgan paytdan boshlanadi', () => {
    const deadline = deadlineFor(delivered);
    expect(deadline.getTime() - delivered.getTime()).toBe(14 * 24 * 3600 * 1000);
  });

  it('qolgan kunlarni hisoblaydi', () => {
    expect(daysLeft(delivered, new Date('2026-09-01T10:00:00Z'))).toBe(14);
    expect(daysLeft(delivered, new Date('2026-09-10T10:00:00Z'))).toBe(5);
  });

  it('muddat tugagach nol beradi, manfiy emas', () => {
    expect(daysLeft(delivered, new Date('2026-10-01T10:00:00Z'))).toBe(0);
  });
});

describe('sabab va ayb', () => {
  it('noto‘g‘ri tovar va shikast — bizning aybimiz', () => {
    expect(isOurFault('WRONG_ITEM')).toBe(true);
    expect(isOurFault('DAMAGED')).toBe(true);
    expect(isOurFault('QUALITY')).toBe(true);
  });

  it('"to‘g‘ri kelmadi" bizning aybimiz emas', () => {
    expect(isOurFault('NOT_SUITABLE')).toBe(false);
    expect(isOurFault('OTHER')).toBe(false);
  });

  it('ochilgan kosmetika faqat bizning aybimizda qabul qilinadi', () => {
    // Sifatli kosmetika qaytarilmaydigan tovarlar ro'yxatida.
    expect(acceptsOpened('NOT_SUITABLE')).toBe(false);
    expect(acceptsOpened('DAMAGED')).toBe(true);
  });

  it('siyosat ochiq bo‘lsa hamma holatda qabul qilinadi', () => {
    expect(acceptsOpened('NOT_SUITABLE', { ...DEFAULT_POLICY, acceptOpened: true })).toBe(true);
  });
});

describe('dona uchun summa', () => {
  it('chegirmasiz oddiy hisob', () => {
    expect(refundPerUnit(item({ quantity: 2, unitPrice: 10_000_000n }))).toBe(10_000_000n);
  });

  it('chegirma dona narxidan ayiriladi', () => {
    // 2 × 100 000 − 20 000 chegirma = 180 000; donasi 90 000
    const line = item({ quantity: 2, unitPrice: 10_000_000n, discountAmount: 2_000_000n });
    expect(refundPerUnit(line)).toBe(9_000_000n);
  });

  it('nol miqdorda nol qaytaradi', () => {
    expect(refundPerUnit(item({ quantity: 0, lineTotal: 0n }))).toBe(0n);
  });
});

describe('miqdor bo‘yicha summa', () => {
  it('hammasi qaytarilsa satr jamiga AYNAN teng', () => {
    // 3 dona, chegirma bo'linmaydigan: 3 × 33 333 − 1 = qoldiq bor
    const line = item({ quantity: 3, unitPrice: 3_333_333n, discountAmount: 1n });
    expect(refundForQuantity(line, 3)).toBe(line.lineTotal);
  });

  it('qisman qaytarishda tiyin yo‘qolmaydi', () => {
    const line = item({ quantity: 3, unitPrice: 3_333_333n, discountAmount: 1n });
    const a = refundForQuantity(line, 1);
    const b = refundForQuantity({ ...line, refundedQuantity: 1 }, 1);
    const c = refundForQuantity({ ...line, refundedQuantity: 2 }, 1);
    expect(a + b + c).toBe(line.lineTotal);
  });

  it('qolganidan ortiq so‘ralsa qolganini beradi', () => {
    const line = item({ quantity: 2, refundedQuantity: 1 });
    expect(refundForQuantity(line, 5)).toBe(refundForQuantity(line, 1));
  });

  it('hammasi qaytarilgan bo‘lsa nol', () => {
    expect(refundForQuantity(item({ quantity: 2, refundedQuantity: 2 }), 1)).toBe(0n);
  });
});

describe('qaytarish mumkin bo‘lgan pozitsiyalar', () => {
  it('qaytarilganini hisobga oladi', () => {
    const lines = returnableLines([
      item({ id: 'a', quantity: 3, refundedQuantity: 1 }),
      item({ id: 'b', quantity: 1, refundedQuantity: 1 }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.id).toBe('a');
    expect(lines[0]!.returnableQuantity).toBe(2);
  });
});

describe('yetkazib berish narxi', () => {
  const shipping = 2_500_000n;

  it('bizning aybimiz va butun buyurtma — qaytariladi', () => {
    expect(shippingRefund({ shippingTotal: shipping, reason: 'DAMAGED', wholeOrder: true })).toBe(
      shipping,
    );
  });

  it('bizning aybimiz, lekin qisman qaytarish — qaytarilmaydi', () => {
    expect(shippingRefund({ shippingTotal: shipping, reason: 'DAMAGED', wholeOrder: false })).toBe(
      0n,
    );
  });

  it('"to‘g‘ri kelmadi" — qaytarilmaydi', () => {
    // Kuryer baribir yurgan.
    expect(
      shippingRefund({ shippingTotal: shipping, reason: 'NOT_SUITABLE', wholeOrder: true }),
    ).toBe(0n);
  });

  it('siyosat "hech qachon" bo‘lsa qaytarilmaydi', () => {
    expect(
      shippingRefund({
        shippingTotal: shipping,
        reason: 'DAMAGED',
        wholeOrder: true,
        policy: { ...DEFAULT_POLICY, refundShipping: 'never' },
      }),
    ).toBe(0n);
  });
});

describe('yig‘ma hisob', () => {
  const items = [
    item({ id: 'a', quantity: 2, unitPrice: 18_900_000n, discountAmount: 1_890_000n }),
    item({ id: 'b', quantity: 1, unitPrice: 29_600_000n }),
  ];

  it('tanlangan pozitsiyalar summasini beradi', () => {
    const q = quoteRefund({
      items,
      requested: [{ orderItemId: 'a', quantity: 1 }],
      shippingTotal: 2_500_000n,
      reason: 'NOT_SUITABLE',
    });
    expect(q.lines).toHaveLength(1);
    expect(q.itemsTotal).toBe(refundForQuantity(items[0]!, 1));
    expect(q.wholeOrder).toBe(false);
    expect(q.shippingRefund).toBe(0n);
    expect(q.total).toBe(q.itemsTotal);
  });

  it('butun buyurtma qaytarilsa yetkazish ham qo‘shiladi (bizning aybimiz)', () => {
    const q = quoteRefund({
      items,
      requested: [
        { orderItemId: 'a', quantity: 2 },
        { orderItemId: 'b', quantity: 1 },
      ],
      shippingTotal: 2_500_000n,
      reason: 'WRONG_ITEM',
    });
    expect(q.wholeOrder).toBe(true);
    expect(q.shippingRefund).toBe(2_500_000n);
    expect(q.itemsTotal).toBe(items[0]!.lineTotal + items[1]!.lineTotal);
    expect(q.total).toBe(q.itemsTotal + 2_500_000n);
  });

  it('avval qaytarilganini hisobga olib "butun buyurtma" deb topadi', () => {
    const partly = [item({ id: 'a', quantity: 2, refundedQuantity: 1 })];
    const q = quoteRefund({
      items: partly,
      requested: [{ orderItemId: 'a', quantity: 1 }],
      shippingTotal: 1_000_000n,
      reason: 'DAMAGED',
    });
    expect(q.wholeOrder).toBe(true);
  });

  it('bo‘sh so‘rovni rad etadi', () => {
    expect(() => quoteRefund({ items, requested: [], shippingTotal: 0n, reason: 'OTHER' })).toThrow(
      ReturnPolicyError,
    );
  });

  it('begona pozitsiyani rad etadi', () => {
    expect(() =>
      quoteRefund({
        items,
        requested: [{ orderItemId: 'yoq', quantity: 1 }],
        shippingTotal: 0n,
        reason: 'OTHER',
      }),
    ).toThrow(/topilmadi|yo‘q/);
  });

  it('qolganidan ortiq miqdorni rad etadi', () => {
    expect(() =>
      quoteRefund({
        items,
        requested: [{ orderItemId: 'b', quantity: 5 }],
        shippingTotal: 0n,
        reason: 'OTHER',
      }),
    ).toThrow(/ortiq/);
  });

  it('takroriy pozitsiyani rad etadi', () => {
    expect(() =>
      quoteRefund({
        items,
        requested: [
          { orderItemId: 'a', quantity: 1 },
          { orderItemId: 'a', quantity: 1 },
        ],
        shippingTotal: 0n,
        reason: 'OTHER',
      }),
    ).toThrow(/ikki marta/);
  });

  it('qaytarish summasi hech qachon to‘langan summadan oshmaydi', () => {
    const q = quoteRefund({
      items,
      requested: [
        { orderItemId: 'a', quantity: 2 },
        { orderItemId: 'b', quantity: 1 },
      ],
      shippingTotal: 2_500_000n,
      reason: 'WRONG_ITEM',
    });
    const paid = items[0]!.lineTotal + items[1]!.lineTotal + 2_500_000n;
    expect(q.total).toBeLessThanOrEqual(paid);
  });
});

describe('yetkazish narxi ikki marta qaytarilmaydi', () => {
  // Birinchi qaytarishda yetkazish qaytarilgan bo'lsa, ikkinchisiga
  // `shippingTotal: 0` uzatiladi (servis shuni qiladi) va hisob
  // baribir to'g'ri chiqadi.
  it('nol yetkazish bilan hisob buzilmaydi', () => {
    const items = [item({ id: 'a', quantity: 2, refundedQuantity: 1 })];
    const q = quoteRefund({
      items,
      requested: [{ orderItemId: 'a', quantity: 1 }],
      shippingTotal: 0n,
      reason: 'DAMAGED',
    });
    expect(q.wholeOrder).toBe(true);
    expect(q.shippingRefund).toBe(0n);
    expect(q.total).toBe(q.itemsTotal);
  });

  it('ketma-ket qisman qaytarishlar yig‘indisi satr jamidan oshmaydi', () => {
    const line = item({ id: 'a', quantity: 3, unitPrice: 3_333_333n, discountAmount: 7n });
    let refundedQuantity = 0;
    let total = 0n;

    for (let i = 0; i < 3; i += 1) {
      const q = quoteRefund({
        items: [{ ...line, refundedQuantity }],
        requested: [{ orderItemId: 'a', quantity: 1 }],
        shippingTotal: 0n,
        reason: 'NOT_SUITABLE',
      });
      total += q.total;
      refundedQuantity += 1;
    }

    expect(total).toBe(line.lineTotal);
  });
});
