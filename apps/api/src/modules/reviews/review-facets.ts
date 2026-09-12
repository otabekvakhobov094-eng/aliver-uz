/**
 * Sharh atributlari va ularning yorliqlari — TZ-3.
 *
 * Ataylab Prisma dan mustaqil: bu ro'yxat API da ham, testda ham, va
 * (yorliqlar orqali) interfeysda ham bir xil bo'lishi kerak.
 *
 * Baymard tadqiqoti go'zallik sohasida ko'rsatgan asosiy narsa: sharhning
 * foydaliligi uni YOZGAN odam mijozga qanchalik o'xshashligiga bog'liq.
 * «5 yulduz, zo'r» quruq terili odamga hech narsa bermaydi; «quruq teri,
 * 35+, qishda ham yetarli namlaydi» esa qaror qildiradi.
 */

export const SKIN_TYPES = ['NORMAL', 'DRY', 'OILY', 'COMBINATION', 'SENSITIVE'] as const;
export const HAIR_TYPES = ['STRAIGHT', 'WAVY', 'CURLY', 'COILY'] as const;
export const AGE_BANDS = ['UNDER_25', 'FROM_25_TO_34', 'FROM_35_TO_44', 'OVER_45'] as const;

export type SkinType = (typeof SKIN_TYPES)[number];
export type HairType = (typeof HAIR_TYPES)[number];
export type AgeBand = (typeof AGE_BANDS)[number];

export const SKIN_LABEL: Record<SkinType, { uz: string; ru: string }> = {
  NORMAL: { uz: 'Normal teri', ru: 'Нормальная кожа' },
  DRY: { uz: 'Quruq teri', ru: 'Сухая кожа' },
  OILY: { uz: 'Yog‘li teri', ru: 'Жирная кожа' },
  COMBINATION: { uz: 'Aralash teri', ru: 'Комбинированная кожа' },
  SENSITIVE: { uz: 'Sezgir teri', ru: 'Чувствительная кожа' },
};

export const HAIR_LABEL: Record<HairType, { uz: string; ru: string }> = {
  STRAIGHT: { uz: 'To‘g‘ri soch', ru: 'Прямые волосы' },
  WAVY: { uz: 'To‘lqinsimon soch', ru: 'Волнистые волосы' },
  CURLY: { uz: 'Jingalak soch', ru: 'Кудрявые волосы' },
  COILY: { uz: 'Mayda jingalak', ru: 'Очень кудрявые' },
};

/** Aniq yosh so'ralmaydi — u shaxsiy ma'lumot. */
export const AGE_LABEL: Record<AgeBand, { uz: string; ru: string }> = {
  UNDER_25: { uz: '25 gacha', ru: 'до 25' },
  FROM_25_TO_34: { uz: '25–34', ru: '25–34' },
  FROM_35_TO_44: { uz: '35–44', ru: '35–44' },
  OVER_45: { uz: '45+', ru: '45+' },
};

export function isSkinType(v: unknown): v is SkinType {
  return typeof v === 'string' && (SKIN_TYPES as readonly string[]).includes(v);
}
export function isHairType(v: unknown): v is HairType {
  return typeof v === 'string' && (HAIR_TYPES as readonly string[]).includes(v);
}
export function isAgeBand(v: unknown): v is AgeBand {
  return typeof v === 'string' && (AGE_BANDS as readonly string[]).includes(v);
}

export interface ReviewRowLike {
  rating: number;
  skinType: string | null;
  hairType: string | null;
  ageBand: string | null;
  mediaUrls: string[];
  isVerified: boolean;
}

export interface FacetBucket {
  value: string;
  count: number;
}

export interface ReviewSummary {
  count: number;
  avg: number;
  /** 1..5 yulduz bo'yicha taqsimot. */
  stars: Record<number, number>;
  skin: FacetBucket[];
  hair: FacetBucket[];
  age: FacetBucket[];
  withPhoto: number;
  verified: number;
}

/**
 * Xulosani BARCHA tasdiqlangan sharhlardan hisoblaydi — filtrlangan
 * qismdan emas.
 *
 * Bu muhim: fasetdagi son «shu filtrni qo'ysam nechta qoladi» degan
 * savolga javob berishi kerak. Agar u filtrlangan ro'yxatdan
 * hisoblansa, «quruq teri» ni tanlagan zahoti qolgan hamma faset nolga
 * tushib qolardi va mijoz filtrni almashtira olmay qolardi.
 */
export function summarise(rows: ReviewRowLike[]): ReviewSummary {
  const stars: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const skin = new Map<string, number>();
  const hair = new Map<string, number>();
  const age = new Map<string, number>();
  let withPhoto = 0;
  let verified = 0;
  let total = 0;

  for (const r of rows) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    stars[star] = (stars[star] ?? 0) + 1;
    total += star;
    if (r.skinType) skin.set(r.skinType, (skin.get(r.skinType) ?? 0) + 1);
    if (r.hairType) hair.set(r.hairType, (hair.get(r.hairType) ?? 0) + 1);
    if (r.ageBand) age.set(r.ageBand, (age.get(r.ageBand) ?? 0) + 1);
    if (r.mediaUrls.length > 0) withPhoto += 1;
    if (r.isVerified) verified += 1;
  }

  // Tartib e'lon qilingan ro'yxat bo'yicha, sanoq bo'yicha emas:
  // fasetlar sahifa yangilanganda joyini o'zgartirmasligi kerak.
  const ordered = (m: Map<string, number>, order: readonly string[]): FacetBucket[] =>
    order.filter((v) => (m.get(v) ?? 0) > 0).map((v) => ({ value: v, count: m.get(v)! }));

  return {
    count: rows.length,
    // Bitta kasrgacha — «4.6» o'qiladi, «4.5714285714» esa yo'q.
    avg: rows.length === 0 ? 0 : Math.round((total / rows.length) * 10) / 10,
    stars,
    skin: ordered(skin, SKIN_TYPES),
    hair: ordered(hair, HAIR_TYPES),
    age: ordered(age, AGE_BANDS),
    withPhoto,
    verified,
  };
}

export interface ReviewFilter {
  rating?: number;
  skinType?: SkinType;
  hairType?: HairType;
  ageBand?: AgeBand;
  withPhoto?: boolean;
  verifiedOnly?: boolean;
}

/**
 * Filtrlash. Atributi BO'SH sharh atribut filtri qo'yilganda chiqmaydi —
 * va bu to'g'ri: «quruq teri» ni tanlagan mijoz teri turi noma'lum
 * odamning sharhini emas, aynan quruq terilinikini so'rayapti.
 */
export function applyFilter<T extends ReviewRowLike>(rows: T[], f: ReviewFilter): T[] {
  return rows.filter((r) => {
    if (f.rating !== undefined && Math.round(r.rating) !== f.rating) return false;
    if (f.skinType && r.skinType !== f.skinType) return false;
    if (f.hairType && r.hairType !== f.hairType) return false;
    if (f.ageBand && r.ageBand !== f.ageBand) return false;
    if (f.withPhoto && r.mediaUrls.length === 0) return false;
    if (f.verifiedOnly && !r.isVerified) return false;
    return true;
  });
}
