import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { SmsService } from '../sms/sms.service';
import { normalizePhone } from '../../common/phone';
import { TooManyOtpException } from './otp.errors';

/**
 * OTP siyosati — ekspertiza A-8.
 *
 * Himoyalanmagan OTP endpointi to'g'ridan-to'g'ri pul yo'qotishga olib keladi:
 * har bir SMS pullik. Shuning uchun to'rt qatlam cheklov bor:
 *   1) qayta yuborish oralig'i (cooldown)
 *   2) bir telefonga sutkalik limit
 *   3) IP bo'yicha soatlik limit
 *   4) noto'g'ri kod urinishlari limiti
 *
 * Kod bazada ochiq saqlanmaydi — faqat argon2 hash.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
  ) {}

  private cfg<T>(key: string, def: T): T {
    return this.config.get<T>(key) ?? def;
  }

  async request(params: {
    phone: string;
    purpose?: OtpPurpose;
    ip?: string;
    userAgent?: string;
  }): Promise<{ expiresInSeconds: number; resendAfterSeconds: number }> {
    const phone = normalizePhone(params.phone);
    const purpose = params.purpose ?? OtpPurpose.LOGIN;

    const cooldown = this.cfg('OTP_RESEND_COOLDOWN_SECONDS', 60);
    const ttl = this.cfg('OTP_TTL_SECONDS', 300);
    const perDay = this.cfg('OTP_MAX_PER_PHONE_PER_DAY', 5);
    const perIpHour = this.cfg('OTP_MAX_PER_IP_PER_HOUR', 20);

    // 1) Qayta yuborish oralig'i
    const cdKey = `otp:cd:${phone}`;
    if (!(await this.redis.setNx(cdKey, '1', cooldown))) {
      const wait = await this.redis.ttl(cdKey);
      throw new TooManyOtpException(
        `Yangi kodni ${Math.max(wait, 1)} soniyadan so‘ng so‘rash mumkin`,
        Math.max(wait, 1),
      );
    }

    // 2) Telefon bo'yicha sutkalik limit
    const dayKey = `otp:day:${phone}:${new Date().toISOString().slice(0, 10)}`;
    const dayCount = await this.redis.hit(dayKey, 24 * 3600);
    if (dayCount > perDay) {
      throw new TooManyOtpException('Bugun uchun SMS limiti tugadi. Ertaga urinib ko‘ring.');
    }

    // 3) IP bo'yicha soatlik limit
    if (params.ip) {
      const ipCount = await this.redis.hit(`otp:ip:${params.ip}`, 3600);
      if (ipCount > perIpHour) {
        throw new TooManyOtpException('So‘rovlar juda ko‘p. Bir ozdan so‘ng urinib ko‘ring.');
      }
    }

    const code = this.generateCode();
    const codeHash = await argon2.hash(code);
    const expiresAt = new Date(Date.now() + ttl * 1000);

    // Eski faol kodlarni bekor qilamiz — bir vaqtda faqat bitta kod amal qiladi.
    await this.prisma.otpRequest.updateMany({
      where: { phone, purpose, consumedAt: null, blockedAt: null, expiresAt: { gt: new Date() } },
      data: { blockedAt: new Date() },
    });

    await this.prisma.otpRequest.create({
      data: {
        phone,
        purpose,
        codeHash,
        maxAttempts: this.cfg('OTP_MAX_VERIFY_ATTEMPTS', 5),
        expiresAt,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });

    const devCode = this.config.get<string>('OTP_DEV_FIXED_CODE');
    if (!devCode) {
      await this.sms.send({
        phone,
        template: 'otp',
        text: `ALIVER.UZ tasdiqlash kodi: ${code}. Hech kimga aytmang.`,
      });
    } else {
      this.logger.warn(`Development rejimi: OTP kodi ${devCode} (SMS yuborilmadi)`);
    }

    return { expiresInSeconds: ttl, resendAfterSeconds: cooldown };
  }

  /** Kodni tekshiradi. Muvaffaqiyatli bo'lsa kod "iste'mol qilingan" deb belgilanadi. */
  async verify(
    phoneRaw: string,
    code: string,
    purpose: OtpPurpose = OtpPurpose.LOGIN,
  ): Promise<void> {
    const phone = normalizePhone(phoneRaw);

    const devCode = this.config.get<string>('OTP_DEV_FIXED_CODE');
    if (devCode && code === devCode) return;

    const otp = await this.prisma.otpRequest.findFirst({
      where: { phone, purpose, consumedAt: null, blockedAt: null },
      orderBy: { sentAt: 'desc' },
    });

    if (!otp) throw new BadRequestException('Kod topilmadi. Yangi kod so‘rang.');
    if (otp.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Kod muddati tugagan. Yangi kod so‘rang.');
    }
    if (otp.attempts >= otp.maxAttempts) {
      await this.prisma.otpRequest.update({
        where: { id: otp.id },
        data: { blockedAt: new Date() },
      });
      throw new TooManyOtpException('Urinishlar soni tugadi. Yangi kod so‘rang.');
    }

    const ok = await argon2.verify(otp.codeHash, code);
    if (!ok) {
      const updated = await this.prisma.otpRequest.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      const left = Math.max(otp.maxAttempts - updated.attempts, 0);
      if (left === 0) {
        await this.prisma.otpRequest.update({
          where: { id: otp.id },
          data: { blockedAt: new Date() },
        });
        throw new TooManyOtpException('Urinishlar soni tugadi. Yangi kod so‘rang.');
      }
      throw new BadRequestException(`Kod noto‘g‘ri. Qolgan urinishlar: ${left}`);
    }

    await this.prisma.otpRequest.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
  }

  private generateCode(): string {
    const len = this.cfg('OTP_LENGTH', 5);
    let out = '';
    for (let i = 0; i < len; i++) out += String(randomInt(0, 10));
    return out;
  }
}

export { normalizePhone };
