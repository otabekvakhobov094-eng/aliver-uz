import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UzumRaw } from './uzum-mapping';

/**
 * Uzum Seller API klienti.
 *
 * NIMA MA'LUM VA NIMA EMAS — buni ochiq aytish kerak.
 *
 * Ma'lum: Uzum Seller'da rasmiy OpenAPI bor va u
 * `https://api-seller.uzum.uz/api/seller-openapi` da turadi.
 *
 * Ma'lum emas: aniq yo'l nomlari va avtorizatsiya sarlavhasi. Spetsifikatsiya
 * tashqaridan yopiq (403) va u kalit bilan birga beriladi. Men ularni
 * TAXMIN QILMADIM: taxminiy yo'l bilan yozilgan klient ishlayotgandek
 * ko'rinadi va faqat birinchi haqiqiy sinxronizatsiyada yiqiladi.
 *
 * Shuning uchun yo'llar ham SOZLAMADAN keladi. Kalit va hujjat kelgach
 * `.env` da uchta qatorni to'ldirish kifoya — kodga tegilmaydi.
 */
@Injectable()
export class UzumClient {
  private readonly logger = new Logger(UzumClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return (
      this.config.get<string>('UZUM_SELLER_API_URL') ??
      'https://api-seller.uzum.uz/api/seller-openapi'
    ).replace(/\/+$/, '');
  }

  private get token(): string {
    return this.config.get<string>('UZUM_SELLER_TOKEN') ?? '';
  }

  private get shopId(): string {
    return this.config.get<string>('UZUM_SELLER_SHOP_ID') ?? '';
  }

  /** Hujjat kelgach to'ldiriladigan yo'llar. */
  private path(kind: 'products' | 'reviews'): string {
    const custom = this.config.get<string>(
      kind === 'products' ? 'UZUM_SELLER_PRODUCTS_PATH' : 'UZUM_SELLER_REVIEWS_PATH',
    );
    if (custom) return custom;
    // Taxminiy sukut — hujjatdan tasdiqlanishi SHART.
    return kind === 'products' ? '/v1/product/list' : '/v1/review/list';
  }

  status(): { ready: boolean; missing: string[]; baseUrl: string } {
    const missing: string[] = [];
    if (!this.token) missing.push('UZUM_SELLER_TOKEN');
    if (!this.shopId) missing.push('UZUM_SELLER_SHOP_ID');
    return { ready: missing.length === 0, missing, baseUrl: this.baseUrl };
  }

  private assertReady() {
    const { ready, missing } = this.status();
    if (!ready) {
      // 503, 500 emas: bu kod xatosi emas, sozlama yetishmasligi.
      throw new ServiceUnavailableException({
        code: 'UZUM_SELLER_NOT_CONFIGURED',
        message: `Uzum Seller ulanmagan. Yetishmayapti: ${missing.join(', ')}`,
      });
    }
  }

  private async call(path: string, params: Record<string, string>): Promise<UzumRaw[]> {
    this.assertReady();
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        headers: {
          // Sarlavha nomi ham sozlanadi: marketpleyslar `Authorization`,
          // `X-Api-Key` yoki o'z nomini ishlatadi.
          [this.config.get<string>('UZUM_SELLER_AUTH_HEADER') ?? 'Authorization']:
            this.config.get<string>('UZUM_SELLER_AUTH_PREFIX')
              ? `${this.config.get<string>('UZUM_SELLER_AUTH_PREFIX')} ${this.token}`
              : this.token,
          Accept: 'application/json',
        },
        // Sinxronizatsiya fon amali — u osilib qolmasligi kerak.
        signal: AbortSignal.timeout(30_000),
      });
    } catch (e) {
      throw new ServiceUnavailableException({
        code: 'UZUM_UNREACHABLE',
        message: `Uzum Seller ga ulanib bo‘lmadi: ${(e as Error).message}`,
      });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ServiceUnavailableException({
        code: 'UZUM_ERROR',
        message:
          `Uzum Seller ${res.status} qaytardi. ` +
          (res.status === 401 || res.status === 403
            ? 'Kalit noto‘g‘ri yoki muddati o‘tgan.'
            : `Yo‘l to‘g‘ri ekanini tekshiring (${path}).`) +
          (text ? ` ${text.slice(0, 200)}` : ''),
      });
    }

    const body = (await res.json()) as unknown;
    return normaliseList(body);
  }

  products(page = 0, size = 100) {
    return this.call(this.path('products'), {
      shopIds: this.shopId,
      page: String(page),
      size: String(size),
    });
  }

  reviews(page = 0, size = 100) {
    return this.call(this.path('reviews'), {
      shopIds: this.shopId,
      page: String(page),
      size: String(size),
    });
  }

  /**
   * BARCHA sahifalarni o'qiydi.
   *
   * NEGA. Ilgari faqat birinchi sahifa olinardi (`products(0, 500)`).
   * Uzum'dagi 500-dan keyingi har bir tovar bizda «faqat bizda bor»
   * bo'lib chiqardi va CSV eksport operatorga o'sha yerda allaqachon
   * mavjud tovarlarni YARATISHNI taklif qilardi. Xato chiqmaydi —
   * ro'yxat shunchaki noto'g'ri.
   *
   * Cheksiz halqadan himoya: sahifa to'liq bo'lmasa to'xtaydi va
   * qattiq chegara ham bor.
   */
  private async all(
    fetchPage: (page: number, size: number) => Promise<UzumRaw[]>,
    size = 200,
    maxPages = 50,
  ): Promise<UzumRaw[]> {
    const out: UzumRaw[] = [];
    for (let page = 0; page < maxPages; page += 1) {
      const rows = await fetchPage(page, size);
      out.push(...rows);
      if (rows.length < size) break;
    }
    return out;
  }

  allProducts() {
    return this.all((page, size) => this.products(page, size));
  }

  allReviews() {
    return this.all((page, size) => this.reviews(page, size));
  }
}

/**
 * Javobdan ro'yxatni ajratib olish.
 *
 * Marketpleyslar ro'yxatni turlicha o'raydi: to'g'ridan-to'g'ri massiv,
 * `{ items }`, `{ content }`, `{ data: { list } }`. Ularning hammasini
 * shu yerda hisobga olish — hujjat kelgach kod o'zgarmasligini
 * anglatadi.
 */
export function normaliseList(body: unknown): UzumRaw[] {
  if (Array.isArray(body)) return body as UzumRaw[];
  if (!body || typeof body !== 'object') return [];
  const o = body as Record<string, unknown>;
  for (const key of ['items', 'content', 'list', 'result', 'data', 'payload']) {
    const v = o[key];
    if (Array.isArray(v)) return v as UzumRaw[];
    if (v && typeof v === 'object') {
      const nested = normaliseList(v);
      if (nested.length > 0) return nested;
    }
  }
  return [];
}
