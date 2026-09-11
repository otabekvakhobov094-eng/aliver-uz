import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aliver.uz';
  const routes = ['', '/katalog', '/kategoriyalar', '/blog', '/savollar', '/hamkorlik'];
  return ['uz', 'ru'].flatMap((locale) => routes.map((route) => ({ url: `${base}/${locale}${route}`, changeFrequency: route === '' ? 'daily' as const : 'weekly' as const, priority: route === '' ? 1 : 0.8 })));
}
