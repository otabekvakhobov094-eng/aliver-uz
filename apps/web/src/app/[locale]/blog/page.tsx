import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { contentApi } from '@/lib/content-api';
import { isLocale } from '@/i18n/messages';
import { t } from '@/i18n/messages';

export const metadata = { title: 'Blog' };

export default async function Blog({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const posts = await contentApi.posts().catch(() => []);
  const ru = locale === 'ru';
  return <><SiteHeader locale={locale} /><main className="alv-page" style={{ paddingTop: 42, paddingBottom: 70, minHeight: '60vh' }}><h1 className="alv-h1">Blog</h1>{posts.length ? <div className="alv-grid" style={{ marginTop: 28 }}>{posts.map((post) => <Link key={post.slug} href={`/${locale}/blog/${post.slug}`} className="alv-card" style={{ overflow: 'hidden', color: 'inherit' }}>{post.coverUrl ? <img src={post.coverUrl} alt={ru ? post.titleRu : post.titleUz} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} /> : null}<div style={{ padding: 20 }}><h2 style={{ margin: 0 }}>{ru ? post.titleRu : post.titleUz}</h2><p style={{ color: 'var(--alv-muted)', lineHeight: 1.6 }}>{ru ? post.excerptRu : post.excerptUz}</p></div></Link>)}</div> : <div className="alv-empty alv-card" style={{ marginTop: 28 }}><p>{t(locale, 'blog.empty')}</p></div>}</main><SiteFooter locale={locale} /></>;
}
