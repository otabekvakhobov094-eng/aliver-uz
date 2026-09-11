import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TelegramResult {
  ok: boolean;
  externalId?: string | null;
  error?: string;
  retryable?: boolean;
  mock?: boolean;
}

/**
 * Telegram bildirishnomalari.
 *
 * Ikki yo'nalish:
 *  - OPERATORLAR kanali: yangi buyurtma, to'lov xatosi, qoldiq kamayishi.
 *    Kanal id si `TELEGRAM_ORDERS_CHAT_ID` da.
 *  - MIJOZ: agar u botga `/start` yozib, telefonini ulagan bo'lsa.
 *    Chat id `customers.telegramChatId` da saqlanadi.
 *
 * Token bo'lmasa maket rejimi: xabar logga chiqadi, "yuborilgan" deb
 * belgilanadi. Shu bilan butun zanjirni kalitsiz ham sinash mumkin.
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly config: ConfigService) {}

  get token(): string | undefined {
    return this.config.get<string>('TELEGRAM_BOT_TOKEN') || undefined;
  }

  get isMock(): boolean {
    return !this.token;
  }

  get staffChatId(): string | undefined {
    return this.config.get<string>('TELEGRAM_ORDERS_CHAT_ID') || undefined;
  }

  async send(chatId: string, text: string): Promise<TelegramResult> {
    if (this.isMock) {
      this.logger.log(`[TELEGRAM -> ${chatId}] ${text}`);
      return { ok: true, externalId: `mock-${Date.now()}`, mock: true };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          // Formatlash ataylab yoqilmagan: mijoz nomi yoki manzilida
          // `*` yoki `_` bo'lsa Telegram butun xabarni rad etardi.
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        description?: string;
        result?: { message_id?: number };
      } | null;

      if (!res.ok || !body?.ok) {
        const description = body?.description ?? `HTTP ${res.status}`;
        return {
          ok: false,
          error: `Telegram: ${description}`,
          // 429 va 5xx — vaqtinchalik. "chat not found" — doimiy.
          retryable: res.status === 429 || res.status >= 500,
        };
      }

      return { ok: true, externalId: String(body.result?.message_id ?? '') };
    } catch (e) {
      return { ok: false, error: (e as Error).message, retryable: true };
    }
  }

  /** Operatorlar kanaliga. Kanal sozlanmagan bo'lsa jim o'tkazib yuboriladi. */
  async sendToStaff(text: string): Promise<TelegramResult> {
    const chatId = this.staffChatId;
    if (!chatId) {
      this.logger.debug('TELEGRAM_ORDERS_CHAT_ID sozlanmagan — operator xabari yuborilmadi');
      return { ok: false, error: 'Operatorlar kanali sozlanmagan', retryable: false };
    }
    return this.send(chatId, text);
  }
}
