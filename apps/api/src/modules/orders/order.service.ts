import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { InventoryService, type InventoryClient } from '../inventory/inventory.service';
import { DiscountService, type DiscountClient } from '../discounts/discount.service';
import { DeliveryService } from '../delivery/delivery.service';
import { CartService } from '../cart/cart.service';
import { OtpService } from '../auth/otp.service';
import { FiscalService } from '../fiscal/fiscal.service';
import { NotificationService } from '../notifications/notification.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { carrierTrackUrl } from '../shipments/shipment-state';
import { STATUS_TEMPLATE, amountVar, type Lang } from '../notifications/templates';
import { normalizePhone } from '../../common/phone';
import { generateOrderNumber } from '../../common/order-number';
import { computeTotals } from '../cart/cart-totals';
import { effectivePrice } from '../catalog/pricing.util';
import {
  type OrderStatus,
  type PaymentStatus,
  assertOrderTransition,
  assertPaymentTransition,
  RESERVING_STATUSES,
} from '../../common/state-machine/order-state-machine';
import type { CreateOrderDto } from './dto/order.dto';
import type { CartLine } from '../discounts/discount-engine';

const DEFAULT_RESERVATION_MINUTES = 30;

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly inventory: InventoryService,
    private readonly discounts: DiscountService,
    private readonly delivery: DeliveryService,
    private readonly cart: CartService,
    private readonly otp: OtpService,
    private readonly fiscal: FiscalService,
    private readonly notifications: NotificationService,
    private readonly config: ConfigService,
    private readonly loyalty: LoyaltyService,
  ) {}

  private async setting<T>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return (row?.value as T) ?? fallback;
  }

  /**
   * Bo'sh buyurtma raqamini topadi.
   *
   * Raqamning oxirgi 4 xonasi tasodifiy (ekspertiza B-2), shuning uchun
   * kunlik buyurtmalar ko'payganda to'qnashuv ehtimoli nolga teng emas.
   * Avval bazadan tekshiramiz; poyga holatida qolgan to'qnashuvni esa
   * `orders_number_key` unikal indeksi ushlaydi va tranzaksiya qayta
   * uriniladi.
   */
  private async nextOrderNumber(at: Date): Promise<string> {
    for (let i = 0; i < 10; i += 1) {
      const candidate = generateOrderNumber('ALV', at);
      const clash = await this.prisma.order.findUnique({
        where: { number: candidate },
        select: { id: true },
      });
      if (!clash) return candidate;
    }
    throw new BadRequestException('Buyurtma raqamini yaratib bo‘lmadi. Qayta urinib ko‘ring.');
  }

  /**
   * Checkout uchun SMS-kod yuboradi.
   *
   * `auth/otp/request` dan farqi: bu kod bilan tizimga KIRIB bo'lmaydi,
   * u faqat `ORDER_CONFIRM` maqsadida ishlaydi. Shuning uchun naqd
   * to'lovdagi tasdiq mijoz sessiyasini ochib yubormaydi.
   */
  async requestOrderOtp(phoneRaw: string, ip?: string, userAgent?: string) {
    return this.otp.request({ phone: phoneRaw, purpose: 'ORDER_CONFIRM' as never, ip, userAgent });
  }

  /** Prisma unikal cheklov xatosi aynan buyurtma raqami bo'yicha ekanini aniqlaydi. */
  private isOrderNumberClash(e: unknown): boolean {
    const err = e as { code?: string; meta?: { target?: unknown } };
    if (err?.code !== 'P2002') return false;
    const target = err.meta?.target;
    const fields = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
    return fields.some((f) => f.includes('number'));
  }

  /* ======================================================================
     BUYURTMA YARATISH
     ====================================================================== */

  /**
   * Savatdan buyurtma yaratadi.
   *
   * Bu metodning uchta muhim xususiyati bor (ekspertiza A-5, A-6, A-7):
   *
   *  1. NUSXA. Mahsulot nomi, narxi, chegirmasi, QQS i va IKPU kodi
   *     `order_items` ga yoziladi. Keyin admin narxni o'zgartirsa ham
   *     bu buyurtma o'zgarmaydi.
   *
   *  2. ATOMARLIK. Buyurtma va ombor rezervi BITTA tranzaksiyada bo'ladi.
   *     Rezerv qilinmasa — buyurtma ham yaratilmaydi.
   *
   *  3. IDEMPOTENTLIK. Bir xil `idempotencyKey` bilan ikkinchi so'rov
   *     yangi buyurtma yaratmaydi, birinchisini qaytaradi.
   */
  async createFromCart(params: {
    cartId: string;
    dto: CreateOrderDto;
    customerId?: string;
    ip?: string;
  }) {
    const dto = params.dto;

    if (!dto.acceptOffer) {
      throw new BadRequestException({
        code: 'OFFER_NOT_ACCEPTED',
        message: 'Buyurtma berish uchun ommaviy oferta shartlariga rozilik kerak',
      });
    }

    const phone = normalizePhone(dto.phone);

    // 0) Idempotentlik — takroriy bosishdan himoya
    if (dto.idempotencyKey) {
      const existing = await this.prisma.order.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return this.publicView(existing.id);
    }

    // 1) Naqd to'lov uchun telefonni tasdiqlash (TZ 34)
    if (dto.paymentProvider === 'CASH_ON_DELIVERY') {
      const required = await this.setting<boolean>('orders.codRequiresOtp', true);
      if (required) {
        if (!dto.otpCode) {
          throw new BadRequestException({
            code: 'OTP_REQUIRED',
            message: 'Naqd to‘lov uchun telefon raqamini SMS-kod bilan tasdiqlang',
          });
        }
        await this.otp.verify(phone, dto.otpCode, 'ORDER_CONFIRM');
      }
    }

    // 2) Savat va narxlar
    const view = await this.cart.view(params.cartId, phone);
    if (view.items.length === 0) throw new BadRequestException('Savat bo‘sh');

    const blocked = view.items.filter((i) => i.exceedsStock);
    if (blocked.length > 0) {
      throw new BadRequestException({
        code: 'STOCK_CHANGED',
        message: `Qoldiq o‘zgardi: ${blocked.map((b) => b.nameUz).join(', ')}. Savatni yangilang.`,
      });
    }

    const cartRow = await this.prisma.cart.findUniqueOrThrow({
      where: { id: params.cartId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    nameUz: true,
                    nameRu: true,
                    vatRate: true,
                    ikpuCode: true,
                    unitCode: true,
                    images: {
                      where: { kind: 'MAIN' },
                      take: 1,
                      select: { url: true, urlWebp: true },
                    },
                    categories: { select: { categoryId: true } },
                    collections: { select: { collectionId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const now = new Date();
    const lines: CartLine[] = cartRow.items.map((i) => ({
      variantId: i.variantId,
      productId: i.variant.product.id,
      categoryIds: i.variant.product.categories.map((c) => c.categoryId),
      collectionIds: i.variant.product.collections.map((c) => c.collectionId),
      quantity: i.quantity,
      lineTotal: effectivePrice(i.variant, now).price * BigInt(i.quantity),
    }));

    // 3) Chegirmalar
    const discount = await this.discounts.computeForCart({
      lines,
      couponCode: cartRow.couponCode,
      phone,
    });

    // Savat mehmon telefonisiz hisoblangan bo'lishi mumkin, bu yerda esa
    // checkout dagi haqiqiy telefon bilan qayta tekshiriladi. Agar kod shu
    // bosqichda rad etilsa — buyurtmani JIM ravishda qimmatroq narxda
    // yaratmaymiz, mijozga sababini aytamiz va savatni yangilashga qaytaramiz.
    if (cartRow.couponCode && discount.couponError) {
      await this.cart.setCoupon(params.cartId, null);
      throw new BadRequestException({
        code: 'COUPON_CHANGED',
        message: `Promo-kod qo‘llanmadi: ${discount.couponError}. Savatdagi summani qayta ko‘ring.`,
      });
    }
    const subtotalAfterDiscount =
      lines.reduce((s, l) => s + l.lineTotal, 0n) - discount.discountTotal;

    // 4) Yetkazib berish
    const shipping = await this.delivery.resolve({
      regionId: dto.regionId,
      methodCode: dto.deliveryMethodCode,
      subtotalAfterDiscount,
      freeShippingFromDiscount: discount.freeShipping,
    });

    // 5) Summalar — savat bilan bir xil formula
    const totals = computeTotals({
      lines: cartRow.items.map((i, idx) => ({
        lineTotal: lines[idx]!.lineTotal,
        vatRate: i.variant.product.vatRate,
      })),
      discountPerLine: discount.perLine,
      shipping: shipping.quote.price,
    });

    /*
     * 5b) Sodiqlik ballari.
     *
     * Chegara hisobi shu yerda QAYTA bajariladi, mijoz yuborgan songa
     * ishonilmaydi: brauzerdagi tekshiruv faqat qulaylik uchun va uni
     * chetlab o'tish oson. Reja balans, buyurtma ulushi va so'ralgan
     * miqdorning eng kichigini oladi.
     *
     * Ball MAHSULOT summasidan ayiriladi, yetkazishdan emas: kuryerga
     * ball bilan to'lab bo'lmaydi.
     */
    const redeem =
      params.customerId && (dto.loyaltyPoints ?? 0) > 0
        ? await this.loyalty.quote(
            params.customerId,
            totals.subtotal - totals.discountTotal,
            dto.loyaltyPoints ?? 0,
          )
        : null;

    const loyaltyAmount = redeem?.amount ?? 0n;
    const grandTotalAfterPoints = totals.grandTotal - loyaltyAmount;

    // 6) Hudud nomlari (nusxa uchun)
    const [region, district] = await Promise.all([
      this.prisma.region.findUnique({ where: { id: dto.regionId } }),
      dto.districtId
        ? this.prisma.district.findUnique({ where: { id: dto.districtId } })
        : Promise.resolve(null),
    ]);
    if (!region) throw new BadRequestException('Hudud topilmadi');

    const reservationMinutes = await this.setting<number>(
      'inventory.reservationTtlMinutes',
      DEFAULT_RESERVATION_MINUTES,
    );
    const reservationExpiresAt =
      dto.paymentProvider === 'CASH_ON_DELIVERY'
        ? null
        : new Date(Date.now() + reservationMinutes * 60_000);

    // 7) Buyurtma + rezerv — bitta tranzaksiyada
    const runTransaction = (orderNumber: string) =>
      this.prisma.$transaction(
        async (tx) => {
          const created = await tx.order.create({
            data: {
              number: orderNumber,
              customerId: params.customerId ?? null,
              contactPhone: phone,
              firstName: dto.firstName.trim(),
              lastName: dto.lastName?.trim() ?? null,
              comment: dto.comment ?? null,
              status: 'NEW',
              paymentStatus: 'PENDING',
              deliveryMethodId: shipping.methodId,
              deliveryType: shipping.quote.type as never,
              regionName: region.nameUz,
              districtName: district?.nameUz ?? null,
              addressLine: dto.addressLine,
              landmark: dto.landmark ?? null,
              deliveryEtaFrom: shipping.window.from,
              deliveryEtaTo: shipping.window.to,
              subtotal: totals.subtotal,
              discountTotal: totals.discountTotal,
              shippingTotal: totals.shippingTotal,
              vatTotal: totals.vatTotal,
              // Ball bilan qoplangan qism ayirilgan yakuniy summa.
              grandTotal: grandTotalAfterPoints,
              appliedCouponCode: cartRow.couponCode,
              reservationExpiresAt,
              idempotencyKey: dto.idempotencyKey ?? null,
              utmSource: dto.utmSource ?? null,
              utmMedium: dto.utmMedium ?? null,
              utmCampaign: dto.utmCampaign ?? null,
              utmContent: dto.utmContent ?? null,
              utmTerm: dto.utmTerm ?? null,
            },
          });

          for (const [i, item] of cartRow.items.entries()) {
            const price = effectivePrice(item.variant, now);
            const line = totals.lines[i]!;
            const options = (item.variant.options ?? {}) as Record<string, string>;

            await tx.orderItem.create({
              data: {
                orderId: created.id,
                variantId: item.variantId,
                // --- muzlatilgan nusxa ---
                productName: item.variant.product.nameUz,
                variantName: Object.values(options).join(' / ') || null,
                sku: item.variant.sku,
                barcode: item.variant.barcode,
                imageUrl:
                  item.variant.product.images[0]?.urlWebp ??
                  item.variant.product.images[0]?.url ??
                  null,
                ikpuCode: item.variant.product.ikpuCode,
                vatRate: item.variant.product.vatRate,
                unitCode: item.variant.product.unitCode,
                quantity: item.quantity,
                unitPrice: price.price,
                oldUnitPrice: price.oldPrice,
                discountAmount: line.discountAmount,
                vatAmount: line.vatAmount,
                lineTotal: line.netTotal,
              },
            });
          }

          /*
           * Namuna buyurtmaga BEPUL pozitsiya bo'lib qo'shiladi.
           *
           * Buni qilmasak mijoz namunani tanlar, lekin buyurtmada uning
           * izi qolmasdi — ya'ni yig'uvchi uni solmasdi va mijoz
           * va'da qilingan narsani olmasdi.
           *
           * Narxi nol, lekin IKPU va QQS baribir NUSXA qilinadi: chekda
           * har bir pozitsiya kodi bilan ko'rsatilishi shart, narxi nol
           * bo'lsa ham.
           */
          if (view.sample.selectedVariantId) {
            const sample = await tx.productVariant.findFirst({
              where: { id: view.sample.selectedVariantId, isActive: true, deletedAt: null },
              include: {
                product: {
                  select: {
                    nameUz: true,
                    ikpuCode: true,
                    vatRate: true,
                    unitCode: true,
                    images: { where: { kind: 'MAIN' }, take: 1, select: { url: true, urlWebp: true } },
                  },
                },
              },
            });

            // Namuna oradan yo'qolgan bo'lsa buyurtma TO'XTAMAYDI:
            // bepul sovg'a uchun to'lovni bekor qilish nomutanosib.
            if (sample) {
              const options = (sample.options ?? {}) as Record<string, string>;
              await tx.orderItem.create({
                data: {
                  orderId: created.id,
                  variantId: sample.id,
                  productName: `${sample.product.nameUz} (namuna)`,
                  variantName: Object.values(options).join(' / ') || null,
                  sku: sample.sku,
                  barcode: sample.barcode,
                  imageUrl:
                    sample.product.images[0]?.urlWebp ?? sample.product.images[0]?.url ?? null,
                  ikpuCode: sample.product.ikpuCode,
                  vatRate: sample.product.vatRate,
                  unitCode: sample.product.unitCode,
                  quantity: 1,
                  unitPrice: 0n,
                  oldUnitPrice: null,
                  discountAmount: 0n,
                  vatAmount: 0n,
                  lineTotal: 0n,
                },
              });
            }
          }

          /*
           * Ball chiqimi buyurtma bilan BITTA tranzaksiyada yoziladi.
           *
           * Alohida yozilsa, tranzaksiya orasida xato bo'lganda mijoz
           * chegirmani olib, ballari joyida qolardi — ya'ni bepul pul.
           * Ikki marta yozilishining oldini baza oladi: `(orderId, kind)`
           * bo'yicha unikal indeks.
           */
          if (params.customerId && redeem && redeem.points > 0) {
            await this.loyalty.redeem(tx as never, {
              customerId: params.customerId,
              orderId: created.id,
              points: redeem.points,
              amount: redeem.amount,
            });
          }

          await tx.orderStatusHistory.create({
            data: {
              orderId: created.id,
              fromStatus: null,
              toStatus: 'NEW',
              source: 'CUSTOMER',
              comment: 'Sayt orqali',
            },
          });

          await tx.payment.create({
            data: {
              orderId: created.id,
              provider: dto.paymentProvider as never,
              status: 'PENDING',
              amount: grandTotalAfterPoints,
            },
          });

          // Rezerv shu tranzaksiya ichida: rezerv bo'lmasa buyurtma ham yo'q.
          // Naqd to'lovda muddat YO'Q — bunday buyurtma to'lovni kutmaydi,
          // demak uni avtomatik bekor qilib bo'lmaydi.
          await this.inventory.reserveForOrder(
            {
              orderId: created.id,
              items: cartRow.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
              ttlMinutes: reservationExpiresAt === null ? null : reservationMinutes,
            },
            tx as unknown as InventoryClient,
          );

          // Chegirma hisobi ham SHU tranzaksiyada: aks holda ikki mijoz bir
          // vaqtda bitta "usageLimit: 1" kodini ishlatib yuborishi mumkin edi.
          await this.discounts.recordUsage(
            {
              applied: discount.applied,
              orderId: created.id,
              customerId: params.customerId,
              phone,
            },
            tx as unknown as DiscountClient,
          );

          return created;
        },
        { timeout: 15_000 },
      );

    // Raqam to'qnashuvi bo'lsa yangi raqam bilan qayta uriniladi. Boshqa
    // har qanday xato (masalan, qoldiq yetmasligi) darhol yuqoriga uzatiladi:
    // tranzaksiya orqaga qaytgani uchun na buyurtma, na rezerv qoladi.
    let order: Awaited<ReturnType<typeof runTransaction>>;
    for (let attempt = 1; ; attempt += 1) {
      const orderNumber = await this.nextOrderNumber(now);
      try {
        order = await runTransaction(orderNumber);
        break;
      } catch (e) {
        if (attempt < 3 && this.isOrderNumberClash(e)) {
          this.logger.warn(`Buyurtma raqami band chiqdi (${orderNumber}) — qayta uriniladi`);
          continue;
        }
        throw e;
      }
    }

    // 8) Tranzaksiyadan keyingi ishlar.
    // Buyurtma allaqachon yaratilgan, shuning uchun bu yerdagi xato mijozga
    // 500 qaytarmasligi kerak: u buyurtmam o'tmadi deb ikkinchisini berardi.
    try {
      await this.cart.clear(params.cartId);
      for (const item of cartRow.items) {
        await this.inventory.syncProductStockFlag(item.variantId);
      }
    } catch (e) {
      this.logger.error(
        `Buyurtma ${order.number} yaratildi, lekin yakuniy tozalashda xato: ${(e as Error).message}`,
      );
    }

    // Bildirishnomalar: mijozga tasdiq, operatorlarga yangi buyurtma.
    // Xato bo'lsa buyurtma buzilmaydi — xabar navbatda qoladi.
    try {
      await this.notifyStatus(order.id, 'NEW');
      await this.notifications.notifyStaff(
        'STAFF_NEW_ORDER',
        {
          number: order.number,
          name: `${dto.firstName} ${dto.lastName ?? ''}`.trim(),
          amount: amountVar(grandTotalAfterPoints),
          provider: dto.paymentProvider,
        },
        order.id,
      );
    } catch (e) {
      this.logger.error(`Buyurtma ${order.number}: bildirishnoma xatosi — ${(e as Error).message}`);
    }

    this.logger.log(
      `Buyurtma yaratildi: ${order.number} (${grandTotalAfterPoints} tiyin` +
        (redeem && redeem.points > 0 ? `, ${redeem.points} ball ishlatildi` : '') +
        ')',
    );
    return this.publicView(order.id);
  }

  /* ======================================================================
     KO'RISH
     ====================================================================== */

  async publicView(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        deliveryMethod: { select: { code: true, nameUz: true, nameRu: true } },
        fiscalReceipts: {
          where: { type: 'SALE', status: 'SENT' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { receiptUrl: true, fiscalSign: true },
        },
        shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    return {
      id: order.id,
      number: order.number,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentProvider: order.payments[0]?.provider ?? null,
      placedAt: order.placedAt,
      contactPhone: maskPhone(order.contactPhone),
      firstName: order.firstName,
      lastName: order.lastName,
      comment: order.comment,
      delivery: {
        code: order.deliveryMethod?.code ?? null,
        nameUz: order.deliveryMethod?.nameUz ?? null,
        nameRu: order.deliveryMethod?.nameRu ?? null,
        type: order.deliveryType,
        regionName: order.regionName,
        districtName: order.districtName,
        addressLine: order.addressLine,
        landmark: order.landmark,
        etaFrom: order.deliveryEtaFrom,
        etaTo: order.deliveryEtaTo,
      },
      totals: {
        subtotal: order.subtotal.toString(),
        discountTotal: order.discountTotal.toString(),
        shippingTotal: order.shippingTotal.toString(),
        vatTotal: order.vatTotal.toString(),
        grandTotal: order.grandTotal.toString(),
      },
      items: order.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        variantName: i.variantName,
        sku: i.sku,
        imageUrl: i.imageUrl,
        quantity: i.quantity,
        unitPrice: i.unitPrice.toString(),
        oldUnitPrice: i.oldUnitPrice?.toString() ?? null,
        discountAmount: i.discountAmount.toString(),
        lineTotal: i.lineTotal.toString(),
      })),
      timeline: order.statusHistory.map((h) => ({
        status: h.toStatus,
        at: h.createdAt,
        source: h.source,
        comment: h.comment,
      })),
      reservationExpiresAt: order.reservationExpiresAt,
      /** Onlayn to'lov hali kutilyaptimi — sahifada "to'lash" tugmasi shunga qarab chiqadi. */
      canPay:
        order.paymentStatus !== 'PAID' &&
        order.status !== 'CANCELLED' &&
        order.payments[0]?.provider !== 'CASH_ON_DELIVERY',
      /** Fiskal chek havolasi (chek yuborilgan bo'lsa). */
      receipt: order.fiscalReceipts[0]
        ? {
            url: order.fiscalReceipts[0].receiptUrl,
            fiscalSign: order.fiscalReceipts[0].fiscalSign,
          }
        : null,
      /**
       * Jo'natma. Kuryer telefoni ATAYLAB to'liq beriladi: mijoz
       * kuryerga qo'ng'iroq qila olishi kerak. Kuryer ismi ham ochiq —
       * bu xizmat sifatining bir qismi.
       */
      shipment: order.shipments[0]
        ? {
            status: order.shipments[0].status,
            carrier: order.shipments[0].carrier,
            trackingNo: order.shipments[0].trackingNo,
            trackUrl: carrierTrackUrl(order.shipments[0].carrier, order.shipments[0].trackingNo),
            courierName: order.shipments[0].courierName,
            courierPhone: order.shipments[0].courierPhone,
            shippedAt: order.shipments[0].shippedAt,
          }
        : null,
    };
  }

  /**
   * Mehmon uchun kuzatuv: raqam + telefon (TZ 39).
   * So'rovlar soni cheklangan — aks holda raqamlarni saralab ko'rish mumkin
   * bo'lardi (ekspertiza B-15).
   */
  async track(number: string, phoneRaw: string, ip?: string) {
    const phone = normalizePhone(phoneRaw);

    const perIp = await this.redis.hit(`track:ip:${ip ?? 'unknown'}`, 3600);
    if (perIp > 20) {
      throw new ForbiddenException({
        code: 'TRACK_RATE_LIMITED',
        message: 'So‘rovlar juda ko‘p. Bir soatdan so‘ng urinib ko‘ring.',
      });
    }
    const perPhone = await this.redis.hit(`track:phone:${phone}`, 3600);
    if (perPhone > 30) {
      throw new ForbiddenException({
        code: 'TRACK_RATE_LIMITED',
        message: 'So‘rovlar juda ko‘p. Bir soatdan so‘ng urinib ko‘ring.',
      });
    }

    const order = await this.prisma.order.findFirst({
      where: { number: number.trim().toUpperCase(), contactPhone: phone, deletedAt: null },
      select: { id: true },
    });
    if (!order) {
      // Raqam bor-yo'qligini oshkor qilmaymiz.
      throw new NotFoundException('Buyurtma topilmadi. Raqam va telefonni tekshiring.');
    }
    return this.publicView(order.id);
  }

  async myOrders(customerId: string) {
    const rows = await this.prisma.order.findMany({
      where: { customerId, deletedAt: null },
      orderBy: { placedAt: 'desc' },
      take: 50,
      include: { items: { select: { imageUrl: true, productName: true }, take: 3 } },
    });
    return rows.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      paymentStatus: o.paymentStatus,
      grandTotal: o.grandTotal.toString(),
      placedAt: o.placedAt,
      items: o.items,
    }));
  }

  /* ======================================================================
     ADMIN
     ====================================================================== */

  async adminList(query: {
    q?: string;
    status?: string;
    paymentStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    perPage?: number;
  }) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 30;

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.dateFrom || query.dateTo) {
      where.placedAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        /*
         * Kun OXIRIGACHA. `new Date('2026-09-12')` — o'sha kunning
         * 00:00 i, ya'ni `lte` bilan o'sha kun BUTUNLAY tushib
         * qolardi: operator «1–12 sentabr» deb filtrlaganda bugungi
         * buyurtmalar ko'rinmasdi va ro'yxat shunchaki tinch kun
         * bo'lib tuyulardi. Audit va to'lovlar moduli buni
         * allaqachon to'g'ri qiladi.
         */
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999`) } : {}),
      };
    }
    if (query.q) {
      const q = query.q.trim();
      where.OR = [
        { number: { contains: q.toUpperCase() } },
        { contactPhone: { contains: q.replace(/\D/g, '') } },
        { firstName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.order.count({ where: where as never }),
      this.prisma.order.findMany({
        where: where as never,
        orderBy: { placedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          // `_count` — `take` bilan sanash 20 dan ortiq pozitsiyali
          // buyurtmada «20» deb ko'rsatardi va buyurtma kartochkasi
          // bilan ziddiyatga tushardi.
          _count: { select: { items: true } },
          payments: { select: { provider: true }, take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
    ]);

    return {
      items: rows.map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentProvider: o.payments[0]?.provider ?? null,
        firstName: o.firstName,
        lastName: o.lastName,
        contactPhone: o.contactPhone,
        regionName: o.regionName,
        grandTotal: o.grandTotal.toString(),
        itemsCount: o._count.items,
        placedAt: o.placedAt,
        reservationExpiresAt: o.reservationExpiresAt,
      })),
      total,
      page,
      perPage,
    };
  }

  async adminGet(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { admin: { select: { fullName: true } } },
        },
        payments: { include: { transactions: true } },
        reservations: true,
        customer: { select: { id: true, phone: true, ordersCount: true, totalSpent: true } },
        deliveryMethod: true,
      },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    return order;
  }

  /**
   * Statusni o'zgartirish. Ruxsat etilmagan o'tish 409 bilan to'xtatiladi
   * (ekspertiza A-7), har o'zgarish tarixga va audit logga tushadi.
   */
  async changeStatus(params: {
    orderId: string;
    to: string;
    adminId?: string;
    comment?: string;
    source?: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
      select: { id: true, number: true, status: true, paymentStatus: true },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    const from = order.status as OrderStatus;
    const to = params.to as OrderStatus;
    assertOrderTransition(from, to);

    // 1) Statusni AVVAL band qilamiz: shartli UPDATE faqat status hali
    //    o'zgarmagan bo'lsa ishlaydi. Ikki operator (yoki operator va cron)
    //    bir vaqtda bosganda ikkinchisi shu yerda to'xtaydi va yon ta'sirlar
    //    ikki marta bajarilmaydi (rezerv ikki marta bo'shamaydi).
    /*
     * "To'langan buyurtmada to'lov holatiga tegilmaydi" qoidasi ilgari
     * OLDIN O'QILGAN qiymat asosida hal qilinardi. Bu yo'qolgan
     * yangilanishga olib kelardi:
     *
     *   T    cron buyurtmani o'qidi: paymentStatus = WAITING
     *   T+1  webhook keldi -> paymentStatus = PAID
     *   T+2  cron o'zining eski qiymati bilan CANCELLED deb yozdi
     *
     * Natijada to'lovlar ro'yxatida pul kelgan, buyurtmalar ro'yxatida
     * esa to'lanmagan bekor qilingan buyurtma turardi.
     *
     * Endi qoida SHARTNING O'ZIDA: `paymentStatus` ni faqat u hali
     * PAID emas bo'lgandagina o'zgartiramiz, ya'ni tekshiruv va yozuv
     * bitta atomar amalda bajariladi.
     */
    const cancellingUnpaid = to === 'CANCELLED' && order.paymentStatus !== 'PAID';

    const claimed = await this.prisma.order.updateMany({
      where: {
        id: order.id,
        status: from as never,
        ...(cancellingUnpaid ? { paymentStatus: { not: 'PAID' as never } } : {}),
      },
      data: {
        status: to as never,
        ...(to === 'CONFIRMED' ? { confirmedAt: new Date(), reservationExpiresAt: null } : {}),
        ...(to === 'SHIPPED' ? { shippedAt: new Date() } : {}),
        ...(to === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        ...(to === 'CANCELLED'
          ? {
              cancelledAt: new Date(),
              ...(cancellingUnpaid ? { paymentStatus: 'CANCELLED' as never } : {}),
            }
          : {}),
      },
    });

    if (claimed.count !== 1) {
      throw new ConflictException({
        code: 'ORDER_STATUS_RACE',
        message: 'Buyurtma holati boshqa joyda o‘zgardi. Sahifani yangilang.',
      });
    }

    await this.prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: from as never,
        toStatus: to as never,
        adminId: params.adminId ?? null,
        source: params.source ?? 'ADMIN',
        comment: params.comment ?? null,
      },
    });

    // 2) Mijozga xabar YON TA'SIRLARDAN OLDIN navbatga qo'yiladi.
    //    Sabab: yon ta'sirda xato bo'lsa (masalan naqd to'lovni yopib
    //    bo'lmasa), o'tish allaqachon bajarilgan va uni takrorlab
    //    bo'lmaydi — xabar esa umuman yuborilmay qolardi.
    try {
      await this.notifyStatus(order.id, to, params.comment);
    } catch (e) {
      this.logger.error(
        `Buyurtma ${order.number}: bildirishnoma navbatga qo‘yilmadi — ${(e as Error).message}`,
      );
    }

    // 3) Yon ta'sirlar. Status allaqachon band qilingani uchun bular
    //    aynan bir marta bajariladi. Xato bo'lsa ham status orqaga
    //    qaytarilmaydi — buni logdan ko'rib qo'lda tuzatish mumkin, lekin
    //    jim qolib ombor buzilishidan ko'ra yaxshi.
    try {
      if (to === 'CONFIRMED') {
        // Tasdiqlangan buyurtma rezervi muddatsiz bo'ladi.
        await this.inventory.clearReservationDeadline(order.id);
      }
      if (to === 'SHIPPED') {
        await this.inventory.consumeForOrder(order.id, params.adminId);
      }
      if (to === 'CANCELLED') {
        // Jo'natilgandan keyin bekor qilinsa, tovar omborga qaytariladi.
        await this.inventory.releaseForOrder(order.id, 'CANCELLED');
        await this.discounts.revokeUsage(order.id);
      }
      if (to === 'DELIVERED') {
        // Naqd to'lov aynan shu paytda tushadi.
        await this.settleCashOnDelivery(order.id, params.adminId);
        // Yetkazilganda mijoz ko'rsatkichlari yangilanadi (TZ 40, 41)
        await this.refreshCustomerStats(order.id);
      }
    } catch (e) {
      this.logger.error(
        `Buyurtma ${order.number}: ${from} -> ${to} bajarildi, lekin yon ta'sirda xato: ${(e as Error).message}`,
      );
      throw e;
    }

    if (order.paymentStatus === 'PAID' && to === 'CANCELLED') {
      this.logger.warn(
        `Buyurtma ${order.number} to‘langan holda bekor qilindi — pulni qaytarish talab qilinadi`,
      );
    }

    this.logger.log(`Buyurtma ${order.number}: ${from} -> ${to}`);
    return this.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  }

  /**
   * Bir nechta buyurtmani bitta holatga o'tkazadi.
   *
   * Operator kuni bilan 40 ta buyurtmani birma-bir bosib o'tirmasligi
   * kerak. Muhim tafsilot: bu YOPIQ sikl emas — har bir buyurtma
   * `changeStatus` orqali alohida o'tadi, ya'ni holat mashinasi,
   * ombor amallari, bildirishnoma va audit yozuvi har biriga to'liq
   * qo'llanadi. O'tolmagani xatosi bilan qaytariladi, qolganlari
   * baribir bajariladi.
   */
  async bulkChangeStatus(params: {
    orderIds: string[];
    to: string;
    adminId?: string;
    comment?: string;
  }): Promise<{
    changed: number;
    failed: Array<{ orderId: string; number: string | null; message: string }>;
  }> {
    if (params.orderIds.length === 0) throw new BadRequestException('Buyurtma tanlanmagan');
    if (params.orderIds.length > 100) {
      throw new BadRequestException('Bir vaqtda 100 tadan ortiq buyurtma o‘zgartirilmaydi');
    }

    const failed: Array<{ orderId: string; number: string | null; message: string }> = [];
    let changed = 0;

    for (const orderId of params.orderIds) {
      try {
        await this.changeStatus({
          orderId,
          to: params.to,
          adminId: params.adminId,
          comment: params.comment,
          source: 'ADMIN_BULK',
        });
        changed += 1;
      } catch (e) {
        const order = await this.prisma.order.findUnique({
          where: { id: orderId },
          select: { number: true },
        });
        failed.push({
          orderId,
          number: order?.number ?? null,
          message: (e as Error).message,
        });
      }
    }

    this.logger.log(
      `Guruh amali: ${changed} ta buyurtma ${params.to} ga o‘tdi, ${failed.length} tasi o‘tmadi`,
    );
    return { changed, failed };
  }

  /** Mijoz o'z buyurtmasini faqat tasdiqlanmagan bo'lsa bekor qila oladi. */
  async cancelByCustomer(orderId: string, customerId: string, comment?: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');
    if (!RESERVING_STATUSES.includes(order.status as OrderStatus)) {
      throw new BadRequestException(
        'Bu buyurtmani saytdan bekor qilib bo‘lmaydi — operatorga murojaat qiling',
      );
    }
    return this.changeStatus({
      orderId,
      to: 'CANCELLED',
      comment: comment ?? 'Mijoz so‘rovi bilan bekor qilindi',
      source: 'CUSTOMER',
    });
  }

  /**
   * Buyurtma holati o'zgargani haqida mijozga xabar.
   *
   * Til mijoz profilidan olinadi; mehmon uchun sayt tili saqlanmagani
   * uchun standart o'zbekcha. Kuryer ma'lumoti bo'lsa xabarga qo'shiladi.
   */
  private async notifyStatus(orderId: string, status: string, comment?: string): Promise<void> {
    let template = STATUS_TEMPLATE[status];
    if (!template) return;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { locale: true, telegramChatId: true } },
        shipments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!order) return;

    const shipment = order.shipments[0];
    const web = this.config.get<string>('WEB_URL') ?? 'https://aliver.uz';
    const lang: Lang = order.customer?.locale === 'RU' ? 'ru' : 'uz';

    // Kuryer hali biriktirilmagan bo'lsa "Kuryer: —, —" deb yozmaymiz.
    if (template === 'ORDER_SHIPPED' && !shipment?.courierName && !shipment?.courierPhone) {
      template = 'ORDER_SHIPPED_NO_COURIER';
    }

    await this.notifications.notifyCustomer({
      template,
      lang,
      phone: order.contactPhone,
      telegramChatId: order.customer?.telegramChatId ?? null,
      orderId: order.id,
      vars: {
        number: order.number,
        name: order.firstName,
        amount: amountVar(order.grandTotal as bigint),
        trackUrl: `${web}/${lang}/kuzatuv`,
        courier: shipment?.courierName ?? undefined,
        courierPhone: shipment?.courierPhone ?? undefined,
        trackingNo: shipment?.trackingNo ?? undefined,
        reason: comment ?? undefined,
      },
    });
  }

  /**
   * Yetkazilganda naqd to'lovni yopadi.
   *
   * Pul kuryerga aynan shu paytda beriladi, demak fiskal chek ham shu
   * paytda beriladi — qonun bo'yicha chek pul olingan paytda beriladi
   * (ekspertiza A-1). Onlayn to'lovlar bu yerga tushmaydi: ular
   * webhook orqali allaqachon `PAID` bo'lgan.
   */
  private async settleCashOnDelivery(orderId: string, adminId?: string): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId, provider: 'CASH_ON_DELIVERY' },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment || payment.status === 'PAID') return;

    assertPaymentTransition(payment.status as PaymentStatus, 'PAID');

    // Buyurtma raqami tranzaksiya identifikatori uchun kerak (pastga qarang).
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { number: true },
    });
    if (!order) throw new NotFoundException('Buyurtma topilmadi');

    const paidAt = new Date();
    const claimed = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: payment.status },
      data: {
        status: 'PAID',
        paidAt,
        providerTxnId:
          payment.providerTxnId ??
          // Buyurtma RAQAMI ishlatiladi: u o'zi unikal. Ilgari bu yerda
          // UUID ning birinchi 8 belgisi turardi — 32 bit, ya'ni ~77 000
          // naqd buyurtmada to'qnashuv ehtimoli 50%. To'qnashganda
          // `(provider, providerTxnId)` unikal indeksi P2002 tashlardi
          // va buyurtma DELIVERED bo'lib, puli esa yozilmay qolardi —
          // fiskal chek ham berilmasdi.
          `CASH-${order.number}`,
      },
    });
    if (claimed.count !== 1) return;

    await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'PAID', paidAt },
    });

    await this.fiscal.enqueueSale(orderId, payment.id);
    this.logger.log(`Naqd to‘lov qabul qilindi: buyurtma ${orderId} (admin ${adminId ?? 'tizim'})`);
  }

  private async refreshCustomerStats(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true },
    });
    if (!order?.customerId) return;

    const agg = await this.prisma.order.aggregate({
      where: { customerId: order.customerId, status: 'DELIVERED', deletedAt: null },
      _count: { _all: true },
      _sum: { grandTotal: true },
      _min: { placedAt: true },
      _max: { placedAt: true },
    });

    await this.prisma.customer.update({
      where: { id: order.customerId },
      data: {
        ordersCount: agg._count._all,
        totalSpent: agg._sum.grandTotal ?? 0n,
        firstOrderAt: agg._min.placedAt,
        lastOrderAt: agg._max.placedAt,
      },
    });
  }
}

/** Telefon raqamini qisman yashirish: +998 90 *** ** 67 */
function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  return `${phone.slice(0, 7)} *** ** ${phone.slice(-2)}`;
}
