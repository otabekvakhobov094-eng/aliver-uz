'use client';
import { t } from '@/lib/i18n';

/**
 * Layout darajasidagi xato.
 *
 * `error.tsx` sahifa ichidagi xatoni ushlaydi, lekin LAYOUT ning o'zi
 * yiqilsa u ham ishlamaydi. Bu fayl aynan o'sha holat uchun va shuning
 * uchun u o'z `<html>` va `<body>` sini chizadi hamda hech qanday
 * umumiy komponentga tayanmaydi — aks holda xato ichida yana xato
 * bo'lardi.
 */
export default function AdminGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#fff9fc',
          color: '#1b1220',
          padding: 20,
        }}
      >
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, margin: '0 0 10px' }}>{t("Panel ochilmadi")}</h1>
          <p style={{ color: '#463a4f', lineHeight: 1.65, margin: '0 0 18px', fontSize: 15 }}>
            {t("Kutilmagan xatolik. Ma’lumotlaringiz joyida.")}
            {error.digest ? ` Kod: ${error.digest}` : ''}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '11px 22px',
              borderRadius: 10,
              border: 'none',
              background: '#1b1220',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {t("Qayta urinish")}
          </button>
        </div>
      </body>
    </html>
  );
}
