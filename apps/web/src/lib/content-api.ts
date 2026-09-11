const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface ContentPage {
  slug: string;
  titleUz: string;
  titleRu: string;
  bodyUz: string | null;
  bodyRu: string | null;
  seoTitleUz: string | null;
  seoTitleRu: string | null;
  seoDescUz: string | null;
  seoDescRu: string | null;
  updatedAt: string;
}

export interface BlogPost {
  slug: string;
  titleUz: string;
  titleRu: string;
  excerptUz: string | null;
  excerptRu: string | null;
  bodyUz: string | null;
  bodyRu: string | null;
  coverUrl: string | null;
  author: string | null;
  publishedAt: string | null;
}

export interface Banner {
  id: string;
  placement: string;
  titleUz: string | null;
  titleRu: string | null;
  subtitleUz: string | null;
  subtitleRu: string | null;
  imageUrl: string | null;
  imageMobileUrl: string | null;
  ctaLabelUz: string | null;
  ctaLabelRu: string | null;
  ctaUrl: string | null;
}

export interface Faq { id: string; category: string | null; questionUz: string; questionRu: string; answerUz: string; answerRu: string; }

async function get<T>(path: string, revalidate = 120): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { next: { revalidate } });
  if (!response.ok) throw new Error(`Content API: ${response.status}`);
  return response.json() as Promise<T>;
}

export const contentApi = {
  page: (slug: string) => get<ContentPage>(`/content/pages/${encodeURIComponent(slug)}`, 300),
  posts: () => get<BlogPost[]>('/content/blog', 120),
  post: (slug: string) => get<BlogPost>(`/content/blog/${encodeURIComponent(slug)}`, 120),
  banners: (placement: string) =>
    get<Banner[]>(`/content/banners?placement=${encodeURIComponent(placement)}`, 60),
  faqs: () => get<Faq[]>('/content/faq', 300),
};
