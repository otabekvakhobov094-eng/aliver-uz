import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { contentApi } from '@/lib/content-api';
import { isLocale } from '@/i18n/messages';

export const metadata = { title: 'Ko‘p so‘raladigan savollar' };
export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params; const locale = isLocale(raw) ? raw : 'uz'; const ru = locale === 'ru';
  const items = await contentApi.faqs().catch(() => []);
  const jsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((item) => ({ '@type': 'Question', name: ru ? item.questionRu : item.questionUz, acceptedAnswer: { '@type': 'Answer', text: ru ? item.answerRu : item.answerUz } })) };
  return <><SiteHeader locale={locale} /><main className="alv-page" style={{ maxWidth: 860, paddingTop: 42, paddingBottom: 70 }}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><h1 className="alv-h1">{ru ? 'Частые вопросы' : 'Ko‘p so‘raladigan savollar'}</h1><div style={{ display: 'grid', gap: 12, marginTop: 28 }}>{items.map((item) => <details key={item.id} className="alv-card" style={{ padding: 18 }}><summary style={{ cursor: 'pointer', fontWeight: 700 }}>{ru ? item.questionRu : item.questionUz}</summary><p style={{ lineHeight: 1.7, color: 'var(--alv-ink-2)' }}>{ru ? item.answerRu : item.answerUz}</p></details>)}</div></main><SiteFooter locale={locale} /></>;
}
