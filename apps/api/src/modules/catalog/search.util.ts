/**
 * Qidiruv matnini normallashtirish.
 *
 * O'zbekiston bozorida mijoz so'rovni uch xil yozadi:
 *   "shampun"  — lotin
 *   "шампунь"  — kirill
 *   "shampun'" — apostrof bilan
 * Uchalasi ham bir xil natijani berishi kerak, aks holda konversiya tushadi.
 * Ekspertiza B-14 bandi.
 *
 * Yechim: hamma narsa lotinning soddalashtirilgan ko'rinishiga keltiriladi,
 * mahsulotda esa oldindan hisoblangan `searchText` saqlanadi. Solishtirish
 * shu ikki normallashtirilgan matn orasida boradi.
 */

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'x',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sh',
  ъ: '',
  ы: 'i',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  // O'zbek kirill alifbosining qo'shimcha harflari
  ў: 'o',
  қ: 'q',
  ғ: 'g',
  ҳ: 'h',
};

/** Apostrofning barcha ko'rinishlari: o‘, o', oʻ, o` */
const APOSTROPHES = /[‘’'`ʻʼ´]/g;

export function normalizeSearch(input: string): string {
  if (!input) return '';
  let out = '';
  const lower = input.toLowerCase().replace(APOSTROPHES, '');

  for (const ch of lower) {
    const mapped = CYRILLIC_MAP[ch];
    out += mapped !== undefined ? mapped : ch;
  }

  return out
    .replace(/[^a-z0-9\s-]/g, ' ') // qolgan belgilar bo'shliqqa
    .replace(/\s+/g, ' ')
    .trim();
}

/** So'rovni so'zlarga ajratadi; juda qisqa bo'laklar tashlab yuboriladi. */
export function searchTokens(query: string, minLength = 2): string[] {
  return normalizeSearch(query)
    .split(' ')
    .filter((w) => w.length >= minLength);
}

/**
 * Mahsulot uchun qidiruv matnini yig'adi.
 * Bu qiymat `Product.searchText` ga yoziladi va trigram indeks bilan qidiriladi.
 */
export function buildProductSearchText(parts: {
  nameUz: string;
  nameRu: string;
  nameEn?: string | null;
  brand?: string | null;
  skus?: string[];
  barcodes?: (string | null)[];
  tags?: string[];
  ingredientsUz?: string | null;
  ingredientsRu?: string | null;
}): string {
  const chunks = [
    parts.nameUz,
    parts.nameRu,
    parts.nameEn ?? '',
    parts.brand ?? '',
    ...(parts.skus ?? []),
    ...((parts.barcodes ?? []).filter(Boolean) as string[]),
    ...(parts.tags ?? []),
    parts.ingredientsUz ?? '',
    parts.ingredientsRu ?? '',
  ];

  const normalized = chunks
    .map((c) => normalizeSearch(String(c)))
    .filter((c) => c.length > 0)
    .join(' ');

  // Dublikat so'zlarni olib tashlaymiz — indeks kichikroq bo'ladi.
  return [...new Set(normalized.split(' '))].join(' ');
}

/**
 * Levenshtein masofasi — imlo xatosiga chidamlilik uchun.
 * Postgres pg_trgm asosiy ish bajaradi; bu funksiya avtoto'ldirish
 * natijalarini tartiblashda va testlarda ishlatiladi.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = curr;
  }
  return prev[b.length]!;
}

/** Ikki matn qanchalik yaqin: 0 (umuman boshqa) .. 1 (bir xil). */
export function similarity(a: string, b: string): number {
  const x = normalizeSearch(a);
  const y = normalizeSearch(b);
  if (!x && !y) return 1;
  const max = Math.max(x.length, y.length);
  if (max === 0) return 1;
  return 1 - levenshtein(x, y) / max;
}
