import { Injectable, Logger } from '@nestjs/common';
import { buildEvent, type CapiEvent } from './meta-capi.util';

const GRAPH_VERSION = 'v21.0';

/**
 * Hodisalarni Meta Conversions API ga yuboradi.
 *
 * UCHTA QOIDA.
 *
 * 1. SOTUVNI HECH QACHON TO'XTATMAYDI. Facebook javob bermasa yoki
 *    xato qaytarsa, u faqat jurnalga yoziladi. Marketing hodisasi
 *    tufayli buyurtma rasmiylashtirilmay qolishi mumkin emas.
 *
 * 2. SOZLANMAGAN BO'LSA JIM TURADI. Kalitlar berilmagan bo'lsa xizmat
 *    hech narsa qilmaydi va ogohlantirish ham bermaydi — bu normal
 *    holat (masalan ishlab chiqish muhitida).
 *
 * 3. KUTILMAYDI. Yuborish fonda ketadi (`void`), chunki buyurtmani
 *    tasdiqlash Facebook javobini kutishi kerak emas.
 */
@Injectable()
export class MetaCapiService {
  private readonly logger = new Logger(MetaCapiService.name);

  private get pixelId(): string | undefined {
    return process.env.META_PIXEL_ID?.trim() || undefined;
  }
  private get token(): string | undefined {
    return process.env.META_CAPI_TOKEN?.trim() || undefined;
  }
  /** Events Manager → Test events dagi kod. Faqat sozlash paytida. */
  private get testCode(): string | undefined {
    return process.env.META_TEST_EVENT_CODE?.trim() || undefined;
  }

  get configured(): boolean {
    return Boolean(this.pixelId && this.token);
  }

  /** Sozlamalar holati — admin panelda ko'rsatish uchun. */
  status() {
    const missing: string[] = [];
    if (!this.pixelId) missing.push('META_PIXEL_ID');
    if (!this.token) missing.push('META_CAPI_TOKEN');
    return {
      ready: missing.length === 0,
      missing,
      testMode: Boolean(this.testCode),
    };
  }

  /** Fonda yuboradi — chaqiruvchi kutmaydi. */
  send(event: CapiEvent): void {
    if (!this.configured) return;
    void this.deliver(event).catch((e: unknown) => {
      this.logger.warn(`Meta CAPI yuborilmadi (${event.eventName}): ${String(e)}`);
    });
  }

  private async deliver(event: CapiEvent): Promise<void> {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${this.pixelId}/events`;
    const body: Record<string, unknown> = {
      data: [buildEvent(event)],
      access_token: this.token,
    };
    if (this.testCode) body.test_event_code = this.testCode;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      // Reklama tizimi sekin bo'lsa ham hech narsa kutib qolmaydi.
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // Javobda `access_token` qaytmaydi, lekin ehtiyot shart kesamiz.
      this.logger.warn(
        `Meta CAPI ${res.status} (${event.eventName}): ${text.slice(0, 300).replace(/access_token=[^&"\s]+/g, 'access_token=***')}`,
      );
      return;
    }
    this.logger.log(`Meta CAPI: ${event.eventName} yuborildi (${event.eventId})`);
  }
}
