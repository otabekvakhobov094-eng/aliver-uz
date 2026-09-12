import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  reconcile,
  type LocalPayment,
  type ProviderRecord,
  type ReconcileResult,
} from './reconcile.util';
import { parseStatement, type StatementParseResult } from './statement-import';

/**
 * To'lovlarni moslashtirish.
 *
 * Provayder vypiskasi ikki manbadan kelishi mumkin:
 *  - `PAYMENTS_MODE=mock` — vypiska bizning webhook loglaridan quriladi.
 *    Bu haqiqiy moslashtirish emas, lekin hisobot va admin ekrani
 *    kalitlar kelishidan oldin ham ishlab turadi.
 *  - jangovar rejim — provayder API si (Payme `GetStatement`, Click
 *    hisobot endpointi). Kalitlar kelganda `fetchStatement` to'ldiriladi.
 */
@Injectable()
export class ReconcileService {
  private readonly logger = new Logger(ReconcileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get mode(): 'mock' | 'sandbox' | 'live' {
    return this.config.get<'mock' | 'sandbox' | 'live'>('PAYMENTS_MODE') ?? 'mock';
  }

  async run(params: {
    from: Date;
    to: Date;
    provider?: string;
    /**
     * Provayder kabinetidan yuklab olingan vypiska fayli.
     *
     * Berilgan bo'lsa — AYNAN shu manba ishlatiladi. Bu yagona
     * haqiqiy solishtirish: qolgan hollarda biz o'z yozuvimizni o'z
     * yozuvimiz bilan taqqoslaymiz va webhook umuman kelmagan holat
     * ko'rinmay qoladi.
     */
    statementCsv?: string;
  }): Promise<
    ReconcileResult & {
      mode: string;
      provider: string;
      from: Date;
      to: Date;
      source: string;
      independent: boolean;
      parse?: Omit<StatementParseResult, 'records'>;
    }
  > {
    const provider = params.provider ?? 'PAYME';

    /*
     * TO'LIQ to'plam kerak, sahifa emas.
     *
     * `take: 5000` bu yerda jimgina yolg'on gapirardi: chegaradan
     * tashqarida qolgan har bir to'lov provayder vypiskasida bor
     * bo'lgani uchun «MISSING_LOCALLY» — ya'ni «mijoz to'lagan,
     * bizda yozuv yo'q» — deb belgilanardi, «farq» raqami esa
     * o'sha summaga kam chiqardi. Buxgalter oyni solishtirib,
     * bir sahifa soxta «kritik» nomuvofiqlik va noto'g'ri raqam
     * ko'rardi; hech qanday xato chiqmasdi.
     *
     * Shuning uchun chegara bor, lekin u OSHIB KETGANDA AYTILADI.
     */
    const HARD_LIMIT = 50_000;
    const where = {
      provider: provider as never,
      createdAt: { gte: params.from, lte: params.to },
    };
    const totalCount = await this.prisma.payment.count({ where });
    const rows = await this.prisma.payment.findMany({
      where,
      include: { order: { select: { number: true } } },
      orderBy: { createdAt: 'asc' },
      take: HARD_LIMIT,
    });
    if (totalCount > rows.length) {
      throw new BadRequestException(
        `Bu davrda ${totalCount} ta to‘lov bor — solishtirish uchun juda ko‘p. ` +
          'Davrni qisqartiring: yarim natija noto‘g‘ri xulosaga olib keladi.',
      );
    }

    const local: LocalPayment[] = rows.map((p) => ({
      paymentId: p.id,
      orderNumber: p.order?.number ?? '',
      provider: p.provider,
      providerTxnId: p.providerTxnId,
      paid: p.status === 'PAID' || p.status === 'PARTIALLY_REFUNDED',
      amount: p.amount as bigint,
      refundedAmount: p.refundedAmount as bigint,
      paidAt: p.paidAt,
    }));

    const { records, source, independent, parse } = await this.statement(
      provider,
      params.from,
      params.to,
      params.statementCsv,
    );
    const result = reconcile(local, records);

    if (result.mismatches.length > 0) {
      this.logger.warn(
        `Moslashtirish (${provider}): ${result.mismatches.length} ta farq topildi, ` +
          `farq summasi ${result.totals.difference} tiyin`,
      );
    }

    return {
      ...result,
      mode: this.mode,
      provider,
      from: params.from,
      to: params.to,
      source,
      // Hisobotni o'qiydigan odam BILISHI kerak: bu haqiqiy
      // solishtirishmi yoki o'z yozuvimizning aksimi.
      independent,
      parse,
    };
  }

  /**
   * Provayder vypiskasi.
   *
   * Maket rejimida haqiqiy vypiska yo'q, shuning uchun u WEBHOOK
   * LOGLARIDAN quriladi: bu bizning yozuvimizdan mustaqil manba emas,
   * lekin webhook kelgan-kelmaganini ko'rsatadi va admin ekranini
   * ishlatib turadi. Hisobotda `source` maydoni buni ochiq aytadi.
   */
  private async statement(
    provider: string,
    from: Date,
    to: Date,
    statementCsv?: string,
  ): Promise<{
    records: ProviderRecord[];
    source: string;
    independent: boolean;
    parse?: Omit<StatementParseResult, 'records'>;
  }> {
    // Yuklangan fayl eng ustun manba: u bizdan mustaqil.
    if (statementCsv) {
      const { records, ...parse } = parseStatement(statementCsv);
      return {
        records,
        source: `${provider} kabinetidan yuklangan vypiska`,
        independent: true,
        parse,
      };
    }

    if (this.mode !== 'mock') {
      const live = await this.fetchStatement(provider, from, to);
      if (live) return { records: live, source: `${provider} API`, independent: true };
    }

    // Bu yerda ham to'liq to'plam: yarmi bilan solishtirish
    // «provayderda bor, bizda yo'q» degan soxta xulosa beradi.
    const events = await this.prisma.webhookEvent.findMany({
      where: {
        provider: provider.toLowerCase(),
        createdAt: { gte: from, lte: to },
        processedAt: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      take: 50_000,
    });

    const byTxn = new Map<string, ProviderRecord>();
    for (const e of events) {
      const payload = (e.payload ?? {}) as Record<string, unknown>;
      const params = (payload.params ?? {}) as Record<string, unknown>;
      const account = (params.account ?? {}) as Record<string, unknown>;

      const orderNumber =
        (typeof payload.merchant_trans_id === 'string' ? payload.merchant_trans_id : null) ??
        (typeof account.order_id === 'string' ? account.order_id : null);

      const amount = readAmount(payload, params);
      const performed = e.method === 'complete' || e.method === 'PerformTransaction';
      const cancelled = e.method === 'CancelTransaction';

      const prev = byTxn.get(e.externalId);
      byTxn.set(e.externalId, {
        providerTxnId: e.externalId,
        orderNumber: orderNumber ?? prev?.orderNumber ?? null,
        amount: amount ?? prev?.amount ?? 0n,
        performed: performed || (prev?.performed ?? false),
        performedAt: performed ? e.processedAt : (prev?.performedAt ?? null),
        cancelled: cancelled || prev?.cancelled,
      });
    }

    return {
      records: [...byTxn.values()],
      source: 'webhook loglari — MUSTAQIL MANBA EMAS',
      // Bu eng muhim maydon. Webhook umuman kelmagan bo'lsa, ikkala
      // tomonda ham yozuv yo'q va hisobot «hammasi joyida» deydi —
      // mijoz pul to'lagan holda. Shuning uchun bu holat ochiq
      // belgilanadi va adminda ogohlantirish sifatida ko'rsatiladi.
      independent: false,
    };
  }

  /**
   * Haqiqiy vypiska. Kalitlar kelganda to'ldiriladi:
   *  - Payme: `GetStatement` metodi merchant API ga;
   *  - Click: hisobot endpointi (merchant_user_id va imzo bilan).
   *
   * Hozircha `null` qaytaradi — chaqiruvchi webhook loglariga tushadi.
   */
  private async fetchStatement(
    provider: string,
    _from: Date,
    _to: Date,
  ): Promise<ProviderRecord[] | null> {
    this.logger.warn(
      `${provider}: vypiska API si hali ulanmagan — moslashtirish webhook loglari asosida bajarildi`,
    );
    return null;
  }
}

/** Turli provayderlar summani turli maydonda yuboradi. */
function readAmount(
  payload: Record<string, unknown>,
  params: Record<string, unknown>,
): bigint | null {
  // Payme: params.amount — tiyinda
  if (typeof params.amount === 'number' && Number.isInteger(params.amount)) {
    return BigInt(params.amount);
  }
  // Click: amount — so'mda, satr
  if (typeof payload.amount === 'string' && /^\d+(\.\d{1,2})?$/.test(payload.amount)) {
    const [whole, frac = ''] = payload.amount.split('.');
    return BigInt(whole!) * 100n + BigInt(frac.padEnd(2, '0'));
  }
  return null;
}
