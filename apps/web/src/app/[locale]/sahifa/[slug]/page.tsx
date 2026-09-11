import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { contentApi } from '@/lib/content-api';
import { isLocale } from '@/i18n/messages';

async function load(slug: string) { try { return await contentApi.page(slug); } catch { return null; } }

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await load(slug);
  if (!page) return { title: 'Sahifa topilmadi' };
  const ru = locale === 'ru';
  return {
    title: (ru ? page.seoTitleRu : page.seoTitleUz) ?? (ru ? page.titleRu : page.titleUz),
    description: (ru ? page.seoDescRu : page.seoDescUz) ?? undefined,
    alternates: { languages: { uz: `/uz/sahifa/${slug}`, ru: `/ru/sahifa/${slug}` } },
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: raw, slug } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const page = await load(slug);
  if (!page) notFound();
  const ru = locale === 'ru';
  return <><SiteHeader locale={locale} /><main className="alv-page" style={{ maxWidth: 860, paddingTop: 42, paddingBottom: 70 }}><h1 className="alv-h1">{ru ? page.titleRu : page.titleUz}</h1><article style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, marginTop: 24 }}>{ru ? page.bodyRu : page.bodyUz}</article></main><SiteFooter locale={locale} /></>;
}
