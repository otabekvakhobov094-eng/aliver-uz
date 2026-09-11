'use client';

/**
 * Ildiz darajasidagi xato.
 *
 * `[locale]/error.tsx` layout ichidagi xatolarni ushlaydi, lekin
 * layoutning O'ZI yiqilsa u ishlamaydi. Bu esa oxirgi to'siq, shuning
 * uchun u hech qanday umumiy komponentga tayanmaydi va o'z `<html>`
 * tegini chizadi.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
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
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, margin: '0 0 10px' }}>Sayt vaqtincha ishlamayapti</h1>
          <p style={{ color: '#8b7d94', margin: '0 0 24px' }}>
            Qayta urinib ko‘ring yoki birozdan keyin kiring.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#d42a64',
              color: '#fff',
              border: 0,
              borderRadius: 999,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Qayta urinish
          </button>
        </div>
      </body>
    </html>
  );
}
