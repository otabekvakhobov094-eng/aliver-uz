import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, LOCALES } from './i18n/messages';

/**
 * Til prefiksi: /uz/... va /ru/...
 * Prefikssiz so'rov brauzer tiliga qarab yo'naltiriladi (TZ 4).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // statik fayllar
  ) {
    return NextResponse.next();
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
  try {
    const response = await fetch(`${apiUrl}/content/redirect?path=${encodeURIComponent(pathname)}`, { signal: AbortSignal.timeout(350), next: { revalidate: 60 } });
    if (response.ok) {
      const rule = await response.json() as { toPath: string; code: number } | null;
      if (rule?.toPath && rule.toPath !== pathname) return NextResponse.redirect(new URL(rule.toPath, req.url), rule.code);
    }
  } catch { /* CMS vaqtincha ishlamasa sayt ochilishda davom etadi. */ }

  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const accept = req.headers.get('accept-language') ?? '';
  const locale = accept.toLowerCase().startsWith('ru') ? 'ru' : DEFAULT_LOCALE;

  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next|.*\\..*).*)'] };
