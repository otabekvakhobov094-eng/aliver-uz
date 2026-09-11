import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { TelegramService } from '../telegram/telegram.service';
import { normalizePhone } from '../../common/phone';
import {
  DEFAULT_QUIET_HOURS,
  URGENT_TEMPLATES,
  isQuiet,
  nextSendableAt,
  type QuietHours,
} from './quiet-hours';
import {
  type Lang,
  type TemplateKey,
  type TemplateVars,
  isStaffTemplate,
  render,
  smsParts,
} from './templates';

/** Qayta urinishlar oralig'i: 1, 3, 10, 30, 60 daqiqa. */
const BACKOFF_MINUTES = [1, 3, 10, 30, 60];

export function notifyBackoffMs(attempt: number): number {
  const idx = Math.min(Math.max(attempt, 1) - 1, BACKOFF_MINUTES.length - 1);
  return BACKOFF_MINUTES[idx]! * 60_000;
}

export interface EnqueueParams {
  template: TemplateKey;
  vars: TemplateVars;
  orderId?: string | null;
  /**
   * Hodisani ajratuvchi kalit.
   *
   * Takrorlanmaslik kaliti "<kanal>:<shablon>:<buyurtma>" ko'rinishida.
   * Lekin ba'zi hodisalar bitta buyurtmada BIR NECHA MARTA bo'ladi:
   * karta ikki marta rad etilishi yoki uch marta qisman qaytarish.
   * Bunday hollarda chaqiruvchi shu yerga farqlovchi qiymat beradi
   * (to'lov urinishi raqami, qaytarish summasi va h.k.), aks holda
   * ikkinchi xabar jim yo'qolardi.
   */
  eventKey?: string | null;
  /** Mijoz telefoni. Operator shablonlarida kerak emas. */
  phone?: string | null;
  lang?: Lang;
  /** Mijoz Telegram chat id si (bo'lsa, SMS bilan birga yuboriladi). */
  telegramChatId?: string | null;
}

/**
 * Bildirishnomalar.
 *
 * Uchta qoida ishlaydi:
 *
 *  1. TAKRORLANMAYDI. Har bir hodisaga bitta xabar: `dedupeKey`
 *     ("<template>:<orderId>") unikal. Operator statusni ikki marta
 *     bossa ham mijoz ikkita SMS olmaydi.
 *
 *  2. TUNDA JIM. 22:00–08:00 oralig'ida oddiy xabarlar ertalabga
 *     suriladi. Pulga tegishli xabarlar (to'lov, bekor qilish,
 *     qaytarish) va kuryer yo'lga chiqqani darhol ketadi.
 *
 *  3. YO'QOLMAYDI. Provayder ishlamasa yozuv `PENDING` bo'lib qoladi
 *     va cron 1, 3, 10, 30, 60 daqiqa oralig'ida qayta uradi.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
    private readonly telegram: TelegramService,
    private readonly config: ConfigService,
  ) {}

  private quietHours(): QuietHours {
    return {
      from: this.config.get<number>('NOTIFY_QUIET_FROM') ?? DEFAULT_QUIET_HOURS.from,
      to: this.config.get<number>('NOTIFY_QUIET_TO') ?? DEFAULT_QUIET_HOURS.to,
    };
  }

  private maxAttempts(): number {
    return this.config.get<number>('SMS_MAX_ATTEMPTS') ?? 5;
  }

  /* ======================================================================
     NAVBATGA QO'YISH
     ====================================================================== */

  /**
   * Mijozga xabar. SMS majburiy, Telegram — bog'langan bo'lsa qo'shimcha.
   *
   * Buyurtma holati haqidagi xabar TRANZAKSION hisoblanadi va marketing
   * roziligini talab qilmaydi: mijoz buyurtma bergan, uni xabardor
   * qilish bizning majburiyatimiz. Reklama xabarlari alohida (7-etap).
   */
  async notifyCustomer(params: EnqueueParams): Promise<void> {
    if (isStaffTemplate(params.template)) {
      throw new Error(`${params.template} — operator shabloni, mijozga yuborilmaydi`);
    }

    const lang = params.lang ?? 'uz';
    const body = render(params.template, lang, params.vars);
    const when = this.scheduleFor(params.template);

    if (params.phone) {
      await this.enqueue({
        channel: 'SMS',
        recipient: normalizePhone(params.phone),
        template: params.template,
        lang,
        body,
        orderId: params.orderId ?? null,
        scheduledAt: when,
        dedupeKey: this.dedupeKey('SMS', params.template, params.orderId, params.eventKey),
        payload: params.vars,
      });
    }

    if (params.telegramChatId) {
      await this.enqueue({
        channel: 'TELEGRAM',
        recipient: params.telegramChatId,
        template: params.template,
        lang,
        body,
        orderId: params.orderId ?? null,
        scheduledAt: when,
        dedupeKey: this.dedupeKey('TELEGRAM', params.template, params.orderId, params.eventKey),
        payload: params.vars,
      });
    }
  }

  /** Operatorlar kanaliga. Jim soatlar qo'llanmaydi — bu ish xabari. */
  async notifyStaff(
    template: TemplateKey,
    vars: TemplateVars,
    orderId?: string | null,
    eventKey?: string | null,
  ): Promise<void> {
    const lang = (this.config.get<Lang>('TELEGRAM_LANG') ?? 'uz') as Lang;
    const chatId = this.telegram.staffChatId;
    if (!chatId) return;

    await this.enqueue({
      channel: 'TELEGRAM',
      recipient: chatId,
      template,
      lang,
      body: render(template, lang, vars),
      orderId: orderId ?? null,
      scheduledAt: new Date(),
      dedupeKey: this.dedupeKey('STAFF', template, orderId, eventKey),
      payload: vars,
    });
  }

  private dedupeKey(
    prefix: string,
    template: string,
    orderId?: string | null,
    eventKey?: string | null,
  ): string | null {
    // Buyurtmaga bog'lanmagan xabarlar (masalan qoldiq ogohlantirishi)
    // takrorlanishi mumkin — ularga kalit berilmaydi.
    if (!orderId) return null;
    return eventKey
      ? `${prefix}:${template}:${orderId}:${eventKey}`
      : `${prefix}:${template}:${orderId}`;
  }

  private scheduleFor(template: TemplateKey): Date {
    const now = new Date();
    if (URGENT_TEMPLATES.has(template)) return now;
    return isQuiet(now, this.quietHours()) ? nextSendableAt(now, this.quietHours()) : now;
  }

  private async enqueue(data: {
    channel: 'SMS' | 'TELEGRAM' | 'IN_APP';
    recipient: string;
    template: string;
    lang: string;
    body: string;
    orderId: string | null;
    scheduledAt: Date;
    dedupeKey: string | null;
    payload: unknown;
  }): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          channel: data.channel as never,
          status: 'PENDING',
          recipient: data.recipient,
          template: data.template,
          lang: data.lang,
          body: data.body,
          orderId: data.orderId,
          scheduledAt: data.scheduledAt,
          dedupeKey: data.dedupeKey,
          payload: data.payload as never,
        },
      });
    } catch (e) {
      // Takroriy kalit — xabar allaqachon navbatda yoki yuborilgan.
      // Bu xato emas, aynan kutilgan xatti-harakat.
      if ((e as { code?: string }).code === 'P2002') {
        this.logger.debug(`Takroriy bildirishnoma o‘tkazib yuborildi: ${data.dedupeKey}`);
        return;
      }
      throw e;
    }
  }

  /* ======================================================================
     YUBORISH
     ====================================================================== */

  async sendOne(id: string): Promise<{ status: string; error?: string }> {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Bildirishnoma topilmadi');
    if (row.status === 'SENT') return { status: 'SENT' };

    // Xabarni BAND QILAMIZ. Cron qulfi 55 soniyada tugaydi, navbat esa
    // undan uzoqroq ishlashi mumkin (100 ta SMS × 1 soniya). O'shanda
    // ikkinchi ishchi bir xil qatorlarni olib, mijozga ikkinchi SMS
    // yuborardi. Shartli UPDATE buni to'xtatadi: yutqazgan ishchi
    // nol qator o'zgartiradi va bu xabarga tegmaydi.
    const claimed = await this.prisma.notification.updateMany({
      where: { id, status: { in: ['PENDING', 'FAILED'] } },
      data: { status: 'SENDING' },
    });
    if (claimed.count !== 1) {
      return { status: 'SKIPPED', error: 'Xabar boshqa jarayonda yuborilmoqda' };
    }

    const text = row.body ?? '';
    if (!text) return this.fail(row.id, row.attempts, 'Xabar matni bo‘sh', false);

    const result =
      row.channel === 'SMS'
        ? await this.sms.send({ phone: row.recipient, text, template: row.template })
        : row.channel === 'TELEGRAM'
          ? await this.telegram.send(row.recipient, text)
          : { ok: false, error: `Kanal qo‘llab-quvvatlanmaydi: ${row.channel}`, retryable: false };

    if (result.ok) {
      await this.prisma.notification.update({
        where: { id: row.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          externalId: result.externalId ?? null,
          attempts: row.attempts + 1,
          error: null,
          nextRetryAt: null,
        },
      });
      return { status: 'SENT' };
    }

    return this.fail(
      row.id,
      row.attempts,
      result.error ?? 'Noma’lum xato',
      result.retryable ?? true,
    );
  }

  private async fail(
    id: string,
    attempts: number,
    error: string,
    retryable: boolean,
  ): Promise<{ status: string; error: string }> {
    const next = attempts + 1;
    const giveUp = !retryable || next >= this.maxAttempts();

    await this.prisma.notification.update({
      where: { id },
      data: {
        status: giveUp ? 'FAILED' : 'PENDING',
        attempts: next,
        error,
        nextRetryAt: giveUp ? null : new Date(Date.now() + notifyBackoffMs(next)),
        // Qayta urinish vaqti kelgunicha navbatdan olinadi.
        scheduledAt: giveUp ? undefined : new Date(Date.now() + notifyBackoffMs(next)),
      },
    });

    if (giveUp) this.logger.error(`Bildirishnoma ${id} yuborilmadi (${next} urinish): ${error}`);
    return { status: giveUp ? 'FAILED' : 'PENDING', error };
  }

  /**
   * Yuborish paytida ilova to'xtab qolsa yozuv `SENDING` bo'lib osilib
   * qoladi. 10 daqiqadan keyin uni navbatga qaytaramiz — provayderga
   * so'rov taymauti bundan ancha qisqa, demak xabar haqiqatan ketmagan.
   */
  async recoverStuck(olderThanMinutes = 10): Promise<number> {
    const res = await this.prisma.notification.updateMany({
      where: {
        status: 'SENDING',
        updatedAt: { lt: new Date(Date.now() - olderThanMinutes * 60_000) },
      },
      data: { status: 'PENDING' },
    });
    if (res.count > 0) {
      this.logger.warn(`${res.count} ta osilgan bildirishnoma navbatga qaytarildi`);
    }
    return res.count;
  }

  /**
   * Navbatdagi xabarlarni yuboradi (cron chaqiradi).
   *
   * Har bir xabar `sendOne` ichida band qilinadi, shuning uchun bu
   * metodni bir vaqtda ikki joydan chaqirish ham xavfsiz (admin
   * paneldagi "navbatni ishga tushirish" tugmasi cron bilan bir
   * paytga tushishi mumkin).
   */
  async processQueue(limit = 100): Promise<{ sent: number; failed: number }> {
    await this.recoverStuck();

    const due = await this.prisma.notification.findMany({
      where: { status: 'PENDING', scheduledAt: { lte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    let sent = 0;
    let failed = 0;
    for (const row of due) {
      try {
        const res = await this.sendOne(row.id);
        if (res.status === 'SENT') sent += 1;
        // SKIPPED — boshqa ishchi band qilgan, bu xato emas.
        else if (res.status !== 'SKIPPED') failed += 1;
      } catch (e) {
        failed += 1;
        this.logger.error(`Bildirishnoma ${row.id}: ${(e as Error).message}`);
      }
    }
    return { sent, failed };
  }

  /* ======================================================================
     ADMIN
     ====================================================================== */

  async list(query: {
    channel?: string;
    status?: string;
    template?: string;
    orderId?: string;
    page?: number;
    perPage?: number;
  }) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 30;

    const where: Record<string, unknown> = {};
    if (query.channel) where.channel = query.channel;
    if (query.status) where.status = query.status;
    if (query.template) where.template = query.template;
    if (query.orderId) where.orderId = query.orderId;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.notification.count({ where: where as never }),
      this.prisma.notification.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { order: { select: { number: true } } },
      }),
    ]);

    return {
      items: rows.map((n: NotificationRow) => ({
        id: n.id,
        channel: n.channel,
        status: n.status,
        recipient: maskRecipient(n.channel, n.recipient),
        template: n.template,
        lang: n.lang,
        body: n.body,
        orderId: n.orderId,
        orderNumber: n.order?.number ?? null,
        attempts: n.attempts,
        error: n.error,
        scheduledAt: n.scheduledAt,
        sentAt: n.sentAt,
        createdAt: n.createdAt,
        // SMS narxi belgilar soniga bog'liq — admin buni ko'rib tursin.
        smsParts: n.channel === 'SMS' && n.body ? smsParts(n.body).parts : null,
      })),
      total,
      page,
      perPage,
      smsMock: this.sms.isMock,
      telegramMock: this.telegram.isMock,
    };
  }

  /** Buyurtma kartochkasida ko'rsatiladigan xabarlar tarixi. */
  async forOrder(orderId: string) {
    const rows = await this.prisma.notification.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((n: NotificationRow) => ({
      id: n.id,
      channel: n.channel,
      status: n.status,
      template: n.template,
      body: n.body,
      attempts: n.attempts,
      error: n.error,
      scheduledAt: n.scheduledAt,
      sentAt: n.sentAt,
      createdAt: n.createdAt,
    }));
  }
}

interface NotificationRow {
  id: string;
  channel: string;
  status: string;
  recipient: string;
  template: string;
  lang: string;
  body: string | null;
  orderId: string | null;
  order?: { number: string } | null;
  attempts: number;
  error: string | null;
  scheduledAt: Date;
  sentAt: Date | null;
  createdAt: Date;
}

/**
 * Telefon raqami admin ro'yxatida to'liq ko'rinmaydi.
 * `+998901234567` -> `+998 90 *** ** 67`: operator raqamni tanib oladi,
 * lekin ro'yxatdan bazani ko'chirib olib bo'lmaydi.
 */
function maskRecipient(channel: string, value: string): string {
  if (channel !== 'SMS') return value;
  if (value.length < 9) return value;
  return `${value.slice(0, 7)}*****${value.slice(-2)}`;
}
