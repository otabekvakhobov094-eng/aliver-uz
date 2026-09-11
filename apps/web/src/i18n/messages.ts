/**
 * Interfeys matnlari. MVP da UZ va RU (TZ 4).
 * Mahsulot nomlari va tavsiflari bazadan keladi, bu yerda faqat interfeys.
 */
export const LOCALES = ['uz', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'uz';

export const messages = {
  uz: {
    'nav.catalog': 'Mahsulotlar',
    'nav.new': 'Yangi',
    'nav.top': 'TOP sotuvlar',
    'nav.sale': 'Aksiyalar',
    'nav.sets': 'To‘plamlar',
    'nav.about': 'ALIVER haqida',
    'auth.title': 'Kirish yoki ro‘yxatdan o‘tish',
    'auth.subtitle':
      'Telefon raqamingizni kiriting — tasdiqlash uchun 5 xonali kod yuboramiz. Parol kerak emas.',
    'auth.phone': 'Telefon raqami',
    'auth.getCode': 'Kodni olish',
    'auth.codeTitle': 'Kodni kiriting',
    'auth.codeSent': '{phone} raqamiga 5 xonali kod yuborildi.',
    'auth.confirm': 'Tasdiqlash',
    'auth.changePhone': 'Raqamni o‘zgartirish',
    'auth.resendIn': 'Qayta yuborish — {seconds} s',
    'auth.resend': 'Kodni qayta yuborish',
    'auth.consent': 'Davom etish orqali ommaviy oferta va maxfiylik siyosatiga rozilik bildirasiz.',
    'auth.limitHint':
      'Bir raqamga sutkasiga 5 tagacha SMS yuboriladi, 5 marta xato kiritilsa kod bekor qilinadi.',
    'common.error': 'Xatolik yuz berdi. Qaytadan urinib ko‘ring.',
    'common.loading': 'Yuklanmoqda…',
  },
  ru: {
    'nav.catalog': 'Товары',
    'nav.new': 'Новинки',
    'nav.top': 'Хиты продаж',
    'nav.sale': 'Акции',
    'nav.sets': 'Наборы',
    'nav.about': 'Об ALIVER',
    'auth.title': 'Вход или регистрация',
    'auth.subtitle': 'Введите номер телефона — отправим 5-значный код. Пароль не нужен.',
    'auth.phone': 'Номер телефона',
    'auth.getCode': 'Получить код',
    'auth.codeTitle': 'Введите код',
    'auth.codeSent': 'Код отправлен на номер {phone}.',
    'auth.confirm': 'Подтвердить',
    'auth.changePhone': 'Изменить номер',
    'auth.resendIn': 'Отправить снова — {seconds} с',
    'auth.resend': 'Отправить код снова',
    'auth.consent':
      'Продолжая, вы соглашаетесь с публичной офертой и политикой конфиденциальности.',
    'auth.limitHint':
      'На один номер отправляется не более 5 SMS в сутки; после 5 неверных попыток код аннулируется.',
    'common.error': 'Произошла ошибка. Попробуйте ещё раз.',
    'common.loading': 'Загрузка…',
  },
} as const;

export type MessageKey = keyof (typeof messages)['uz'];

export function t(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const raw: string = messages[locale][key] ?? messages.uz[key] ?? key;
  if (!vars) return raw;
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), raw);
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
