import { apiBase } from './api-base';

/**
 * Serverdan o'qish — uyg'onishni hisobga olib.
 *
 * NEGA. Render'ning bepul servisi 15 daqiqa trafiksiz qolsa uxlaydi.
 * Uyg'onguncha proksi 502 qaytaradi. Bu XATO EMAS, HOLAT: bir necha
 * soniyadan keyin o'zi o'tadi. Ilgari birinchi so'rov yiqilgani uchun
 * uxlab qolgan servisga kirgan BIRINCHI mijoz «Katalog yuklanmadi»
 * ekranini ko'rardi — va u mijozning aybi bo'lmagan filtrni
 * ayblardi.
 *
 * Shuning uchun 502/503/504 va tarmoq uzilishi qayta urinishga
 * arziydi, 400/404 esa — yo'q: ular qayta urinishdan o'zgarmaydi.
 */

/** API hali ko'tarilmagan. Xato emas — holat. */
export class ApiAsleepError extends Error {
  constructor(readonly status: number | null) {
    super('API javob bermayapti');
    this.name = 'ApiAsleepError';
  }
}

const WAKING = new Set([502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function serverGet<T>(path: string, revalidate = 120): Promise<T> {
  let lastStatus: number | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await sleep(attempt * 1500);

    let res: Response;
    try {
      res = await fetch(`${apiBase()}${path}`, { next: { revalidate } });
    } catch {
      lastStatus = null;
      continue;
    }

    if (res.ok) return (await res.json()) as T;

    if (WAKING.has(res.status)) {
      lastStatus = res.status;
      continue;
    }

    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `API xatosi: ${res.status}`);
  }

  throw new ApiAsleepError(lastStatus);
}

/**
 * Ro'yxat kutilgan joyda — HAR DOIM ro'yxat.
 *
 * NEGA. Web va API alohida deploy qilinadi: yangi sayt bir necha
 * daqiqa eski API bilan ishlashi mumkin, uxlab qolgan servis esa
 * JSON o'rniga proksi xato sahifasini qaytaradi. Shunda
 * `categories.map(...)` butun sahifani 500 ga aylantiradi va mijoz
 * «Sayt vaqtincha ishlamayapti» degan ekranni ko'radi — bitta blok
 * o'rniga BUTUN sahifa yo'qoladi.
 *
 * Kutilmagan javob — bo'sh ro'yxat: shu blok chizilmaydi, qolgan
 * sahifa ochiq qoladi. Bu tekshiruv `catalog/facets` da allaqachon
 * bor edi; qolgan ro'yxatlarda esa yo'q edi.
 */
export async function serverList<T>(path: string, revalidate = 120): Promise<T[]> {
  try {
    const raw = await serverGet<unknown>(path, revalidate);
    return Array.isArray(raw) ? (raw as T[]) : [];
  } catch {
    return [];
  }
}

/** Kutilmagan javob — bo'sh ro'yxat. `serverList` ning sinxron ko'rinishi. */
export function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
