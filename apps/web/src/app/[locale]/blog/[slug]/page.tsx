import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { contentApi } from '@/lib/content-api';
import { isLocale } from '@/i18n/messages';

async function load(slug: string) { try { return await contentApi.post(slug); } catch { return null; } }
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> { const { locale, slug } = await params; const post = await load(slug); if (!post) return { title: 'Maqola topilmadi' }; const ru = locale === 'ru'; return { title: ru ? post.titleRu : post.titleUz, description: (ru ? post.excerptRu : post.excerptUz) ?? undefined, openGraph: { images: post.coverUrl ? [post.coverUrl] : [] } }; }

export default async function Post({ params }: { params: Promise<{ locale: string; slug: string }> }) { const { locale: raw, slug } = await params; const locale = isLocale(raw) ? raw : 'uz'; const post = await load(slug); if (!post) notFound(); const ru = locale === 'ru'; const jsonLd = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: ru ? post.titleRu : post.titleUz, image: post.coverUrl, author: post.author ? { '@type': 'Person', name: post.author } : undefined, datePublished: post.publishedAt }; return <><SiteHeader locale={locale} /><main className="alv-page" style={{ maxWidth: 860, paddingTop: 42, paddingBottom: 70 }}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><h1 className="alv-h1">{ru ? post.titleRu : post.titleUz}</h1>{post.coverUrl ? <img src={post.coverUrl} alt="" style={{ width: '100%', borderRadius: 22, marginTop: 24 }} /> : null}<article style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, marginTop: 28 }}>{ru ? post.bodyRu : post.bodyUz}</article></main><SiteFooter locale={locale} /></>; }
