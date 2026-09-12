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
 * Bo'sh sahifa ko'rsatishdan ko'ra eski aloqa ma'lumotini ko'rsatgan
 * afzal: mijozga bog'lanish uchun biror yo'l qolishi kerak.
 */
const FALLBACK: StoreSettings = {
  name: 'ALIVER.UZ',
  legalName: null,
  tin: null,
  phone: '+998 71 200 00 00',
  telegram: '@aliver_uz',
  email: 'info@aliver.uz',
  workHours: '9:00–20:00',
  addressUz: null,
  addressRu: null,
};

function clean(v: string | null | undefined): string | null {
  const s = (v ?? '').trim();
  return s === '' ? null : s;
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
      // Bo'sh sozlama — bu «ko'rsatma» degani emas, «hali to'ldirilmagan»
      // degani. Shuning uchun standart qiymatga qaytamiz; manzil esa
      // aksincha — u yo'q bo'lsa blok umuman ko'rinmasligi kerak.
      phone: clean(raw['store.phone']) ?? FALLBACK.phone,
      telegram: clean(raw['store.telegram']) ?? FALLBACK.telegram,
      email: clean(raw['store.email']) ?? FALLBACK.email,
      workHours: clean(raw['store.workHours']) ?? FALLBACK.workHours,
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
