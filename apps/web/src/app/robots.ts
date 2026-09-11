import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aliver.uz';
  return { rules: { userAgent: '*', allow: '/', disallow: ['/uz/kabinet/', '/ru/kabinet/', '/uz/checkout', '/ru/checkout'] }, sitemap: `${base}/sitemap.xml` };
}
