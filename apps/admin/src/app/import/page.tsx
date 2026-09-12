'use client';

import { useState } from 'react';
import { Badge, Button } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { ShopifyImport } from '@/components/ShopifyImport';
import { adminApi, type ImportSummary } from '@/lib/api';

const MODES: Array<{ value: string; label: string; hint: string }> = [
  { value: 'PREVIEW', label: 'Oldindan ko‘rish', hint: 'Bazaga hech narsa yozilmaydi' },
  {
    value: 'CREATE_ONLY',
    label: 'Faqat yangilarini qo‘shish',
    hint: 'Mavjud SKU o‘tkazib yuboriladi',
  },
  {
    value: 'UPDATE_ONLY',
    label: 'Faqat mavjudlarini yangilash',
    hint: 'Yangi mahsulot yaratilmaydi',
  },
  { value: 'CREATE_AND_UPDATE', label: 'Qo‘shish va yangilash', hint: 'To‘liq sinxronizatsiya' },
];

/**
 * Excel/CSV import. TZ 97 + ekspertiza B-12: avval PREVIEW, so'ng tasdiqlash.
 */
export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState('PREVIEW');
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (selectedMode: string) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await adminApi.importProducts(file, selectedMode));
      setMode(selectedMode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
    } finally {
      setBusy(false);
    }
  };

  const creates = result?.plan.filter((p) => p.action === 'create').length ?? 0;
  const updates = result?.plan.filter((p) => p.action === 'update').length ?? 0;

  return (
    <AdminShell title="Mahsulotlarni import qilish">
      <div style={{ marginBottom: 22 }}>
        <ShopifyImport />
      </div>

      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'minmax(0,1fr) 320px',
          alignItems: 'start',
        }}
      >
        <div
          className="alv-card"
          style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div>
            <label
              htmlFor="import-file"
              style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}
            >
              Excel yoki CSV fayl
            </label>
            <input
              id="import-file"
              type="file"
              accept=".xlsx,.csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
              }}
              style={{ fontSize: 14 }}
            />
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Rejim</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 2,
                    minHeight: 56,
                    padding: '10px 16px',
                    borderRadius: 14,
                    border: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: 'inherit',
                    background: mode === m.value ? 'var(--alv-brand-soft)' : 'var(--alv-surface)',
                    boxShadow:
                      mode === m.value
                        ? 'inset 0 0 0 2px var(--alv-brand)'
                        : 'inset 0 0 0 1.5px var(--alv-line-2)',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--alv-muted)' }}>{m.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="outline" disabled={!file || busy} onClick={() => void run('PREVIEW')}>
              Tekshirish (preview)
            </Button>
            <Button
              variant="primary"
              disabled={!file || busy || mode === 'PREVIEW'}
              onClick={() => void run(mode)}
            >
              {busy ? 'Bajarilmoqda…' : 'Import qilish'}
            </Button>
          </div>

          {error ? (
            <p role="alert" style={{ color: 'var(--alv-brand-deep)', fontWeight: 600, margin: 0 }}>
              {error}
            </p>
          ) : null}
        </div>

        <div className="alv-card" style={{ padding: 20 }}>
          <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 17, margin: '0 0 10px' }}>
            Shablon
          </h2>
          <p
            style={{ fontSize: 13, color: 'var(--alv-muted)', lineHeight: 1.6, margin: '0 0 14px' }}
          >
            Majburiy ustunlar pushti rangda belgilangan. Bir mahsulotning har bir varianti — alohida
            satr, ularni <code>product_slug</code> birlashtiradi.
          </p>
          <a
            className="alv-btn alv-btn--outline alv-btn--sm alv-btn--block"
            href={adminApi.templateUrl()}
          >
            Shablonni yuklab olish
          </a>
          <p style={{ fontSize: 12, color: 'var(--alv-muted)', lineHeight: 1.6, marginTop: 14 }}>
            IKPU (MXIK) kodi majburiy: usiz fiskal chek yuborib bo‘lmaydi.
          </p>
        </div>
      </div>

      {result ? (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 20, margin: '0 0 14px' }}>
            Natija {result.mode === 'PREVIEW' ? '(oldindan ko‘rish)' : ''}
          </h2>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <Stat label="Satrlar" value={result.totalRows} />
            <Stat label="Mahsulotlar" value={result.products} />
            <Stat
              label={result.mode === 'PREVIEW' ? 'Yaratiladi' : 'Yaratildi'}
              value={result.mode === 'PREVIEW' ? creates : result.created}
            />
            <Stat
              label={result.mode === 'PREVIEW' ? 'Yangilanadi' : 'Yangilandi'}
              value={result.mode === 'PREVIEW' ? updates : result.updated}
            />
            <Stat label="O‘tkazib yuborildi" value={result.skipped} />
            <Stat
              label="Xatolar"
              value={result.errorRows}
              tone={result.errorRows > 0 ? 'low' : 'mint'}
            />
          </div>

          {result.errors.length > 0 ? (
            <div className="alv-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '14px 18px', fontWeight: 700, fontSize: 14 }}>
                Xatolar ({result.errors.length})
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--alv-muted)', fontSize: 12 }}>
                    <th style={{ padding: '8px 18px', width: 80 }}>Satr</th>
                    <th style={{ padding: '8px 8px', width: 160 }}>Ustun</th>
                    <th style={{ padding: '8px 18px' }}>Xabar</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--alv-line)' }}>
                      <td style={{ padding: '10px 18px', fontWeight: 700 }}>{e.row}</td>
                      <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: 12 }}>
                        {e.column}
                      </td>
                      <td style={{ padding: '10px 18px' }}>{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {result.plan.length > 0 ? (
            <div className="alv-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', fontWeight: 700, fontSize: 14 }}>Reja</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {result.plan.map((p) => (
                    <tr key={p.productSlug} style={{ borderTop: '1px solid var(--alv-line)' }}>
                      <td style={{ padding: '10px 18px', fontFamily: 'monospace', fontSize: 12 }}>
                        {p.productSlug}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <Badge
                          tone={
                            p.action === 'create'
                              ? 'mint'
                              : p.action === 'update'
                                ? 'new'
                                : 'neutral'
                          }
                        >
                          {p.action === 'create'
                            ? 'yangi'
                            : p.action === 'update'
                              ? 'yangilash'
                              : 'o‘tkazib yuborish'}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 18px', color: 'var(--alv-muted)' }}>
                        {p.variants} ta variant
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </AdminShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'mint' | 'low' }) {
  return (
    <div
      className="alv-card"
      style={{
        padding: '12px 18px',
        minWidth: 140,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--alv-muted)' }}>{label}</span>
      <span
        style={{
          fontFamily: 'var(--alv-font-display)',
          fontWeight: 400,
          fontSize: 22,
          color:
            tone === 'low'
              ? 'var(--alv-brand-deep)'
              : tone === 'mint'
                ? 'var(--alv-mint)'
                : 'var(--alv-ink)',
        }}
      >
        {value}
      </span>
    </div>
  );
}
