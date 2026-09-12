import { apiBase } from './api-base';

/**
 * Do'kon ma'lumotlari — ADMINDAN.
 *
 * NEGA BU FAYL PAYDO BO'LDI. Telefon raqami, Telegram va e-pochta
 * sahifa kodida qo'lda yozilgan edi. Admin panelda sozlama bor edi,
 * u saqlanardi, «1 ta sozlama saqlandi» deb yozardi — va saytda hech
 * narsa o'zgarmasdi, chunki sayt o'sha qiymatni umuman o'qimasdi.
 *
 * Bunday nosozlik hech qayerda xato bermaydi va shuning uchun uzoq
 * yashaydi: xodim raqamni bir necha marta o'zgartirib ko'radi, keyin
 * «admin ishlamayapti» degan xulosaga keladi.
 */

export interface StoreSettings {
  name: string;
  legalName: string | null;
  tin: string | null;
  phone: string | null;
  telegram: string | null;
  email: string | null;
  workHours: string | null;
  addressUz: string | null;
  addressRu: string | null;
}

/**
 * Server javob bermasa ishlatiladigan qiymatlar.
 *
 * TELEFON RAQAMI BU YERDA YO'Q va bu ataylab.
 *
 * Ilgari bu ro'yxatda kodga yozilgan raqam turardi. API uxlab qolgan
 * paytda (Render'ning bepul instansi uyg'onishi bir necha daqiqa
 * oladi) sayt o'sha raqamni ko'rsatardi — ya'ni mijoz do'konga
 * tegishli bo'lmagan raqamga qo'ng'iroq qilardi va buni hech kim
 * bilmasdi. Eski raqamni ko'rsatish «raqam yo'q» dan YOMONROQ.
 *
 * Shuning uchun faqat brend nomi qoladi: aloqa bloki vaqtincha
 * ko'rinmaydi, lekin noto'g'ri ma'lumot ham tarqalmaydi.
 */
const FALLBACK: StoreSettings = {
  name: 'ALIVER.UZ',
  legalName: null,
  tin: null,
  phone: null,
  telegram: null,
  email: null,
  workHours: null,
  addressUz: null,
  addressRu: null,
};

/**
 * Seed'dagi NAMUNA qiymatlar — ular to'ldirilgan hisoblanmaydi.
 *
 * `store.tin` seed'da `[SIZNING STIR]` deb turadi va bo'sh emas,
 * ya'ni oddiy tekshiruvdan o'tib ketardi: «Aloqa» sahifasidagi
 * yuridik ma'lumotlar kartochkasida STIR o'rniga aynan shu matn
 * chiqardi. To'ldirilmagan rekvizitni ko'rsatmaslik — uni
 * kvadrat qavs bilan ko'rsatishdan yaxshi.
 */
const PLACEHOLDER = /^\[.*\]$/;

function clean(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  if (s === '' || PLACEHOLDER.test(s)) return null;
  return s;
}

/**
 * Sozlamalarni o'qish.
 *
 * 60 soniya keshlanadi. Nol bo'lsa har sahifa ochilishida so'rov
 * ketardi; uzoq bo'lsa xodim o'zgarishni ko'rolmay, sozlamani yana
 * o'zgartirishga tushardi — ya'ni aynan tuzatilayotgan muammo boshqa
 * ko'rinishda qaytib kelardi.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const res = await fetch(`${apiBase()}/settings/public`, { next: { revalidate: 60 } });
    if (!res.ok) return FALLBACK;
    const raw = (await res.json()) as Record<string, string | null>;

    return {
      name: clean(raw['store.name']) ?? FALLBACK.name,
      // Yuridik ma'lumotlar TO'LDIRILMAGAN bo'lsa o'rniga hech narsa
      // qo'yilmaydi. O'ylab topilgan STIR yoki nom — soxta rekvizit,
      // va u ishonch uchun emas, aksincha zarar uchun ishlaydi.
      legalName: clean(raw['store.legalName']),
      tin: clean(raw['store.tin']),
      // Sozlama bo'sh bo'lsa blok ko'rsatilmaydi. O'ylab topilgan
      // yoki eski qiymat bilan to'ldirish — mijozni noto'g'ri
      // ma'lumotga yo'naltirish demak.
      phone: clean(raw['store.phone']),
      telegram: clean(raw['store.telegram']),
      email: clean(raw['store.email']),
      workHours: clean(raw['store.workHours']),
      addressUz: clean(raw['store.addressUz']),
      addressRu: clean(raw['store.addressRu']),
    };
  } catch {
    // Tarmoq xatosi sahifani yiqitmasligi kerak: aloqa sahifasi
    // ochilmasa, mijoz bog'lana olmaydi.
    return FALLBACK;
  }
}

/** `tel:` havolasi uchun — faqat raqamlar va boshidagi «+». */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  return `tel:+${digits}`;
}

/** Telegram foydalanuvchi nomi `@` bilan ham, usiz ham kiritilishi mumkin. */
export function telegramHandle(raw: string): { handle: string; href: string } {
  const name = raw.trim().replace(/^@/, '').replace(/^https?:\/\/t\.me\//i, '');
  return { handle: `@${name}`, href: `https://t.me/${name}` };
}
