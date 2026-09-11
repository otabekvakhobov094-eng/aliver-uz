import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { DiscountService } from '../discounts/discount.service';
import { effectivePrice } from '../catalog/pricing.util';
import { computeTotals } from './cart-totals';
import type { CartLine } from '../discounts/discount-engine';

const CART_TTL_DAYS = 30;
const MAX_QTY_PER_ITEM = 50;
const MAX_ITEMS = 50;

export interface CartLineView {
  itemId: string;
  variantId: string;
  productId: string;
  slug: string;
  nameUz: string;
  nameRu: string;
  variantLabel: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: string;
  oldUnitPrice: string | null;
  lineTotal: string;
  discountAmount: string;
  availableStock: number;
  /** Qoldiq yetmasa — miqdor shu songacha kamaytirilishi kerak. */
  exceedsStock: boolean;
  vatRate: number;
}

export interface CartView {
  id: string;
  token: string;
  items: CartLineView[];
  itemsCount: number;
  subtotal: string;
  discountTotal: string;
  vatTotal: string;
  grandTotal: string;
  couponCode: string | null;
  couponError: string | null;
  appliedDiscounts: Array<{ code: string | null; amount: string }>;
  freeShipping: boolean;
  /** Ogohlantirishlar: qoldiq kamaygan, mahsulot o'chirilgan va h.k. */
  warnings: string[];
}

/**
 * Savat.
 *
 * Muhim qaror: savatda NARX SAQLANMAYDI. Narx har doim joriy variantdan
 * olinadi, muzlatish esa faqat buyurtma yaratilganda bo'ladi (ekspertiza A-5).
 * Aks holda mijoz savatni bir hafta ochiq qoldirsa, eski narxda sotib olardi.
 */
@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly discounts: DiscountService,
  ) {}

  static newToken(): string {
    return randomBytes(24).toString('base64url');
  }

  private expiry(): Date {
    return new Date(Date.now() + CART_TTL_DAYS * 24 * 3600 * 1000);
  }

  async getOrCreate(token: string | undefined, customerId?: string) {
    if (customerId) {
      const existing = await this.prisma.cart.findFirst({
        where: { customerId },
        orderBy: { updatedAt: 'desc' },
      });
      if (existing) return existing;
    }

    if (token) {
      const found = await this.prisma.cart.findUnique({ where: { token } });
      if (found) {
        if (customerId && !found.customerId) {
          return this.prisma.cart.update({ where: { id: found.id }, data: { customerId } });
        }
        return found;
      }
    }

    return this.prisma.cart.create({
      data: {
        token: token ?? CartService.newToken(),
        customerId: customerId ?? null,
        expiresAt: this.expiry(),
      },
    });
  }

  /**
   * Kirganda mehmon savati mijoz savatiga qo'shiladi.
   * Bir xil variant bo'lsa — miqdorlar yig'iladi (yo'qotmaslik uchun).
   */
  async mergeGuestCart(guestToken: string, customerId: string): Promise<void> {
    const guest = await this.prisma.cart.findUnique({
      where: { token: guestToken },
      include: { items: true },
    });
    if (!guest || guest.items.length === 0) return;
    if (guest.customerId === customerId) return;

    const target = await this.getOrCreate(undefined, customerId);
    if (target.id === guest.id) return;

    for (const item of guest.items) {
      const existing = await this.prisma.cartItem.findUnique({
        where: { cartId_variantId: { cartId: target.id, variantId: item.variantId } },
      });
      const quantity = Math.min((existing?.quantity ?? 0) + item.quantity, MAX_QTY_PER_ITEM);

      await this.prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: target.id, variantId: item.variantId } },
        update: { quantity },
        create: { cartId: target.id, variantId: item.variantId, quantity },
      });
    }

    await this.prisma.cart.delete({ where: { id: guest.id } });
  }

  async addItem(cartId: string, variantId: string, quantity: number): Promise<void> {
    if (quantity < 1) throw new BadRequestException('Miqdor kamida 1 bo‘lishi kerak');

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, deletedAt: null, isActive: true },
      include: { product: { select: { status: true, deletedAt: true, nameUz: true } } },
    });
    if (!variant || variant.product.deletedAt || variant.product.status !== 'ACTIVE') {
      throw new NotFoundException('Mahsulot sotuvda emas');
    }

    const count = await this.prisma.cartItem.count({ where: { cartId } });
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId, variantId } },
    });
    if (!existing && count >= MAX_ITEMS) {
      throw new BadRequestException(
        `Savatda ${MAX_ITEMS} tadan ortiq pozitsiya bo‘lishi mumkin emas`,
      );
    }

    const desired = Math.min((existing?.quantity ?? 0) + quantity, MAX_QTY_PER_ITEM);

    // Savatga qo'shishda qoldiq TEKSHIRILADI, lekin BAND QILINMAYDI:
    // rezerv faqat buyurtma yaratilganda bo'ladi, aks holda savatga tashlab
    // qo'yilgan tovar boshqalarga ko'rinmay qolardi.
    const availability = await this.inventory.availability([variantId]);
    const available = availability.get(variantId)?.availableStock ?? 0;
    if (available <= 0) {
      throw new BadRequestException(`"${variant.product.nameUz}" hozir sotuvda yo‘q`);
    }

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      update: { quantity: Math.min(desired, available) },
      create: { cartId, variantId, quantity: Math.min(desired, available) },
    });
    await this.touch(cartId);
  }

  async updateItem(cartId: string, itemId: string, quantity: number): Promise<void> {
    if (quantity < 0) throw new BadRequestException('Miqdor manfiy bo‘lishi mumkin emas');
    if (quantity === 0) return this.removeItem(cartId, itemId);

    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) throw new NotFoundException('Savat pozitsiyasi topilmadi');

    const availability = await this.inventory.availability([item.variantId]);
    const available = availability.get(item.variantId)?.availableStock ?? 0;

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: Math.min(quantity, MAX_QTY_PER_ITEM, Math.max(available, 1)) },
    });
    await this.touch(cartId);
  }

  async removeItem(cartId: string, itemId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
    await this.touch(cartId);
  }

  async clear(cartId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({ where: { cartId } });
    await this.prisma.cart.update({ where: { id: cartId }, data: { couponCode: null } });
  }

  async setCoupon(cartId: string, code: string | null): Promise<void> {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { couponCode: code ? code.trim().toUpperCase() : null },
    });
  }

  /**
   * Savatning to'liq ko'rinishi: jonli narx, qoldiq, chegirma va summalar.
   * Buyurtma yaratishda ham AYNAN shu hisob ishlatiladi — ikki joyda
   * ikki xil formula bo'lmasligi uchun.
   */
  async view(cartId: string, phone?: string): Promise<CartView> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    slug: true,
                    nameUz: true,
                    nameRu: true,
                    vatRate: true,
                    status: true,
                    deletedAt: true,
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
    if (!cart) throw new NotFoundException('Savat topilmadi');

    const warnings: string[] = [];
    const now = new Date();

    // Sotuvdan chiqarilgan mahsulotlarni savatdan olib tashlaymiz.
    const stale = cart.items.filter(
      (i) =>
        i.variant.deletedAt ||
        !i.variant.isActive ||
        i.variant.product.deletedAt ||
        i.variant.product.status !== 'ACTIVE',
    );
    if (stale.length > 0) {
      await this.prisma.cartItem.deleteMany({ where: { id: { in: stale.map((i) => i.id) } } });
      warnings.push(
        `${stale.length} ta mahsulot sotuvdan chiqarilgani uchun savatdan olib tashlandi`,
      );
    }

    const live = cart.items.filter((i) => !stale.includes(i));
    const availability = await this.inventory.availability(live.map((i) => i.variantId));

    const lines: CartLine[] = [];
    const views: Omit<CartLineView, 'discountAmount'>[] = [];

    for (const item of live) {
      const price = effectivePrice(item.variant, now);
      const available = availability.get(item.variantId)?.availableStock ?? 0;
      const quantity = item.quantity;
      const lineTotal = price.price * BigInt(quantity);

      if (available < quantity) {
        warnings.push(
          `"${item.variant.product.nameUz}" — omborda ${available} dona qoldi (savatda ${quantity})`,
        );
      }

      lines.push({
        variantId: item.variantId,
        productId: item.variant.product.id,
        categoryIds: item.variant.product.categories.map((c) => c.categoryId),
        collectionIds: item.variant.product.collections.map((c) => c.collectionId),
        quantity,
        lineTotal,
      });

      const options = (item.variant.options ?? {}) as Record<string, string>;
      views.push({
        itemId: item.id,
        variantId: item.variantId,
        productId: item.variant.product.id,
        slug: item.variant.product.slug,
        nameUz: item.variant.product.nameUz,
        nameRu: item.variant.product.nameRu,
        variantLabel: Object.values(options).join(' / ') || item.variant.sku,
        sku: item.variant.sku,
        imageUrl:
          item.variant.product.images[0]?.urlWebp ?? item.variant.product.images[0]?.url ?? null,
        quantity,
        unitPrice: price.price.toString(),
        oldUnitPrice: price.oldPrice?.toString() ?? null,
        lineTotal: lineTotal.toString(),
        availableStock: available,
        exceedsStock: available < quantity,
        vatRate: item.variant.product.vatRate,
      });
    }

    const discount = await this.discounts.computeForCart({
      lines,
      couponCode: cart.couponCode,
      phone,
    });

    const totals = computeTotals({
      lines: lines.map((l, i) => ({ lineTotal: l.lineTotal, vatRate: views[i]!.vatRate })),
      discountPerLine: discount.perLine,
      shipping: 0n,
    });

    return {
      id: cart.id,
      token: cart.token,
      items: views.map((v, i) => ({
        ...v,
        discountAmount: (discount.perLine[i] ?? 0n).toString(),
      })),
      itemsCount: views.reduce((s, v) => s + v.quantity, 0),
      subtotal: totals.subtotal.toString(),
      discountTotal: totals.discountTotal.toString(),
      vatTotal: totals.vatTotal.toString(),
      grandTotal: totals.grandTotal.toString(),
      couponCode: cart.couponCode,
      couponError: discount.couponError ?? null,
      appliedDiscounts: discount.applied.map((a) => ({
        code: a.code,
        amount: a.amount.toString(),
      })),
      freeShipping: discount.freeShipping,
      warnings,
    };
  }

  /** Buyurtma yaratish uchun ichki ko'rinish (servislar orasida ishlatiladi). */
  async lines(cartId: string, phone?: string) {
    const view = await this.view(cartId, phone);
    return view;
  }

  private async touch(cartId: string): Promise<void> {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { expiresAt: this.expiry() },
    });
  }
}
