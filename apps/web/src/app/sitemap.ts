import type { MetadataRoute } from 'next';
import { LANDING_PAGES } from '@/lib/landing-pages';

/**
 * Sitemap.
 *
 * Filtr sahifalari (`/f/…`) shu yerga QO'SHILADI: ular alohida
 * indekslanadigan sahifalar va sitemap'da bo'lmasa Google ularni
 * faqat ichki havolalar orqali, ancha kech topadi.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aliver.uz';
  const routes = ['', '/katalog', '/kategoriyalar', '/tanlagich', '/blog', '/savollar', '/hamkorlik'];

  return ['uz', 'ru'].flatMap((locale) => [
    ...routes.map((route) => ({
      url: `${base}/${locale}${route}`,
      changeFrequency: route === '' ? ('daily' as const) : ('weekly' as const),
      priority: route === '' ? 1 : 0.8,
    })),
    ...LANDING_PAGES.map((page) => ({
      url: `${base}/${locale}/f/${page.slug}`,
      changeFrequency: 'weekly' as const,
      // Katalogdan past, lekin blogdan yuqori: bu sahifalar aniq
      // qidiruv so'roviga javob beradi va konversiyasi yuqori.
      priority: 0.7,
    })),
  ]);
}
