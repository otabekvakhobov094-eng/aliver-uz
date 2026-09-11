'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@aliver/ui';

/**
 * Xato chegarasi.
 *
 * Bunsiz API dan kelgan HAR QANDAY xato Next.js ning yalang'och
 * "Application error" sahifasini chiqarardi: sarlavhasiz, footersiz,
 * qaytish yo'lisiz oq ekran. `/katalog?sort=cheap` kabi noto'g'ri
 * manzilni qo'lda kiritish ham shu holatga olib borardi.
 *
 * Endi mijoz nima bo'lganini ko'radi va saytda qoladi.
 */
export default function CatalogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Serverda `digest` bilan izlash mumkin bo'lsin.
    console.error('Sahifa xatosi:', error.message, error.digest);
  }, [error]);

  return (
    <main
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        padding: '64px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 440 }}>
        <div style={{ fontSize: 44, marginBottom: 16 }} aria-hidden>
          ✦
        </div>
        <h1
          style={{
            fontFamily: 'var(--alv-font-display)',
            fontSize: 26,
            margin: '0 0 10px',
            letterSpacing: '-0.03em',
          }}
        >
          Nimadir noto‘g‘ri ketdi
        </h1>
        <p style={{ color: 'var(--alv-muted)', lineHeight: 1.6, margin: '0 0 24px' }}>
          Sahifani yuklashda xatolik yuz berdi. Qayta urinib ko‘ring — bu ko‘pincha
          vaqtinchalik nosozlik.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={reset}>
            Qayta urinish
          </Button>
          <Link href="/" className="alv-btn alv-btn--outline alv-btn--md">
            Bosh sahifa
          </Link>
        </div>

        {error.digest ? (
          <p style={{ color: 'var(--alv-muted)', fontSize: 12, marginTop: 20 }}>
            Xato kodi: <code>{error.digest}</code>
          </p>
        ) : null}
      </div>
    </main>
  );
}
