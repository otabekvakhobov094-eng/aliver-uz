/**
 * Sozlamalar ta'riflari — TZ-2, 4.10-bo'lim.
 *
 * `Setting` jadvali kalit/qiymat juftligi, ya'ni o'zi hech narsa
 * tushuntirmaydi. Agar admin panel shu jadvalni xom holda ko'rsatsa,
 * natija JSON muharriri bo'ladi: xodim `returns.refundShipping` ga
 * nima yozish mumkinligini bilmaydi va bir kun kelib `"true"` yozib
 * qaytarish hisobini buzadi.
 *
 * Shuning uchun har bir kalit shu yerda ta'riflanadi: turi, guruhi,
 * o'zbekcha nomi, izohi va ruxsat etilgan qiymatlari. UI shu ta'rifdan
 * to'g'ri boshqaruv elementini chizadi, API esa shu ta'rif bo'yicha
 * tekshiradi. Ro'yxatda yo'q kalitni yozib bo'lmaydi.
 */

export type SettingType = 'string' | 'number' | 'boolean' | 'enum' | 'stringList';

export interface SettingDef {
  key: string;
  group: string;
  label: string;
  /** Nega kerakligi — xodim uchun, dasturchi uchun emas. */
  help?: string;
  type: SettingType;
  /** `enum` uchun ruxsat etilgan qiymatlar va ularning nomlari. */
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  /** O'lchov birligi: "kun", "daqiqa", "%". */
  unit?: string;
  /**
   * Faqat SUPER_ADMIN O'ZGARTIRA oladigan sozlama.
   *
   * Bu KO'RSATISH bilan bog'liq emas. STIR shunga misol: uni har
   * qanday xodim o'zgartira olmasligi kerak, lekin u fiskal chekda
   * ham, saytda ham ochiq turadi. Ikkita tushunchani bitta maydonga
   * yig'ish aynan shu yerda xatoga olib boradi.
   */
  sensitive?: boolean;
  /**
   * Saytda KO'RINADIGAN sozlama.
   *
   * Bu maydon ataylab OQ RO'YXAT: sozlama ochiq API ga faqat shu yerda
   * `true` deb belgilangandagina chiqadi. Teskarisi (nozik bo'lmaganini
   * ochiq deb hisoblash) xavfli — yangi kalit qo'shilganda u jimgina
   * saytga chiqib ketardi.
   */
  publicOnSite?: boolean;
}

export const SETTING_GROUPS: Array<{ key: string; label: string; help?: string }> = [
  { key: 'store', label: 'Do‘kon', help: 'Nom, aloqa va yuridik ma’lumotlar' },
  { key: 'orders', label: 'Buyurtmalar' },
  { key: 'inventory', label: 'Ombor' },
  { key: 'returns', label: 'Qaytarish' },
  { key: 'discounts', label: 'Chegirmalar' },
  { key: 'fiscal', label: 'Fiskal chek' },
  { key: 'payments', label: 'To‘lovlar' },
  { key: 'notify', label: 'Bildirishnomalar' },
  { key: 'cart', label: 'Savat' },
];

export const SETTING_DEFS: SettingDef[] = [
  // ------------------------------- Do'kon -------------------------------
  { key: 'store.name', group: 'store', label: 'Do‘kon nomi', type: 'string', publicOnSite: true },
  {
    key: 'store.legalName',
    group: 'store',
    label: 'Yuridik nom',
    help: 'Hujjatlarda, fiskal chekda va saytdagi «Aloqa» sahifasida ko‘rinadi',
    type: 'string',
    publicOnSite: true,
  },
  {
    key: 'store.tin',
    group: 'store',
    label: 'STIR',
    help: 'Soliq to‘lovchining identifikatsiya raqami — fiskal chek uchun shart',
    type: 'string',
    sensitive: true,
    // Saytda ham ko'rsatiladi: O'zbekiston bozorida onlayn do'konga
    // ishonchning eng oddiy belgisi — mijoz kim bilan ish ko'rayotganini
    // bilishi. O'zgartirishga esa faqat Super Admin haqli.
    publicOnSite: true,
  },
  {
    key: 'store.phone',
    group: 'store',
    label: 'Telefon',
    help: 'Saytdagi «Aloqa» sahifasida va footerda ko‘rinadi',
    type: 'string',
    publicOnSite: true,
  },
  {
    key: 'store.telegram',
    group: 'store',
    label: 'Telegram',
    help: '@ bilan yoki usiz. Saytda havola bo‘lib chiqadi.',
    type: 'string',
    publicOnSite: true,
  },
  {
    key: 'store.email',
    group: 'store',
    label: 'E-pochta',
    help: 'Hamkorlik va rasmiy murojaatlar uchun',
    type: 'string',
    publicOnSite: true,
  },
  {
    key: 'store.workHours',
    group: 'store',
    label: 'Ish vaqti',
    help: 'Masalan: 9:00–20:00. Telefon ostida ko‘rsatiladi.',
    type: 'string',
    publicOnSite: true,
  },
  {
    key: 'store.addressUz',
    group: 'store',
    label: 'Manzil (o‘zbekcha)',
    help: 'Bo‘sh qoldirilsa saytda manzil bloki umuman ko‘rinmaydi',
    type: 'string',
    publicOnSite: true,
  },
  {
    key: 'store.addressRu',
    group: 'store',
    label: 'Manzil (ruscha)',
    type: 'string',
    publicOnSite: true,
  },
  {
    key: 'store.currency',
    group: 'store',
    label: 'Valyuta',
    help: 'Hozircha faqat so‘m. O‘zgartirish narxlarni qayta hisoblashni talab qiladi.',
    type: 'enum',
    options: [{ value: 'UZS', label: 'So‘m (UZS)' }],
    sensitive: true,
  },
  {
    key: 'store.timezone',
    group: 'store',
    label: 'Vaqt mintaqasi',
    help: 'Hisobotlardagi “bugun” shu mintaqa bo‘yicha hisoblanadi',
    type: 'enum',
    options: [{ value: 'Asia/Tashkent', label: 'Toshkent (UTC+5)' }],
  },
  {
    key: 'store.locales',
    group: 'store',
    label: 'Tillar',
    help: 'Saytda mavjud tillar',
    type: 'stringList',
  },
  {
    key: 'store.defaultLocale',
    group: 'store',
    label: 'Asosiy til',
    help: 'Tarjima topilmasa shu tilga qaytadi',
    type: 'enum',
    options: [
      { value: 'UZ', label: 'O‘zbekcha' },
      { value: 'RU', label: 'Ruscha' },
    ],
  },

  // ----------------------------- Buyurtmalar -----------------------------
  {
    key: 'orders.codRequiresOtp',
    group: 'orders',
    label: 'Naqd to‘lovda SMS tasdiq',
    help: 'Soxta buyurtmalarga qarshi asosiy to‘siq. O‘chirsangiz kuryer bekorga yo‘lga chiqadi.',
    type: 'boolean',
  },

  // -------------------------------- Ombor --------------------------------
  {
    key: 'inventory.reservationTtlMinutes',
    group: 'inventory',
    label: 'Rezerv muddati',
    help: 'Savatdagi tovar shu vaqt band turadi, keyin bo‘shaydi. Juda uzun bo‘lsa ombor bo‘sh ko‘rinadi, juda qisqa bo‘lsa mijoz to‘lov paytida tovarni yo‘qotadi.',
    type: 'number',
    min: 5,
    max: 240,
    unit: 'daqiqa',
  },
  {
    key: 'inventory.lowStockThreshold',
    group: 'inventory',
    label: 'Kam qoldiq chegarasi',
    help: 'Shu sondan past qolgan mahsulot Dashboard’da ogohlantiradi',
    type: 'number',
    min: 0,
    max: 1000,
    unit: 'dona',
  },

  // ------------------------------ Qaytarish ------------------------------
  {
    key: 'returns.windowDays',
    group: 'returns',
    label: 'Qaytarish muddati',
    help: 'Yetkazilgan paytdan boshlab hisoblanadi',
    type: 'number',
    min: 1,
    max: 90,
    unit: 'kun',
  },
  {
    key: 'returns.acceptOpened',
    group: 'returns',
    label: 'Ochilgan mahsulotni qabul qilish',
    help: 'Sifatli kosmetika ochilgan bo‘lsa qonun bo‘yicha qaytarilmaydi. Nuqsonli tovar bu sozlamadan qat’i nazar qaytariladi.',
    type: 'boolean',
    sensitive: true,
  },
  {
    key: 'returns.refundShipping',
    group: 'returns',
    label: 'Yetkazish narxini qaytarish',
    type: 'enum',
    options: [
      { value: 'never', label: 'Hech qachon' },
      { value: 'ourFaultOnly', label: 'Faqat bizning aybimizda' },
      { value: 'always', label: 'Har doim' },
    ],
  },

  // ------------------------------ Chegirmalar ------------------------------
  {
    key: 'discounts.maxTotalPercent',
    group: 'discounts',
    label: 'Maksimal umumiy chegirma',
    help: 'Barcha chegirmalar yig‘indisi shu foizdan oshmaydi. Bu “ikkita kod qo‘shib 90% chegirma” hodisasidan himoya qiladi.',
    type: 'number',
    min: 0,
    max: 100,
    unit: '%',
    sensitive: true,
  },
  {
    key: 'discounts.allowStacking',
    group: 'discounts',
    label: 'Chegirmalarni birlashtirish',
    help: 'Yoqilsa bir buyurtmada bir nechta chegirma birga ishlaydi',
    type: 'boolean',
    sensitive: true,
  },

  // ------------------------------ Fiskal chek ------------------------------
  {
    key: 'fiscal.shippingIkpu',
    group: 'fiscal',
    label: 'Yetkazish xizmatining IKPU kodi',
    help: 'Fiskal chekka tushadi. Buxgalter tasdiqlagan kod bo‘lishi shart — noto‘g‘ri kod chekni rad ettiradi.',
    type: 'string',
    sensitive: true,
  },
  {
    key: 'fiscal.shippingVatRate',
    group: 'fiscal',
    label: 'Yetkazish QQS stavkasi',
    type: 'number',
    min: 0,
    max: 30,
    unit: '%',
    sensitive: true,
  },

  // ------------------------------- To'lovlar -------------------------------
  {
    key: 'payments.reconcileDefaultDays',
    group: 'payments',
    label: 'Moslashtirish davri',
    help: 'Moslashtirish hisoboti standart necha kunni oladi',
    type: 'number',
    min: 1,
    max: 90,
    unit: 'kun',
  },

  // --------------------------- Bildirishnomalar ---------------------------
  {
    key: 'notify.quietFrom',
    group: 'notify',
    label: 'Tinch vaqt boshlanishi',
    help: 'Shu soatdan keyin mijozga SMS yuborilmaydi (mahalliy vaqt)',
    type: 'number',
    min: 0,
    max: 23,
    unit: 'soat',
  },
  {
    key: 'notify.quietTo',
    group: 'notify',
    label: 'Tinch vaqt tugashi',
    type: 'number',
    min: 0,
    max: 23,
    unit: 'soat',
  },
  {
    key: 'notify.lowStockThreshold',
    group: 'notify',
    label: 'Operatorga ogohlantirish chegarasi',
    help: 'Qoldiq shu sondan pastga tushsa operatorlar kanaliga xabar boradi',
    type: 'number',
    min: 0,
    max: 1000,
    unit: 'dona',
  },

  // --------------------------------- Savat ---------------------------------
  {
    key: 'cart.ttlDays',
    group: 'cart',
    label: 'Savat saqlanish muddati',
    help: 'Shu muddatdan keyin tashlab ketilgan savat tozalanadi',
    type: 'number',
    min: 1,
    max: 365,
    unit: 'kun',
  },
];

export const SETTING_DEF_BY_KEY = new Map(SETTING_DEFS.map((d) => [d.key, d]));

/**
 * Qiymatni ta'rif bo'yicha tekshiradi va normal holatga keltiradi.
 * Xato bo'lsa sababini o'zbekcha qaytaradi — xabar to'g'ridan-to'g'ri
 * admin panelda maydon yonida ko'rsatiladi.
 */
export function validateSetting(
  def: SettingDef,
  raw: unknown,
): { ok: true; value: unknown } | { ok: false; error: string } {
  switch (def.type) {
    case 'string': {
      if (typeof raw !== 'string') return { ok: false, error: 'Matn bo‘lishi kerak' };
      const value = raw.trim();
      if (value === '') return { ok: false, error: 'Bo‘sh qoldirib bo‘lmaydi' };
      return { ok: true, value };
    }
    case 'number': {
      const value = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(value)) return { ok: false, error: 'Raqam bo‘lishi kerak' };
      if (!Number.isInteger(value)) return { ok: false, error: 'Butun son bo‘lishi kerak' };
      if (def.min !== undefined && value < def.min) {
        return { ok: false, error: `Eng kami ${def.min}${def.unit ? ' ' + def.unit : ''}` };
      }
      if (def.max !== undefined && value > def.max) {
        return { ok: false, error: `Eng ko‘pi ${def.max}${def.unit ? ' ' + def.unit : ''}` };
      }
      return { ok: true, value };
    }
    case 'boolean': {
      if (typeof raw !== 'boolean') return { ok: false, error: 'Ha yoki yo‘q bo‘lishi kerak' };
      return { ok: true, value: raw };
    }
    case 'enum': {
      const allowed = (def.options ?? []).map((o) => o.value);
      if (typeof raw !== 'string' || !allowed.includes(raw)) {
        return { ok: false, error: `Ruxsat etilgan qiymatlar: ${allowed.join(', ')}` };
      }
      return { ok: true, value: raw };
    }
    case 'stringList': {
      if (!Array.isArray(raw) || raw.some((v) => typeof v !== 'string')) {
        return { ok: false, error: 'Matnlar ro‘yxati bo‘lishi kerak' };
      }
      const value = (raw as string[]).map((v) => v.trim()).filter((v) => v !== '');
      if (value.length === 0) return { ok: false, error: 'Kamida bitta qiymat kerak' };
      return { ok: true, value };
    }
  }
}

/**
 * Saytga chiqadigan kalitlar.
 *
 * Ro'yxat ta'riflardan HISOBLANADI, qo'lda yozilmaydi: ikkita ro'yxat
 * bo'lganda ular albatta bir-biridan uzoqlashadi va natija jimgina
 * noto'g'ri bo'ladi — yo sozlama saytga chiqmaydi, yo chiqmasligi
 * kerak bo'lgani chiqib ketadi.
 */
export const PUBLIC_SETTING_KEYS: string[] = SETTING_DEFS.filter((d) => d.publicOnSite).map(
  (d) => d.key,
);
