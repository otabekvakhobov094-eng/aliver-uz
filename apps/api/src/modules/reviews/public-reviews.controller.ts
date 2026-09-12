import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuthPrincipal, CurrentUser, Public } from '../../common/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AGE_LABEL,
  HAIR_LABEL,
  SKIN_LABEL,
  applyFilter,
  isAgeBand,
  isHairType,
  isSkinType,
  summarise,
} from './review-facets';

/**
 * Mijoz uchun sharhlar — TZ 51, TZ-3.
 *
 * Bu modul umuman yo'q edi va bu eng kutilmagan topilma bo'ldi:
 * adminkada moderatsiya bor, baza modeli bor, lekin mijoz sharhni
 * NA O'QIY oladi, NA YOZA oladi. Ya'ni butun sharh tizimi bir uchi
 * ulanmagan holda turgan.
 *
 * Shu sababdan «menga o'xshaganlar» filtri (TZ-3) alohida emas, shu
 * yerda birga quriladi: mavjud bo'lmagan ro'yxatga filtr qo'shish
 * ma'nosiz bo'lardi.
 */

class CreateReviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @Length(10, 2000, { message: 'Sharh kamida 10 belgidan iborat bo‘lsin' })
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @IsUrl({}, { each: true })
  mediaUrls?: string[];

  /**
   * Atributlar ixtiyoriy. Majburiy qilinmadi: sharh yozish yo'lida
   * har bir qo'shimcha savol yozganlar sonini kamaytiradi, atributi
   * yo'q sharh esa baribir foydali.
   */
  @IsOptional() @IsString() skinType?: string;
  @IsOptional() @IsString() hairType?: string;
  @IsOptional() @IsString() ageBand?: string;
}

/** Bazadan kelgan sharh, enumlari matnga keltirilgan holda. */
interface Shaped {
  id: string;
  rating: number;
  body: string | null;
  mediaUrls: string[];
  isVerified: boolean;
  adminReply: string | null;
  createdAt: Date;
  skinType: string | null;
  hairType: string | null;
  ageBand: string | null;
  customer: { fullName: string | null } | null;
}

@ApiTags('reviews')
@Controller('catalog/reviews')
export class PublicReviewsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mahsulot sharhlari, xulosa va fasetlar.
   *
   * Xulosa BARCHA tasdiqlangan sharhlardan hisoblanadi, filtrlangandan
   * emas — faset soni «shu filtrni qo'ysam nechta qoladi» degan savolga
   * javob berishi kerak.
   */
  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Mahsulot sharhlari, xulosa va fasetlar' })
  async list(
    @Param('slug') slug: string,
    @Query('rating') rating?: string,
    @Query('skinType') skinType?: string,
    @Query('hairType') hairType?: string,
    @Query('ageBand') ageBand?: string,
    @Query('withPhoto') withPhoto?: string,
    @Query('verifiedOnly') verifiedOnly?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    // Faqat TASDIQLANGAN sharhlar. Moderatsiyadan o'tmagani saytga
    // chiqmaydi — bu moderatsiyaning butun ma'nosi.
    const rows = await this.prisma.review.findMany({
      where: { productId: product.id, status: 'APPROVED', deletedAt: null },
      select: {
        id: true,
        rating: true,
        body: true,
        mediaUrls: true,
        isVerified: true,
        adminReply: true,
        createdAt: true,
        skinType: true,
        hairType: true,
        ageBand: true,
        customer: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      // Chegara: sharh soni mingga yetganda ham bitta so'rov bazani
      // bo'g'ib qo'ymasin. Xulosa shu 1000 tadan hisoblanadi va bu
      // amalda yetarli aniq.
      take: 1000,
    });

    // Prisma enum turlarini matnga keltiramiz: `review-facets` Prisma
    // dan mustaqil va shu sababdan sof matn bilan ishlaydi.
    const shaped: Shaped[] = rows.map((r) => ({
      ...r,
      skinType: (r.skinType as string | null) ?? null,
      hairType: (r.hairType as string | null) ?? null,
      ageBand: (r.ageBand as string | null) ?? null,
    }));

    const summary = summarise(shaped);

    const ratingNum = rating ? Number(rating) : undefined;
    const filtered = applyFilter<Shaped>(shaped, {
      rating: Number.isInteger(ratingNum) ? ratingNum : undefined,
      skinType: isSkinType(skinType) ? skinType : undefined,
      hairType: isHairType(hairType) ? hairType : undefined,
      ageBand: isAgeBand(ageBand) ? ageBand : undefined,
      withPhoto: withPhoto === 'true',
      verifiedOnly: verifiedOnly === 'true',
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'rating_desc') return b.rating - a.rating;
      if (sort === 'rating_asc') return a.rating - b.rating;
      if (sort === 'helpful') {
        // «Foydali» — hozircha rasmli va tasdiqlangan sharh oldinga
        // chiqadi. Ovoz berish qo'shilgach shu joy almashtiriladi.
        const score = (r: (typeof filtered)[number]) =>
          (r.mediaUrls.length > 0 ? 2 : 0) + (r.isVerified ? 1 : 0) + (r.body ? 1 : 0);
        return score(b) - score(a);
      }
      return 0; // sukut bo'yicha yangilari birinchi (bazadan shunday keladi)
    });

    const perPage = 10;
    const current = Math.max(1, Number(page) || 1);
    const slice = sorted.slice((current - 1) * perPage, current * perPage);

    return {
      summary,
      total: sorted.length,
      page: current,
      perPage,
      labels: { skin: SKIN_LABEL, hair: HAIR_LABEL, age: AGE_LABEL },
      items: slice.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        mediaUrls: r.mediaUrls,
        isVerified: r.isVerified,
        adminReply: r.adminReply,
        createdAt: r.createdAt,
        skinType: r.skinType,
        hairType: r.hairType,
        ageBand: r.ageBand,
        // Faqat ism va familiyaning birinchi harfi: to'liq ism bilan
        // birga teri turi va yosh ko'rsatilsa, bu odamni aniqlashga
        // yaqinlashadi.
        author: maskName(r.customer?.fullName ?? null),
      })),
    };
  }

  /**
   * Sharh qoldirish.
   *
   * Faqat mijoz va faqat YETKAZILGAN buyurtma egasi. Bu B-13 talabi:
   * sotib olmagan odamning sharhi reyting bilan o'ynash yo'li bo'lardi.
   */
  @Post(':slug')
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @ApiOperation({ summary: 'Sharh qoldirish (yetkazilgan buyurtma egasi)' })
  async create(
    @Param('slug') slug: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user?: AuthPrincipal,
  ) {
    if (user?.kind !== 'customer') {
      throw new ForbiddenException('Sharh qoldirish uchun kabinetga kiring');
    }

    const product = await this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    // Yetkazilgan buyurtma qidiriladi — shu mahsulot bilan.
    const order = await this.prisma.order.findFirst({
      where: {
        customerId: user.sub,
        status: 'DELIVERED',
        deletedAt: null,
        items: { some: { productId: product.id } },
      },
      select: { id: true },
      orderBy: { placedAt: 'desc' },
    });
    if (!order) {
      throw new ForbiddenException(
        'Sharh faqat yetkazilgan buyurtmadan keyin qoldiriladi',
      );
    }

    const existing = await this.prisma.review.findFirst({
      where: { productId: product.id, customerId: user.sub, orderId: order.id },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Bu buyurtma uchun sharh allaqachon qoldirilgan');

    // Atributlar bo'sh kelsa mijoz profilidan olinadi: u allaqachon
    // bir marta aytgan bo'lsa, ikkinchi marta so'ramaymiz.
    const profile = await this.prisma.customer.findUnique({
      where: { id: user.sub },
      select: { skinType: true, hairType: true, ageBand: true },
    });

    const skin = isSkinType(dto.skinType) ? dto.skinType : (profile?.skinType ?? null);
    const hair = isHairType(dto.hairType) ? dto.hairType : (profile?.hairType ?? null);
    const age = isAgeBand(dto.ageBand) ? dto.ageBand : (profile?.ageBand ?? null);

    const review = await this.prisma.review.create({
      data: {
        productId: product.id,
        customerId: user.sub,
        orderId: order.id,
        rating: dto.rating,
        body: dto.body?.trim() || null,
        mediaUrls: dto.mediaUrls ?? [],
        // Sotib olgani tekshirilgani uchun darhol «tasdiqlangan xarid».
        isVerified: true,
        // Lekin MATNI baribir moderatsiyadan o'tadi.
        status: 'PENDING',
        skinType: skin as never,
        hairType: hair as never,
        ageBand: age as never,
      },
      select: { id: true, status: true },
    });

    return {
      ...review,
      message: 'Sharhingiz uchun rahmat. U moderatsiyadan keyin saytda ko‘rinadi.',
    };
  }
}

/**
 * «Nilufar Abdullayeva» → «Nilufar A.»
 *
 * To'liq ism bilan birga teri turi va yosh oralig'i ko'rsatilsa, bu
 * birgalikda odamni aniqlashga yaqinlashadi — shuning uchun familiya
 * qisqartiriladi.
 */
function maskName(full: string | null): string {
  const name = (full ?? '').trim();
  if (!name) return 'Mijoz';
  const parts = name.split(/\s+/);
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[1]![0]!.toUpperCase()}.`;
}
