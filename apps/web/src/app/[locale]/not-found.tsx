import Link from 'next/link';

/**
 * 404 sahifasi.
 *
 * Eski Shopify havolalari va noto'g'ri yozilgan manzillar shu yerga
 * tushadi, shuning uchun u "topilmadi" deb to'xtatib qo'ymasligi —
 * katalogga yo'l ko'rsatishi kerak.
 */
export default function NotFound() {
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
        <div
          style={{
            fontFamily: 'var(--alv-font-display)',
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: '-0.05em',
            color: 'var(--alv-brand)',
            lineHeight: 1,
          }}
          aria-hidden
        >
          404
        </div>
        <h1
          style={{
            fontFamily: 'var(--alv-font-display)',
            fontSize: 24,
            margin: '16px 0 10px',
            letterSpacing: '-0.03em',
          }}
        >
          Sahifa topilmadi
        </h1>
        <p style={{ color: 'var(--alv-muted)', lineHeight: 1.6, margin: '0 0 24px' }}>
          Ehtimol havola eskirgan yoki manzil noto‘g‘ri yozilgan.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/uz/katalog" className="alv-btn alv-btn--primary alv-btn--md">
            Katalogga o‘tish
          </Link>
          <Link href="/uz" className="alv-btn alv-btn--outline alv-btn--md">
            Bosh sahifa
          </Link>
        </div>
      </div>
    </main>
  );
}
