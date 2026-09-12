/**
 * Reklama pikseli hodisalari — Meta (Facebook) va TikTok.
 *
 * NEGA BU FAYL KERAK.
 *
 * Bazaviy piksel kodi faqat `PageView` yuborardi. Facebook Ads uchun
 * bu deyarli foydasiz: reklama mashinasi kimga ko'rsatishni VORONKA
 * hodisalaridan o'rganadi — mahsulot ko'rildi, savatga solindi,
 * rasmiylashtirish boshlandi, xarid qilindi. `Purchase` va uning
 * SUMMASI bo'lmasa, «konversiya bo'yicha optimizatsiya» ham, ROAS
 * hisoboti ham umuman ishlamaydi.
 *
 * UCHTA QOIDA bu yerda qattiq bajariladi.
 *
 * 1. ROZILIK. Piksel skripti faqat rozilikdan keyin yuklanadi
 *    (`CookieConsent`). Bu yerdagi funksiyalar `fbq` bor-yo'qligini
 *    tekshiradi va yo'q bo'lsa jim qaytadi — hech narsa sinmaydi.
 *
 * 2. TAKRORLANMASLIK. `Purchase` bir buyurtma uchun BIR MARTA
 *    yuborilishi kerak. Foydalanuvchi «rahmat» sahifasini yangilasa
 *    yoki orqaga qaytib kelsa, hodisa qayta ketardi va statistikada
 *    bitta xarid ikki marta ko'rinardi — reklama byudjeti aynan shu
 *    raqamga qarab taqsimlanadi.
 *
 * 3. PUL — SO'MDA. Bizda ichkarida hamma narsa tiyinda. Pikselga
 *    tiyin yuborilsa, Facebook har bir xaridni 100 barobar katta deb
 *    hisoblardi.
 */

type Fbq = (...args: unknown[]) => void;
type Ttq = { track: (event: string, payload?: unknown) => void };

interface PixelWindow extends Window {
  fbq?: Fbq;
  ttq?: Ttq;
}

const w = (): PixelWindow | null => (typeof window === 'undefined' ? null : (window as PixelWindow));

/** Valyuta kodi — Meta uchun ISO 4217. */
export const CURRENCY = 'UZS';

/** Tiyindan so'mga. Manba `bigint` yoki satr bo'lishi mumkin. */
export function toSum(tiyin: bigint | string | number): number {
  const value = typeof tiyin === 'bigint' ? tiyin : BigInt(String(tiyin || '0'));
  // So'mgacha yaxlitlanadi: Facebook kasr qismini baribir tashlab yuboradi.
  return Number(value / 100n);
}

export interface PixelItem {
  id: string;
  quantity?: number;
  /** Dona narxi — SO'MDA. */
  price?: number;
}

interface EventPayload {
  value?: number;
  items?: PixelItem[];
  /** Takrorlanmaslik uchun: bir xil `eventId` ikki marta hisoblanmaydi. */
  eventId?: string;
}

/**
 * `sessionStorage` da belgi qo'yadi va u ilgari qo'yilganini aytadi.
 *
 * Maxfiy oynada `sessionStorage` xato tashlaydi — bunda hodisa
 * yuboriladi. Ikki marta hisoblanish ehtimoli hodisani umuman
 * yo'qotishdan yaxshiroq.
 */
function firstTime(key: string): boolean {
  const win = w();
  if (!win) return false;
  try {
    if (win.sessionStorage.getItem(key)) return false;
    win.sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return true;
  }
}

function send(event: string, payload: EventPayload = {}): void {
  const win = w();
  if (!win) return;

  const contents = payload.items?.map((i) => ({
    id: i.id,
    quantity: i.quantity ?? 1,
    item_price: i.price,
  }));

  if (typeof win.fbq === 'function') {
    win.fbq(
      'track',
      event,
      {
        currency: CURRENCY,
        ...(payload.value === undefined ? {} : { value: payload.value }),
        ...(contents ? { contents, content_type: 'product' } : {}),
        ...(payload.items ? { content_ids: payload.items.map((i) => i.id) } : {}),
      },
      // Server tomonidan ham yuborilsa (Conversions API), Facebook
      // ikkalasini SHU ID bo'yicha birlashtiradi.
      payload.eventId ? { eventID: payload.eventId } : undefined,
    );
  }

  // TikTok nomlari boshqacha — faqat mos kelganlarini yuboramiz.
  const tiktokName: Record<string, string> = {
    ViewContent: 'ViewContent',
    AddToCart: 'AddToCart',
    InitiateCheckout: 'InitiateCheckout',
    AddPaymentInfo: 'AddPaymentInfo',
    Purchase: 'CompletePayment',
  };
  const ttName = tiktokName[event];
  if (ttName && win.ttq?.track) {
    win.ttq.track(ttName, {
      currency: CURRENCY,
      ...(payload.value === undefined ? {} : { value: payload.value }),
      ...(contents ? { contents } : {}),
    });
  }
}

/* ------------------------------------------------------------------ *
 * Voronka hodisalari
 * ------------------------------------------------------------------ */

/** Mahsulot sahifasi ochildi. */
export function trackViewContent(item: PixelItem): void {
  send('ViewContent', { value: item.price, items: [item] });
}

/** Savatga qo'shildi. */
export function trackAddToCart(item: PixelItem): void {
  send('AddToCart', { value: (item.price ?? 0) * (item.quantity ?? 1), items: [item] });
}

/** Rasmiylashtirish boshlandi. */
export function trackInitiateCheckout(value: number, items: PixelItem[]): void {
  send('InitiateCheckout', { value, items });
}

/** To'lov usuli tanlandi. */
export function trackAddPaymentInfo(value: number): void {
  send('AddPaymentInfo', { value });
}

/**
 * Lead — mijoz o'z aloqa ma'lumotlarini qoldirdi.
 *
 * QAYERDA ISHLASHI muhim. Lead formaning YONIDA emas, forma
 * TO'LDIRILGANDAN KEYIN ishlashi kerak — ya'ni natija paytida. Bizda
 * alohida «rahmat» sahifasi yo'q, chunki checkout bitta sahifada
 * ketadi; shuning uchun hodisa kontakt bosqichi muvaffaqiyatli
 * yakunlangan paytda yuboriladi.
 *
 * `key` — takrorlanmaslik uchun. Mijoz orqaga qaytib, kontakt
 * bosqichini qayta ochsa, Lead ikki marta hisoblanmasligi kerak.
 */
export function trackLead(key: string, value?: number): void {
  if (!firstTime(`alv.lead.${key}`)) return;
  send('Lead', { value, eventId: `lead-${key}` });
}

/**
 * Xarid yakunlandi.
 *
 * `orderId` majburiy: takrorlanmaslik belgisi ham, Facebook uchun
 * `eventID` ham shundan olinadi.
 */
export function trackPurchase(orderId: string, value: number, items: PixelItem[]): void {
  if (!firstTime(`alv.purchase.${orderId}`)) return;
  send('Purchase', { value, items, eventId: `order-${orderId}` });
}
