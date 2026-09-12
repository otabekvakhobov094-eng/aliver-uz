import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequirePermissions } from '../../common/decorators';

/**
 * Do'kon qaysi rejimda ishlayotgani.
 *
 * NEGA KERAK. Stendda to'lov, fiskal chek va SMS maket rejimida
 * ishlaydi: «To'landi» deb yozilgan buyurtmadan hech kim pul olmagan,
 * chek OFD ga ketmagan, mijozga SMS bormagan. Kod buni BILADI, lekin
 * adminkada hech qaerda yozilmagan edi — do'kon egasi ekranda
 * «To'landi» ni ko'rib, pul kelgan deb o'ylashi mumkin.
 *
 * Bu eng qimmat turdagi jimgina xato: u ishga tushishda emas,
 * hisob-kitob paytida ma'lum bo'ladi.
 *
 * Javob ADMINKA UCHUN, ochiq emas: maket rejimida
 * `/payments/mock/confirm` ochiq turadi va buni hammaga e'lon qilish
 * shart emas.
 */
@Controller('admin/ops-status')
export class OpsStatusController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @RequirePermissions('settings.view')
  status() {
    const payments = this.config.get<string>('PAYMENTS_MODE', 'mock');
    const ofd = this.config.get<string>('OFD_PROVIDER', 'mock');
    const sms = this.config.get<string>('SMS_PROVIDER', 'console');
    const appEnv = this.config.get<string>('APP_ENV', 'development');

    return {
      appEnv,
      payments,
      ofd,
      sms,
      /** Haqiqiy pul olinmayapti. */
      paymentsMock: payments === 'mock',
      /** Fiskal chek OFD ga ketmayapti — qonun talabi bajarilmayapti. */
      ofdMock: ofd === 'mock',
      /** Mijozga SMS bormayapti, faqat jurnalga yozilyapti. */
      smsMock: sms === 'console',
      /** Uchtasidan birortasi ham maketda bo'lsa — do'kon jangovar emas. */
      live: payments !== 'mock' && ofd !== 'mock' && sms !== 'console',
    };
  }
}
