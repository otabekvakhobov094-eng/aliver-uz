import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import type { FiscalReceiptPayload } from './receipt-builder';

export interface OfdResult {
  ok: boolean;
  /** Fiskal belgi — chekning davlat reyestridagi identifikatori. */
  fiscalSign?: string;
  /** Mijozga ko'rsatiladigan chek havolasi. */
  receiptUrl?: string;
  terminalId?: string;
  error?: string;
  /** true bo'lsa qayta urinish mantiqiy (tarmoq, 5xx). */
  retryable?: boolean;
}

/**
 * OFD (fiskal ma'lumotlar operatori) bilan aloqa.
 *
 * TZ 55-bo'limda "fiskal chek beriladi" deyilgan, lekin QAYSI OFD
 * ekani ko'rsatilmagan (ekspertiza A-1). Provayder tanlanmaguncha
 * `mock` drayveri ishlaydi: chek to'liq shakllantiriladi, saqlanadi va
 * "yuborilgan" deb belgilanadi. Provayder kelganda faqat shu fayldagi
 * `sendToProvider` almashtiriladi — qolgan mantiq tegilmaydi.
 */
@Injectable()
export class OfdProvider {
  private readonly logger = new Logger(OfdProvider.name);

  constructor(private readonly config: ConfigService) {}

  get driver(): 'mock' | 'soliq' {
    return this.config.get<'mock' | 'soliq'>('OFD_PROVIDER') ?? 'mock';
  }

  get isMock(): boolean {
    return this.driver === 'mock';
  }

  async send(payload: FiscalReceiptPayload): Promise<OfdResult> {
    if (this.isMock) return this.sendMock(payload);
    return this.sendToProvider(payload);
  }

  /**
   * Maket. Chek haqiqiy OFD ga KETMAYDI.
   *
   * Fiskal belgi soxta, lekin formati haqiqiysiga o'xshash (16 raqam),
   * shunda admin panel va chek sahifasi to'g'ri ko'rinadi va provayder
   * ulanganda hech narsa o'zgarmaydi.
   */
  private sendMock(payload: FiscalReceiptPayload): OfdResult {
    const sign = Array.from(randomBytes(8))
      .map((b) => (b % 10).toString())
      .join('')
      .padEnd(16, '0')
      .slice(0, 16);

    this.logger.warn(
      `MAKET: chek OFD ga yuborilmadi (buyurtma ${payload.Meta.orderNumber}, ` +
        `${payload.Items.length} pozitsiya). Provayder tanlangach OFD_PROVIDER ni o‘zgartiring.`,
    );

    return {
      ok: true,
      fiscalSign: sign,
      receiptUrl: `https://ofd.soliq.uz/check?t=MOCK&r=${sign}`,
      terminalId: this.config.get<string>('OFD_TERMINAL_ID') ?? 'MOCK-TERMINAL',
    };
  }

  /**
   * Haqiqiy OFD chaqiruvi.
   *
   * Provayder shartnomasi imzolangach shu yer to'ldiriladi. Interfeys
   * allaqachon tayyor: navbat, qayta urinish, admin paneli va chek
   * havolasi shu natijaga tayanadi.
   */
  private async sendToProvider(payload: FiscalReceiptPayload): Promise<OfdResult> {
    const url = this.config.get<string>('OFD_API_URL');
    const token = this.config.get<string>('OFD_API_TOKEN');
    const terminalId = this.config.get<string>('OFD_TERMINAL_ID');

    if (!url || !token) {
      return {
        ok: false,
        error: 'OFD_API_URL yoki OFD_API_TOKEN sozlanmagan',
        retryable: false,
      };
    }

    const started = Date.now();
    try {
      const res = await fetch(`${url.replace(/\/+$/, '')}/receipts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          terminalId,
          receipt: { Items: payload.Items, Location: payload.Location },
          receivedCash: payload.ReceivedCash,
          receivedCard: payload.ReceivedCard,
          type: payload.Meta.type,
          externalId: payload.Meta.orderNumber,
        }),
        signal: AbortSignal.timeout(20_000),
      });

      const body = (await res.json().catch(() => null)) as {
        fiscalSign?: string;
        receiptUrl?: string;
        message?: string;
      } | null;

      if (!res.ok) {
        return {
          ok: false,
          error: body?.message ?? `OFD javobi: HTTP ${res.status}`,
          // 5xx va 429 — vaqtinchalik, qayta urinamiz. 4xx — bizning xatomiz.
          retryable: res.status >= 500 || res.status === 429,
        };
      }

      this.logger.log(`Chek OFD ga yuborildi (${Date.now() - started} ms)`);
      return {
        ok: true,
        fiscalSign: body?.fiscalSign,
        receiptUrl: body?.receiptUrl,
        terminalId: terminalId ?? undefined,
      };
    } catch (e) {
      // Tarmoq xatosi yoki taymaut — albatta qayta urinamiz.
      return { ok: false, error: (e as Error).message, retryable: true };
    }
  }
}
