import Link from 'next/link';
import { headers } from 'next/headers';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { isLocale } from '@/i18n/messages';

/**
 * 404 sahifasi.
 *
 * Eski Shopify havolalari va noto'g'ri yozilgan manzillar shu yerga
 * tushadi, shuning uchun u "topilmadi" deb to'xtatib qo'ymasligi —
 * katalogga yo'l ko'rsatishi kerak.
 *
 * SAYT SARLAVHASI VA FOOTERI SHART. Ilgari bu sahifa yalang'och edi:
 * noto'g'ri havolaga tushgan odam menyusiz, qidiruvsiz va logotipsiz
 * qolardi. Ikkita tugma bor edi, lekin ular faqat ikkita yo'nalish
 * beradi — odam esa ko'pincha boshqa narsa qidirayotgan bo'ladi.
 *
 * `not-found.tsx` Next.js da `params` olmaydi, shuning uchun til
 * middleware qo'ygan sarlavhadan olinadi.
 */
export default async function NotFound() {
  const raw = (await headers()).get('x-alv-locale') ?? 'uz';
  const locale = isLocale(raw) ? raw : 'uz';
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
