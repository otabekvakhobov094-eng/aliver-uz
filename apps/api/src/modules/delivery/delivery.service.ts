import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  type DeliveryOptionInput,
  type DeliveryQuote,
  estimateWindow,
  pickQuote,
  quoteAll,
} from './delivery-quote';

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Viloyatlar va tumanlar — checkout uchun (TZ 29). */
  /**
   * Hududlar bo'yicha tarif jadvali — saytdagi «Yetkazish» sahifasi
   * uchun.
   *
   * NEGA KERAK. Sahifada uchta qator QO'LDA yozilgan edi:
   * «Toshkent — 1 kun — 20 000 so'mdan» va hokazo. Xodim adminda
   * tarifni o'zgartirsa, sahifa eski raqamni ko'rsatishda davom
   * etardi, savat esa yangisini hisoblardi. Mijoz uchun bu ikki xil
   * narx degani va u faqat to'lov paytida bilinardi.
   *
   * Har bir hudud uchun ENG ARZON kuryer usuli olinadi — sahifada
   * «shu summadan boshlab» deb ko'rsatiladi.
   */
  async tariffs() {
    const [regions, methods] = await Promise.all([
      this.prisma.region.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, nameUz: true, nameRu: true },
      }),
      this.prisma.deliveryMethod.findMany({
        where: { isActive: true, type: 'COURIER' },
        select: {
          basePrice: true,
          freeThreshold: true,
          estimatedDaysMin: true,
          estimatedDaysMax: true,
          regions: {
            select: {
              regionId: true,
              price: true,
              freeThreshold: true,
              daysMin: true,
              daysMax: true,
              isAvailable: true,
            },
          },
        },
      }),
    ]);

    return regions.map((region) => {
      let price: bigint | null = null;
      let daysMin: number | null = null;
      let daysMax: number | null = null;
      let freeFrom: bigint | null = null;

      for (const m of methods) {
        const override = m.regions.find((r) => r.regionId === region.id);
        // Hududda o'chirilgan usul hisobga olinmaydi.
        if (override && !override.isAvailable) continue;

        const effective = (override?.price ?? m.basePrice) as bigint;
        if (price === null || effective < price) {
          price = effective;
          daysMin = override?.daysMin ?? m.estimatedDaysMin;
          daysMax = override?.daysMax ?? m.estimatedDaysMax;
          freeFrom = (override?.freeThreshold ?? m.freeThreshold) as bigint | null;
        }
      }

      return {
        regionId: region.id,
        nameUz: region.nameUz,
        nameRu: region.nameRu,
        price: price === null ? null : price.toString(),
        freeFrom: freeFrom === null || freeFrom === undefined ? null : freeFrom.toString(),
        daysMin,
        daysMax,
      };
    });
  }

  async regions() {
    const rows = await this.prisma.region.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        districts: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      nameUz: r.nameUz,
      nameRu: r.nameRu,
      districts: r.districts.map((d) => ({
        id: d.id,
        code: d.code,
        nameUz: d.nameUz,
        nameRu: d.nameRu,
      })),
    }));
  }

  /** Hudud uchun mavjud usullar va narxlar. */
  async quotes(params: {
    regionId: string;
    subtotalAfterDiscount: bigint;
    freeShippingFromDiscount?: boolean;
  }): Promise<DeliveryQuote[]> {
    const region = await this.prisma.region.findFirst({
      where: { id: params.regionId, isActive: true },
    });
    if (!region) throw new NotFoundException('Hudud topilmadi');

    const methods = await this.prisma.deliveryMethod.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { regions: { where: { regionId: params.regionId } } },
    });

    const options: DeliveryOptionInput[] = methods.map((m) => {
      const link = m.regions[0];
      return {
        code: m.code,
        type: m.type as DeliveryOptionInput['type'],
        nameUz: m.nameUz,
        nameRu: m.nameRu,
        descUz: m.descUz,
        descRu: m.descRu,
        basePrice: m.basePrice,
        basefreeThreshold: m.freeThreshold,
        baseDaysMin: m.estimatedDaysMin,
        baseDaysMax: m.estimatedDaysMax,
        region: link
          ? {
              price: link.price,
              freeThreshold: link.freeThreshold,
              daysMin: link.daysMin,
              daysMax: link.daysMax,
              isAvailable: link.isAvailable,
            }
          : // Hudud uchun alohida yozuv yo'q: EKSPRESS faqat aniq ochilgan
            // hududlarda ishlaydi, qolgan usullar standart narx bilan ishlaydi.
            m.type === 'EXPRESS'
            ? { price: m.basePrice, isAvailable: false }
            : null,
      };
    });

    return quoteAll(options, {
      subtotalAfterDiscount: params.subtotalAfterDiscount,
      freeShippingFromDiscount: params.freeShippingFromDiscount,
    });
  }

  /** Checkout da tanlangan usulni tekshiradi va yakuniy narxni beradi. */
  async resolve(params: {
    regionId: string;
    methodCode: string;
    subtotalAfterDiscount: bigint;
    freeShippingFromDiscount?: boolean;
  }): Promise<{ quote: DeliveryQuote; methodId: string; window: { from: Date; to: Date } }> {
    const quotes = await this.quotes(params);
    const quote = pickQuote(quotes, params.methodCode);

    const method = await this.prisma.deliveryMethod.findFirst({
      where: { code: params.methodCode, isActive: true },
      select: { id: true },
    });
    if (!method) throw new NotFoundException('Yetkazib berish usuli topilmadi');

    return { quote, methodId: method.id, window: estimateWindow(quote) };
  }
}
