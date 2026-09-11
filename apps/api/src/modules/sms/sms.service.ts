import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizePhone } from '../../common/phone';

export interface SmsMessage {
  phone: string;
  text: string;
  template?: string;
}

export interface SmsResult {
  ok: boolean;
  /** Provayderdagi xabar identifikatori — nizoda dalil bo'ladi. */
  externalId?: string | null;
  error?: string;
  /** true bo'lsa qayta urinish mantiqiy (tarmoq, 5xx, token muddati). */
  retryable?: boolean;
  /** Maket rejimi — SMS haqiqatda yuborilmadi. */
  mock?: boolean;
}

/**
 * SMS provayder abstraksiyasi (TZ 70).
 *
 * Uchta drayver: `console` (development), `eskiz` va `playmobile`.
 * Provayder almashtirilganda faqat shu fayl o'zgaradi — bildirishnoma
 * dvigateli, navbat va admin paneli tegilmaydi.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  /** eSKIZ tokeni 30 kun yashaydi; xotirada saqlaymiz va muddati tugasa yangilaymiz. */
  private eskizToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  get provider(): 'console' | 'eskiz' | 'playmobile' {
    return this.config.get<'console' | 'eskiz' | 'playmobile'>('SMS_PROVIDER') ?? 'console';
  }

  get isMock(): boolean {
    return this.provider === 'console';
  }

  async send(msg: SmsMessage): Promise<SmsResult> {
    const phone = normalizePhone(msg.phone);

    switch (this.provider) {
      case 'console':
        this.logger.log(`[SMS -> ${phone}] ${msg.text}`);
        return { ok: true, externalId: `console-${Date.now()}`, mock: true };
      case 'eskiz':
        return this.sendEskiz(phone, msg.text);
      case 'playmobile':
        return this.sendPlayMobile(phone, msg.text);
      default:
        return { ok: false, error: `Noma’lum SMS provayderi: ${this.provider}`, retryable: false };
    }
  }

  /* ---------------------------------- eSKIZ ---------------------------------- */

  /**
   * eSKIZ tokeni: `POST /auth/login` (email + parol) -> `data.token`.
   * Token 30 kun amal qiladi, biz 25 kunda yangilaymiz.
   */
  private async eskizAuth(force = false): Promise<string | null> {
    if (!force && this.eskizToken && this.eskizToken.expiresAt > Date.now()) {
      return this.eskizToken.value;
    }

    const base = this.baseUrl('https://notify.eskiz.uz/api');
    const email = this.config.get<string>('SMS_API_LOGIN');
    const password = this.config.get<string>('SMS_API_PASSWORD');
    if (!email || !password) return null;

    try {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await res.json().catch(() => null)) as { data?: { token?: string } } | null;
      const token = body?.data?.token;
      if (!res.ok || !token) return null;

      this.eskizToken = { value: token, expiresAt: Date.now() + 25 * 24 * 3600 * 1000 };
      return token;
    } catch (e) {
      this.logger.error(`eSKIZ auth xatosi: ${(e as Error).message}`);
      return null;
    }
  }

  private async sendEskiz(phone: string, text: string, retried = false): Promise<SmsResult> {
    const token = await this.eskizAuth(retried);
    if (!token) return { ok: false, error: 'eSKIZ tokeni olinmadi', retryable: true };

    const base = this.baseUrl('https://notify.eskiz.uz/api');
    try {
      const form = new URLSearchParams({
        // eSKIZ raqamni "+" siz kutadi.
        mobile_phone: phone.replace(/^\+/, ''),
        message: text,
        from: this.config.get<string>('SMS_SENDER') ?? '4546',
      });

      const res = await fetch(`${base}/message/sms/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
        signal: AbortSignal.timeout(20_000),
      });

      // Token muddati tugagan bo'lsa bir marta yangilab qayta urinamiz.
      if (res.status === 401 && !retried) return this.sendEskiz(phone, text, true);

      const body = (await res.json().catch(() => null)) as {
        id?: string | number;
        message?: string;
        status?: string;
      } | null;

      if (!res.ok) {
        return {
          ok: false,
          error: body?.message ?? `eSKIZ: HTTP ${res.status}`,
          retryable: res.status >= 500 || res.status === 429,
        };
      }
      return { ok: true, externalId: body?.id !== undefined ? String(body.id) : null };
    } catch (e) {
      return { ok: false, error: (e as Error).message, retryable: true };
    }
  }

  /* ------------------------------- Play Mobile ------------------------------- */

  /**
   * Play Mobile: Basic auth va JSON `messages` massivi.
   * Har bir xabarga o'zimizning `message-id` beriladi.
   */
  private async sendPlayMobile(phone: string, text: string): Promise<SmsResult> {
    const base = this.baseUrl('https://send.smsxabar.uz/broker-api');
    const login = this.config.get<string>('SMS_API_LOGIN');
    const password = this.config.get<string>('SMS_API_PASSWORD');
    if (!login || !password) {
      return { ok: false, error: 'Play Mobile sozlamalari yo‘q', retryable: false };
    }

    const messageId = `alv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const auth = Buffer.from(`${login}:${password}`, 'utf8').toString('base64');

    try {
      const res = await fetch(`${base}/send`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              recipient: phone.replace(/^\+/, ''),
              'message-id': messageId,
              sms: {
                originator: this.config.get<string>('SMS_SENDER') ?? '3700',
                content: { text },
              },
            },
          ],
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return {
          ok: false,
          error: `Play Mobile: HTTP ${res.status} ${body.slice(0, 200)}`,
          retryable: res.status >= 500 || res.status === 429,
        };
      }
      return { ok: true, externalId: messageId };
    } catch (e) {
      return { ok: false, error: (e as Error).message, retryable: true };
    }
  }

  private baseUrl(fallback: string): string {
    return (this.config.get<string>('SMS_API_URL') ?? fallback).replace(/\/+$/, '');
  }
}
