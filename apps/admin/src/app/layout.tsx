import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@aliver/ui/tokens.css';
import '@aliver/ui/components.css';
import '@aliver/ui/motion.css';

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
          href="https://fonts.googleapis.com/css2?family=Prata&family=Golos+Text:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
