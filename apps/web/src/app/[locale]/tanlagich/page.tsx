import type { Metadata } from 'next';
import { ProductFinder } from '@/components/ProductFinder';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { isLocale } from '@/i18n/messages';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const ru = locale === 'ru';
  return {
    title: ru ? 'Подбор средства' : 'Vosita tanlagich',
    description: ru
      ? 'Три вопроса — и подборка средств под вашу задачу и бюджет.'
      : 'Uchta savol — va vazifangizga hamda byudjetingizga mos vositalar to‘plami.',
  };
}

export default async function FinderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const ru = locale === 'ru';

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ paddingBlock: 32, minHeight: '60vh' }}>
        <h1
          style={{
            fontFamily: 'var(--alv-font-display)',
            fontWeight: 400,
            fontSize: 'clamp(26px, 5vw, 36px)',
            letterSpacing: '-0.02em',
            margin: '0 0 10px',
          }}
        >
          {ru ? 'Подберём средство' : 'Vositani tanlaymiz'}
        </h1>
        <p
          style={{
            margin: '0 0 26px',
            maxWidth: '58ch',
            color: 'var(--alv-ink-2)',
            lineHeight: 1.7,
          }}
        >
          {ru
            ? 'Ответьте на три вопроса — покажем то, что подходит именно вам. Любой вопрос можно пропустить.'
            : 'Uchta savolga javob bering — sizga mos keladiganini ko‘rsatamiz. Har bir savolni o‘tkazib yuborish mumkin.'}
        </p>
        <ProductFinder locale={locale} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
