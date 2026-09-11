import type { Tiyin } from '../../common/money';

/** Bizdagi to'lov yozuvi. */
export interface LocalPayment {
  paymentId: string;
  orderNumber: string;
  provider: string;
  providerTxnId: string | null;
  /** Bizda "to'langan" deb belgilanganmi. */
  paid: boolean;
  amount: Tiyin;
  refundedAmount: Tiyin;
  paidAt: Date | null;
}

/** Provayder vypiskasidagi yozuv. */
export interface ProviderRecord {
  providerTxnId: string;
  orderNumber: string | null;
  amount: Tiyin;
  /** Provayderda pul haqiqatan yechilganmi. */
  performed: boolean;
  performedAt: Date | null;
  cancelled?: boolean;
}

export type MismatchKind =
  /** Provayderda to'langan, bizda esa yo'q — ENG XAVFLI: mijoz pul to'lagan, tovar ketmagan. */
  | 'MISSING_LOCALLY'
  /** Bizda to'langan, provayderda yo'q yoki bekor qilingan — biz tovarni bekorga jo'natdik. */
  | 'MISSING_AT_PROVIDER'
  /** Ikkalasida bor, lekin summa har xil. */
  | 'AMOUNT_MISMATCH'
  /** Provayderda bekor qilingan, bizda hali to'langan turibdi. */
  | 'CANCELLED_AT_PROVIDER';

export interface Mismatch {
  kind: MismatchKind;
  providerTxnId: string | null;
  orderNumber: string | null;
  paymentId: string | null;
  localAmount: string | null;
  providerAmount: string | null;
  note: string;
  /** Qanchalik shoshilinch: 1 — darhol, 2 — bugun, 3 — kuzatib borish. */
  severity: 1 | 2 | 3;
}

export interface ReconcileResult {
  checkedLocal: number;
  checkedProvider: number;
  matched: number;
  mismatches: Mismatch[];
  totals: {
    localPaid: string;
    providerPerformed: string;
    difference: string;
  };
}

const NOTE: Record<MismatchKind, string> = {
  MISSING_LOCALLY:
    'Provayderda pul yechilgan, bizda to‘lov qayd etilmagan. Mijoz to‘lagan, lekin buyurtma tasdiqlanmagan bo‘lishi mumkin.',
  MISSING_AT_PROVIDER:
    'Bizda to‘langan deb turibdi, provayder vypiskasida yo‘q. Webhook soxta bo‘lgan yoki qo‘lda noto‘g‘ri belgilangan.',
  AMOUNT_MISMATCH: 'Summa mos kelmadi.',
  CANCELLED_AT_PROVIDER: 'Provayderda tranzaksiya bekor qilingan, bizda to‘langan holatda qolgan.',
};

const SEVERITY: Record<MismatchKind, 1 | 2 | 3> = {
  MISSING_LOCALLY: 1,
  CANCELLED_AT_PROVIDER: 1,
  MISSING_AT_PROVIDER: 2,
  AMOUNT_MISMATCH: 2,
};

/**
 * Bizdagi va provayderdagi to'lovlarni solishtiradi.
 *
 * TZ da moslashtirish umuman yo'q edi (ekspertiza C-4). Amalda esa
 * webhook yo'qoladi, tarmoq uziladi va oyning oxirida "kassada 3 mln
 * yetishmayapti" degan savol paydo bo'ladi. Bu funksiya aynan shu
 * savolga javob beradi.
 *
 * Solishtirish TRANZAKSIYA IDENTIFIKATORI bo'yicha, u yo'q bo'lsa
 * buyurtma raqami bo'yicha boradi.
 */
export function reconcile(local: LocalPayment[], provider: ProviderRecord[]): ReconcileResult {
  const mismatches: Mismatch[] = [];
  let matched = 0;

  const byTxn = new Map<string, LocalPayment>();
  const byOrder = new Map<string, LocalPayment>();
  for (const p of local) {
    if (p.providerTxnId) byTxn.set(p.providerTxnId, p);
    byOrder.set(p.orderNumber, p);
  }

  const seen = new Set<string>();

  for (const rec of provider) {
    const found =
      byTxn.get(rec.providerTxnId) ?? (rec.orderNumber ? byOrder.get(rec.orderNumber) : undefined);

    if (found) seen.add(found.paymentId);

    if (rec.performed && !found) {
      mismatches.push({
        kind: 'MISSING_LOCALLY',
        providerTxnId: rec.providerTxnId,
        orderNumber: rec.orderNumber,
        paymentId: null,
        localAmount: null,
        providerAmount: rec.amount.toString(),
        note: NOTE.MISSING_LOCALLY,
        severity: SEVERITY.MISSING_LOCALLY,
      });
      continue;
    }

    if (!found) continue;

    if (rec.performed && !found.paid) {
      mismatches.push({
        kind: 'MISSING_LOCALLY',
        providerTxnId: rec.providerTxnId,
        orderNumber: found.orderNumber,
        paymentId: found.paymentId,
        localAmount: found.amount.toString(),
        providerAmount: rec.amount.toString(),
        note: NOTE.MISSING_LOCALLY,
        severity: SEVERITY.MISSING_LOCALLY,
      });
      continue;
    }

    if (!rec.performed && found.paid) {
      mismatches.push({
        kind: rec.cancelled ? 'CANCELLED_AT_PROVIDER' : 'MISSING_AT_PROVIDER',
        providerTxnId: rec.providerTxnId,
        orderNumber: found.orderNumber,
        paymentId: found.paymentId,
        localAmount: found.amount.toString(),
        providerAmount: rec.amount.toString(),
        note: rec.cancelled ? NOTE.CANCELLED_AT_PROVIDER : NOTE.MISSING_AT_PROVIDER,
        severity: rec.cancelled ? SEVERITY.CANCELLED_AT_PROVIDER : SEVERITY.MISSING_AT_PROVIDER,
      });
      continue;
    }

    if (rec.performed && found.paid && rec.amount !== found.amount) {
      mismatches.push({
        kind: 'AMOUNT_MISMATCH',
        providerTxnId: rec.providerTxnId,
        orderNumber: found.orderNumber,
        paymentId: found.paymentId,
        localAmount: found.amount.toString(),
        providerAmount: rec.amount.toString(),
        note: `${NOTE.AMOUNT_MISMATCH} Bizda ${found.amount}, provayderda ${rec.amount} tiyin.`,
        severity: SEVERITY.AMOUNT_MISMATCH,
      });
      continue;
    }

    if (rec.performed && found.paid) matched += 1;
  }

  // Bizda to'langan, lekin vypiskada umuman uchramaganlar.
  for (const p of local) {
    if (!p.paid || seen.has(p.paymentId)) continue;
    mismatches.push({
      kind: 'MISSING_AT_PROVIDER',
      providerTxnId: p.providerTxnId,
      orderNumber: p.orderNumber,
      paymentId: p.paymentId,
      localAmount: p.amount.toString(),
      providerAmount: null,
      note: NOTE.MISSING_AT_PROVIDER,
      severity: SEVERITY.MISSING_AT_PROVIDER,
    });
  }

  const localPaid = local.filter((p) => p.paid).reduce((s, p) => s + p.amount, 0n);
  const providerPerformed = provider.filter((r) => r.performed).reduce((s, r) => s + r.amount, 0n);

  mismatches.sort((a, b) => a.severity - b.severity);

  return {
    checkedLocal: local.length,
    checkedProvider: provider.length,
    matched,
    mismatches,
    totals: {
      localPaid: localPaid.toString(),
      providerPerformed: providerPerformed.toString(),
      difference: (localPaid - providerPerformed).toString(),
    },
  };
}
