import Link from 'next/link';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import type { Locale } from '@/i18n/messages';

/**
 * 404 ko'rinishi — ikkala `not-found.tsx` uchun bitta joyda.
 *
 * Next.js da ikkita 404 bor va ular BOSHQA-BOSHQA hollarda ishlaydi:
 *
 *   — `app/[locale]/not-found.tsx` — sahifa `notFound()` chaqirganda
 *     (masalan mavjud bo'lmagan mahsulot slug'i);
 *   — `app/not-found.tsx` — manzil UMUMAN hech qaysi route'ga mos
 *     kelmaganda. Noto'g'ri yozilgan havola aynan shu yerga tushadi,
 *     ya'ni odamlar ko'proq shu ikkinchisini ko'radi.
 *
 * Ilgari faqat birinchisi tuzatilgan edi. Ikkinchisi esa umuman
 * uslubsiz chiqardi — oq fon, seriflik shrift, ko'k tagi chizilgan
 * havolalar. Bu sayt emas, xato sahifasiga o'xshardi.
 */
export function NotFoundView({ locale }: { locale: Locale }) {
  const ru = locale === 'ru';

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ paddingTop: 64, paddingBottom: 80 }}>
        <div style={{ maxWidth: 460, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--alv-font-display)',
              fontSize: 64,
              fontWeight: 400,
              letterSpacing: '-0.05em',
              color: 'var(--alv-brand)',
              lineHeight: 1,
            }}
            aria-hidden
          >
            404
          </div>
          <h1
            style={{
              fontFamily: 'var(--alv-font-display)',
              fontSize: 24,
              margin: '16px 0 10px',
              letterSpacing: '-0.03em',
            }}
          >
            {ru ? 'Страница не найдена' : 'Sahifa topilmadi'}
          </h1>
          <p style={{ color: 'var(--alv-muted)', lineHeight: 1.6, margin: '0 0 24px' }}>
            {ru
              ? 'Возможно, ссылка устарела или адрес набран с ошибкой. Воспользуйтесь поиском или меню выше.'
              : 'Ehtimol havola eskirgan yoki manzil noto‘g‘ri yozilgan. Yuqoridagi qidiruv yoki menyudan foydalaning.'}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={`/${locale}/katalog`} className="alv-btn alv-btn--primary alv-btn--md">
              {ru ? 'В каталог' : 'Katalogga o‘tish'}
            </Link>
            <Link href={`/${locale}`} className="alv-btn alv-btn--outline alv-btn--md">
              {ru ? 'Главная' : 'Bosh sahifa'}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
