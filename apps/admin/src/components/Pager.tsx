'use client';

import { t } from '@/lib/i18n';

/**
 * Sahifalash.
 *
 * NEGA ALOHIDA KOMPONENT. Beshta ro'yxat «Jami 556 ta mahsulot» deb
 * yozardi-yu, 30 tasini ko'rsatib to'xtardi: boshqa sahifaga o'tish
 * yo'li UMUMAN yo'q edi. Xodim ro'yxatni oxirigacha aylantirib,
 * kerakli mahsulotni topmasa, uni o'chirilgan deb hisoblab qaytadan
 * yaratardi — natijada SKU takrorlanardi.
 *
 * Uchta ro'yxatda esa sahifalash bor edi, lekin hajmi mijozda 20 deb
 * yozilgani uchun sahifa soni noto'g'ri chiqardi. Endi hamma joyda
 * bitta komponent va hajm serverdan keladi.
 */
export function Pager({
  page,
  total,
  perPage,
  onChange,
}: {
  page: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, perPage)));
  if (pages <= 1) return null;

  const btn: React.CSSProperties = {
    minHeight: 34,
    padding: '0 14px',
    borderRadius: 8,
    border: '1px solid var(--alv-line)',
    background: 'var(--alv-surface)',
    color: 'var(--alv-ink)',
    font: 'inherit',
    fontSize: 13.5,
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        style={{ ...btn, opacity: page <= 1 ? 0.5 : 1, cursor: page <= 1 ? 'default' : 'pointer' }}
      >
        {t('← Oldingi')}
      </button>
      <span style={{ fontSize: 14, color: 'var(--alv-muted)', fontVariantNumeric: 'tabular-nums' }}>
        {page} / {pages}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(pages, page + 1))}
        disabled={page >= pages}
        style={{
          ...btn,
          opacity: page >= pages ? 0.5 : 1,
          cursor: page >= pages ? 'default' : 'pointer',
        }}
      >
        {t('Keyingi →')}
      </button>
    </div>
  );
}
