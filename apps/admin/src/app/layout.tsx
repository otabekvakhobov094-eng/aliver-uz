import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { AdminLocaleProvider } from '@/components/AdminLocaleProvider';
import { LOCALE_COOKIE, normaliseLocale } from '@/lib/i18n';
import '@aliver/ui/tokens.css';
import '@aliver/ui/components.css';
import '@aliver/ui/motion.css';
// Panel uslubi umumiy uslubdan KEYIN: u saytnikini panel uchun qayta
// belgilaydi. Tartib muhim — oldin yuklansa hech narsa o'zgarmasdi.
import './admin.css';

export const metadata: Metadata = {
  title: { default: 'ALIVER.UZ — Admin', template: '%s — ALIVER Admin' },
  robots: { index: false, follow: false },
};

/*
 * Til COOKIE dan o'qiladi — serverda ham. Shunda birinchi chizish
 * to'g'ri tilda ketadi va brauzerda matn almashib ketmaydi.
 */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = normaliseLocale((await cookies()).get(LOCALE_COOKIE)?.value);

  return (
    <html lang={locale}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <AdminLocaleProvider locale={locale}>{children}</AdminLocaleProvider>
      </body>
    </html>
  );
}
