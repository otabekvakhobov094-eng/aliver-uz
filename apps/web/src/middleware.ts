import { NextResponse, type NextRequest } from 'next/server';
import { serverApiBase } from './lib/api-base';
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

  // Middleware serverda ishlaydi — proxy orqali emas, to'g'ridan-to'g'ri.
  const apiUrl = serverApiBase();
  try {
    const response = await fetch(`${apiUrl}/content/redirect?path=${encodeURIComponent(pathname)}`, { signal: AbortSignal.timeout(350), next: { revalidate: 60 } });
    if (response.ok) {
      const rule = await response.json() as { toPath: string; code: number } | null;
      if (rule?.toPath && rule.toPath !== pathname) return NextResponse.redirect(new URL(rule.toPath, req.url), rule.code);
    }
  } catch { /* CMS vaqtincha ishlamasa sayt ochilishda davom etadi. */ }

  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) {
    /*
     * Tilni SARLAVHAGA yozamiz.
     *
     * `not-found.tsx` Next.js da `params` olmaydi — ya'ni u qaysi tilda
     * ochilganini bilmaydi va sayt sarlavhasini to'g'ri tilda chiza
     * olmaydi. Yagona ishonchli manba — so'rovning o'zi, shuning uchun
     * til shu yerda ajratib olinadi.
     */
    const current = pathname.split('/')[1] ?? DEFAULT_LOCALE;
    const headers = new Headers(req.headers);
    headers.set('x-alv-locale', current);
    return NextResponse.next({ request: { headers } });
  }

  const accept = req.headers.get('accept-language') ?? '';
  const locale = accept.toLowerCase().startsWith('ru') ? 'ru' : DEFAULT_LOCALE;

  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next|.*\\..*).*)'] };
