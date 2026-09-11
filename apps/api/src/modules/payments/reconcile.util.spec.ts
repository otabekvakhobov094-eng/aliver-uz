import { reconcile, type LocalPayment, type ProviderRecord } from './reconcile.util';

const local = (over: Partial<LocalPayment> = {}): LocalPayment => ({
  paymentId: 'p1',
  orderNumber: 'ALV-260910-0001',
  provider: 'PAYME',
  providerTxnId: 'txn-1',
  paid: true,
  amount: 18_900_000n,
  refundedAmount: 0n,
  paidAt: new Date('2026-09-10T10:00:00Z'),
  ...over,
});

const remote = (over: Partial<ProviderRecord> = {}): ProviderRecord => ({
  providerTxnId: 'txn-1',
  orderNumber: 'ALV-260910-0001',
  amount: 18_900_000n,
  performed: true,
  performedAt: new Date('2026-09-10T10:00:00Z'),
  ...over,
});

describe('moslashtirish', () => {
  it('hamma narsa mos kelsa farq bo‘lmaydi', () => {
    const res = reconcile([local()], [remote()]);
    expect(res.mismatches).toHaveLength(0);
    expect(res.matched).toBe(1);
    expect(res.totals.difference).toBe('0');
  });

  it('provayderda to‘langan, bizda yo‘q — eng yuqori darajali xato', () => {
    const res = reconcile([], [remote()]);
    expect(res.mismatches).toHaveLength(1);
    expect(res.mismatches[0]!.kind).toBe('MISSING_LOCALLY');
    expect(res.mismatches[0]!.severity).toBe(1);
  });

  it('bizda to‘lov bor, lekin PAID emas — bu ham MISSING_LOCALLY', () => {
    const res = reconcile([local({ paid: false })], [remote()]);
    expect(res.mismatches[0]!.kind).toBe('MISSING_LOCALLY');
    expect(res.mismatches[0]!.paymentId).toBe('p1');
  });

  it('bizda to‘langan, provayderda umuman yo‘q', () => {
    const res = reconcile([local()], []);
    expect(res.mismatches).toHaveLength(1);
    expect(res.mismatches[0]!.kind).toBe('MISSING_AT_PROVIDER');
    expect(res.mismatches[0]!.providerAmount).toBeNull();
  });

  it('provayderda bekor qilingan, bizda to‘langan', () => {
    const res = reconcile([local()], [remote({ performed: false, cancelled: true })]);
    expect(res.mismatches[0]!.kind).toBe('CANCELLED_AT_PROVIDER');
    expect(res.mismatches[0]!.severity).toBe(1);
  });

  it('summa farqini topadi', () => {
    const res = reconcile([local()], [remote({ amount: 18_000_000n })]);
    expect(res.mismatches[0]!.kind).toBe('AMOUNT_MISMATCH');
    expect(res.mismatches[0]!.localAmount).toBe('18900000');
    expect(res.mismatches[0]!.providerAmount).toBe('18000000');
  });

  it('tranzaksiya id bo‘lmasa buyurtma raqami bo‘yicha topadi', () => {
    const res = reconcile(
      [local({ providerTxnId: null })],
      [remote({ providerTxnId: 'txn-boshqa' })],
    );
    expect(res.mismatches).toHaveLength(0);
    expect(res.matched).toBe(1);
  });

  it('umumiy summalar va farq hisoblanadi', () => {
    const res = reconcile(
      [local(), local({ paymentId: 'p2', orderNumber: 'ALV-2', providerTxnId: 'txn-2' })],
      [remote()],
    );
    expect(res.totals.localPaid).toBe('37800000');
    expect(res.totals.providerPerformed).toBe('18900000');
    expect(res.totals.difference).toBe('18900000');
  });

  it('xatolar shoshilinchlik bo‘yicha saralanadi', () => {
    const res = reconcile(
      [
        local({ paymentId: 'p1', orderNumber: 'A1', providerTxnId: 't1', amount: 100n }),
        local({ paymentId: 'p2', orderNumber: 'A2', providerTxnId: 't2' }),
      ],
      [
        remote({ providerTxnId: 't1', orderNumber: 'A1', amount: 200n }),
        remote({ providerTxnId: 't3', orderNumber: 'A3' }),
      ],
    );
    expect(res.mismatches[0]!.severity).toBe(1);
    expect(res.mismatches.map((m) => m.severity)).toEqual(
      [...res.mismatches.map((m) => m.severity)].sort(),
    );
  });

  it('to‘lanmagan to‘lovlar vypiskada yo‘qligi xato emas', () => {
    const res = reconcile([local({ paid: false, providerTxnId: null })], []);
    expect(res.mismatches).toHaveLength(0);
  });

  it('provayderda bekor qilingan va bizda ham to‘lanmagan — xato yo‘q', () => {
    const res = reconcile(
      [local({ paid: false })],
      [remote({ performed: false, cancelled: true })],
    );
    expect(res.mismatches).toHaveLength(0);
  });
});
