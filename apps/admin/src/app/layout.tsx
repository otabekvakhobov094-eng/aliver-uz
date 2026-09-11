import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@aliver/ui/tokens.css';
import '@aliver/ui/components.css';

export const metadata: Metadata = {
  title: { default: 'ALIVER.UZ — Admin', template: '%s — ALIVER Admin' },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Manrope:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
