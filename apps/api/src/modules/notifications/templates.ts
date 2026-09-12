import { formatTiyin } from '../../common/money';

export type Lang = 'uz' | 'ru';

/**
 * Bildirishnoma shablonlari.
 *
 * TZ 68–70 da "mijozga SMS yuboriladi" deyilgan, lekin QAYSI hodisada,
 * QANDAY matn bilan va necha marta — yozilmagan (ekspertiza C-7).
 * Shu fayl aynan shu savolga javob beradi va matnlar bitta joyda turadi:
 * marketolog matnni o'zgartirsa, kod qidirib yurish shart emas.
 *
 * SMS uzunligi muhim: kirill yozuvidagi SMS 70 belgi, lotin 160 belgi.
 * Shuning uchun matnlar qisqa va lotin yozuvida (ruscha ham
 * translitersiz emas — ruscha mijozga ruscha matn ketadi, lekin u
 * ikki qismli SMS bo'lishi mumkin va bu narxda hisobga olinadi).
 */
export type TemplateKey =
  | 'ORDER_CREATED'
  | 'ORDER_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED'
  | 'ORDER_SHIPPED'
  | 'ORDER_SHIPPED_NO_COURIER'
  | 'ORDER_READY_PICKUP'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'REFUND_DONE'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED'
  | 'RETURN_RECEIVED'
  | 'LOYALTY_EXPIRING'
  | 'GIFTCARD_EXPIRING'
  | 'STAFF_NEW_ORDER'
  | 'STAFF_RETURN_REQUESTED'
  | 'STAFF_PAYMENT_FAILED'
  | 'STAFF_LOW_STOCK'
  | 'STAFF_FISCAL_FAILED';

export interface TemplateVars {
  number?: string;
  points?: string;
  tail?: string;
  amount?: string;
  name?: string;
  trackUrl?: string;
  courier?: string;
  courierPhone?: string;
  trackingNo?: string;
  date?: string;
  reason?: string;
  provider?: string;
  product?: string;
  qty?: string;
}

interface TemplateDef {
  uz: string;
  ru: string;
  /** Operatorlar kanaliga ketadigan xabar — mijozga emas. */
  staff?: boolean;
  /**
   * Tranzaksion xabar marketing roziligini talab qilmaydi: mijoz
   * buyurtma bergan, uni holатdan xabardor qilish majburiyatimiz.
   * `marketing: true` bo'lsa — rozilik shart.
   */
  marketing?: boolean;
}

export const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  ORDER_CREATED: {
    uz: 'ALIVER.UZ: {number} buyurtmangiz qabul qilindi. Summa: {amount} so‘m. Kuzatish: {trackUrl}',
    ru: 'ALIVER.UZ: заказ {number} принят. Сумма: {amount} сум. Отслеживание: {trackUrl}',
  },
  ORDER_CONFIRMED: {
    uz: 'ALIVER.UZ: {number} buyurtmangiz tasdiqlandi va tayyorlanmoqda.',
    ru: 'ALIVER.UZ: заказ {number} подтверждён и готовится.',
  },
  PAYMENT_RECEIVED: {
    uz: 'ALIVER.UZ: {number} uchun {amount} so‘m to‘lov qabul qilindi. Rahmat!',
    ru: 'ALIVER.UZ: оплата {amount} сум по заказу {number} получена. Спасибо!',
  },
  PAYMENT_FAILED: {
    uz: 'ALIVER.UZ: {number} uchun to‘lov amalga oshmadi. Qayta urinib ko‘ring: {trackUrl}',
    ru: 'ALIVER.UZ: оплата по заказу {number} не прошла. Попробуйте снова: {trackUrl}',
  },
  ORDER_SHIPPED: {
    uz: 'ALIVER.UZ: {number} buyurtmangiz yo‘lda. Kuryer: {courier}, {courierPhone}',
    ru: 'ALIVER.UZ: заказ {number} в пути. Курьер: {courier}, {courierPhone}',
  },
  /**
   * Kuryer hali biriktirilmagan bo'lsa shu variant ketadi.
   * Aks holda mijoz "Kuryer: —, —" degan xabar olardi.
   */
  ORDER_SHIPPED_NO_COURIER: {
    uz: 'ALIVER.UZ: {number} buyurtmangiz yo‘lda. Kuryer tez orada bog‘lanadi.',
    ru: 'ALIVER.UZ: заказ {number} в пути. Курьер свяжется с вами.',
  },
  ORDER_READY_PICKUP: {
    uz: 'ALIVER.UZ: {number} buyurtmangiz olib ketishga tayyor. Pasport yoki buyurtma raqami bilan keling.',
    ru: 'ALIVER.UZ: заказ {number} готов к самовывозу. Возьмите паспорт или номер заказа.',
  },
  ORDER_DELIVERED: {
    uz: 'ALIVER.UZ: {number} yetkazildi. Sharh qoldirsangiz xursand bo‘lamiz: {trackUrl}',
    ru: 'ALIVER.UZ: заказ {number} доставлен. Будем рады отзыву: {trackUrl}',
  },
  ORDER_CANCELLED: {
    uz: 'ALIVER.UZ: {number} buyurtmangiz bekor qilindi. Sabab: {reason}',
    ru: 'ALIVER.UZ: заказ {number} отменён. Причина: {reason}',
  },
  REFUND_DONE: {
    uz: 'ALIVER.UZ: {number} bo‘yicha {amount} so‘m qaytarildi. Bankka tushishi 1–3 kun oladi.',
    ru: 'ALIVER.UZ: по заказу {number} возвращено {amount} сум. Зачисление 1–3 дня.',
  },

  RETURN_APPROVED: {
    uz: 'ALIVER.UZ: {number} qaytarish so‘rovi tasdiqlandi. Tovarni qadoqda qaytaring.',
    ru: 'ALIVER.UZ: возврат {number} одобрен. Верните товар в упаковке.',
  },
  RETURN_REJECTED: {
    uz: 'ALIVER.UZ: {number} qaytarish so‘rovi rad etildi. Sabab: {reason}',
    ru: 'ALIVER.UZ: возврат {number} отклонён. Причина: {reason}',
  },
  RETURN_RECEIVED: {
    uz: 'ALIVER.UZ: {number} bo‘yicha tovar qabul qilindi. Pul 1–3 kunda qaytariladi.',
    ru: 'ALIVER.UZ: товар по возврату {number} получен. Деньги вернутся за 1–3 дня.',
  },

  /* ---------------------------- Operatorlar ---------------------------- */

  /**
   * Ball kuyishidan oldingi ogohlantirish.
   *
   * Matn TAKLIF emas, XABAR: reklama roziligini talab qilmaslik uchun
   * u mijozning o'z hisobidagi qiymat haqida bo'lishi kerak. «Chegirma
   * bor, keling» degan matn marketing bo'lardi va boshqa rozilik
   * talab qilardi.
   */
  LOYALTY_EXPIRING: {
    uz: 'ALIVER.UZ: {points} bonus balingiz ({amount} so‘m) {date} da kuyadi. Buyurtma bersangiz muddat yangilanadi.',
    ru: 'ALIVER.UZ: {points} бонусных баллов ({amount} сум) сгорят {date}. Новый заказ продлит срок.',
  },
  GIFTCARD_EXPIRING: {
    uz: 'ALIVER.UZ: sovg‘a kartangiz (...{tail}) {date} da tugaydi. Qoldiq: {amount} so‘m.',
    ru: 'ALIVER.UZ: срок подарочной карты (...{tail}) истекает {date}. Остаток: {amount} сум.',
  },

  STAFF_NEW_ORDER: {
    staff: true,
    uz: '🛒 Yangi buyurtma {number}\n{name} · {amount} so‘m\nTo‘lov: {provider}',
    ru: '🛒 Новый заказ {number}\n{name} · {amount} сум\nОплата: {provider}',
  },
  STAFF_RETURN_REQUESTED: {
    staff: true,
    uz: '↩️ Qaytarish so‘rovi: {number}\nSabab: {reason} · {amount} so‘m',
    ru: '↩️ Запрос на возврат: {number}\nПричина: {reason} · {amount} сум',
  },
  STAFF_PAYMENT_FAILED: {
    staff: true,
    uz: '⚠️ To‘lov amalga oshmadi: {number}\nSabab: {reason}',
    ru: '⚠️ Оплата не прошла: {number}\nПричина: {reason}',
  },
  STAFF_LOW_STOCK: {
    staff: true,
    uz: '📦 Qoldiq kam: {product} — {qty} dona qoldi',
    ru: '📦 Мало на складе: {product} — осталось {qty}',
  },
  STAFF_FISCAL_FAILED: {
    staff: true,
    uz: '🧾 Fiskal chek berilmadi: {number}\nSabab: {reason}',
    ru: '🧾 Фискальный чек не выдан: {number}\nПричина: {reason}',
  },
};

/** Buyurtma holati -> mijozga yuboriladigan shablon. */
export const STATUS_TEMPLATE: Record<string, TemplateKey | null> = {
  NEW: 'ORDER_CREATED',
  CONFIRMED: 'ORDER_CONFIRMED',
  PROCESSING: null, // ichki bosqich, mijozga qiziq emas
  PACKING: null,
  READY: 'ORDER_READY_PICKUP',
  SHIPPED: 'ORDER_SHIPPED',
  DELIVERED: 'ORDER_DELIVERED',
  CANCELLED: 'ORDER_CANCELLED',
  RETURN_REQUESTED: null,
  RETURNED: null,
  REFUNDED: 'REFUND_DONE',
};

/**
 * Shablonni to'ldiradi.
 *
 * To'ldirilmagan o'zgaruvchi matnda `{courier}` bo'lib qolmasligi kerak —
 * bo'sh qiymat o'rniga tire qo'yiladi.
 */
export function render(key: TemplateKey, lang: Lang, vars: TemplateVars): string {
  const def = TEMPLATES[key];
  const raw = lang === 'ru' ? def.ru : def.uz;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = (vars as Record<string, string | undefined>)[name];
    return value !== undefined && value !== '' ? value : '—';
  });
}

export function isStaffTemplate(key: TemplateKey): boolean {
  return TEMPLATES[key].staff === true;
}

export function isMarketingTemplate(key: TemplateKey): boolean {
  return TEMPLATES[key].marketing === true;
}

/**
 * SMS narxi belgilar soniga bog'liq: kirill yozuvida bitta SMS 70 belgi,
 * lotin yozuvida 160. Bu funksiya xabar necha SMS bo'lishini aytadi —
 * admin panelda ko'rinadi va uzun matn yozib qo'yishning oldini oladi.
 */
export function smsParts(text: string): {
  parts: number;
  encoding: 'GSM7' | 'UCS2';
  length: number;
} {
  // Lotin bo'lmagan belgi bo'lsa — UCS-2 (kirill, emoji).
  const isGsm = /^[\x20-\x7E\n\r€£¥èéùìòÇØøÅåÆæßÉÑÜàäöñüà§¿¡]*$/.test(text);
  const length = text.length;

  if (isGsm) {
    if (length <= 160) return { parts: 1, encoding: 'GSM7', length };
    return { parts: Math.ceil(length / 153), encoding: 'GSM7', length };
  }
  if (length <= 70) return { parts: 1, encoding: 'UCS2', length };
  return { parts: Math.ceil(length / 67), encoding: 'UCS2', length };
}

/** Summani shablon uchun formatlaydi. */
export function amountVar(tiyin: bigint | string): string {
  return formatTiyin(typeof tiyin === 'bigint' ? tiyin : BigInt(tiyin));
}
