'use client';

import { useEffect } from 'react';
import { t } from '@/lib/i18n';

/**
 * Xato chegarasi.
 *
 * Adminkada BU FAYL UMUMAN YO'Q EDI va bu «panel qotib qoldi, kira
 * olmayapman» degan holatning haqiqiy sababi: istalgan sahifadagi
 * bitta chizish xatosi (masalan kutilmagan shakldagi javob) butun
 * ekranni Next.js ning yalang'och «Application error» xabariga
 * aylantirardi — sarlavhasiz, menyusiz, qaytish yo'lisiz.
 *
 * Endi xato tushunarli ekranga aylanadi va uchta yo'l qoladi: qayta
 * urinish, dashboardga qaytish, chiqish.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Konsolga yoziladi: operator qo'llab-quvvatlashga aynan shu matnni
    // yuboradi va biz sababini bilamiz.
    console.error('[admin] sahifa xatosi:', error);
  }, [error]);

  return (
    /*
     * MARKAZLASH FLEX BILAN, grid bilan emas. Ilgari bu yerda
     * `display: grid; place-items: center` turardi va grid ustuni
     * `auto` bo'lgani uchun kengligini ICHIDAGI MATN belgilardi:
     * xato xabari uzun bo'lsa kartochka 500 px ga chuzilib, 375 px
     * li telefonda sahifa yon tomonga siljirdi — «Qayta urinish»
     * tugmasi ekrandan chiqib ketardi. Ya'ni xato ekrani xatoning
     * ustiga yana bitta xato qo'shardi.
     */
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--alv-surface)',
          borderRadius: 16,
          padding: 28,
          boxShadow: 'var(--alv-shadow-md)',
        }}
      >
        <h1 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 22, margin: '0 0 8px' }}>
          {t("Sahifa ochilmadi")}
        </h1>
        <p style={{ color: 'var(--alv-ink-2)', fontSize: 14.5, lineHeight: 1.65, margin: '0 0 16px' }}>
          {t("Bu sahifada xatolik yuz berdi. Ma’lumotlaringiz joyida — faqat shu ekran chizilmadi. Qayta urinib ko‘ring yoki boshqa bo‘limga o‘ting.")}
        </p>

        <pre
          style={{
            background: 'var(--alv-surface-2)',
            padding: '10px 12px',
            borderRadius: 10,
            fontSize: 12.5,
            overflowX: 'auto',
            margin: '0 0 18px',
            color: 'var(--alv-ink-2)',
          }}
        >
          {error.message}
          {error.digest ? `\nKod: ${error.digest}` : ''}
        </pre>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" onClick={reset} style={primary}>
            {t("Qayta urinish")}
          </button>
          <a href="/" style={ghost}>
            {t("Dashboardga qaytish")}
          </a>
          <a href="/login" style={ghost}>
            {t("Qaytadan kirish")}
          </a>
        </div>
      </div>
    </main>
  );
}

const primary: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 10,
  border: 'none',
  background: 'var(--alv-ink)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};

const ghost: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 10,
  border: '1px solid var(--alv-line)',
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  fontSize: 14,
  textDecoration: 'none',
  display: 'inline-block',
};
