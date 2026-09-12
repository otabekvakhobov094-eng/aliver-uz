'use client';

import { useState } from 'react';
import { Button } from '@aliver/ui';
import { adminApi, type ShopifyImportResult, type ShopifyPreview } from '@/lib/api';

/**
 * Boshqa do'kondan katalog importi.
 *
 * Bu ish ilgari faqat buyruq qatorida bajarilardi. Amalda bu shuni
 * anglatardi: do'kon egasi noutbukiga Node o'rnatishi, to'g'ri papkaga
 * o'tishi va ishlab chiqarish bazasining parolini terminalga yozishi
 * kerak edi. Endi u serverda ishlaydi.
 *
 * IKKI TUGMA ataylab. «Ko'rib chiqish» hech narsa yozmaydi — u nechta
 * mahsulot yangi, nechtasi yangilanishini va narxlar to'g'ri
 * hisoblanganini ko'rsatadi. Import faqat shundan keyin.
 */

const fmt = (n: number) => n.toLocaleString('uz-UZ');

export function ShopifyImport() {
  const [sourceUrl, setSourceUrl] = useState('https://www.aliverbeauty.eu');
  const [rate, setRate] = useState('12800');
  const [preview, setPreview] = useState<ShopifyPreview | null>(null);
  const [result, setResult] = useState<ShopifyImportResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const usdToUzs = Number(rate);
  const rateOk = Number.isInteger(usdToUzs) && usdToUzs > 0;

  async function run(key: string, fn: () => Promise<void>) {
    if (!rateOk) {
      setError('USD → UZS kursini butun son bilan kiriting');
      return;
    }
    setBusy(key);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="alv-card" style={{ padding: 20, display: 'grid', gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--alv-font-display)' }}>
          Boshqa do‘kondan import
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--alv-muted)', maxWidth: 640 }}>
          Shopify asosidagi do‘kon manzilini kiriting. Mahsulotlar, variantlar, rasmlar,
          kategoriyalar va brendlar ko‘chiriladi. Narxlar USD dan so‘mga kursga ko‘ra
          hisoblanadi — Uzum yoki boshqa marketpleys komissiyasi qo‘shilmaydi.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        <label style={lbl}>
          Do‘kon manzili
          <input
            style={input}
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.aliverbeauty.eu"
          />
        </label>
        <label style={lbl}>
          1 USD = ? so‘m
          <input
            style={input}
            value={rate}
            inputMode="numeric"
            onChange={(e) => setRate(e.target.value)}
            placeholder="12800"
          />
          <span style={{ fontSize: 11, color: 'var(--alv-muted)', fontWeight: 400 }}>
            Bugungi kurs. Narxlar shunga ko‘ra hisoblanadi.
          </span>
        </label>
      </div>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--alv-danger)' }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy !== ''}
          onClick={() =>
            void run('preview', async () => {
              setResult(null);
              setPreview(await adminApi.shopifyPreview(sourceUrl.trim(), usdToUzs));
            })
          }
        >
          {busy === 'preview' ? 'Tekshirilmoqda…' : 'Ko‘rib chiqish'}
        </Button>
        <Button
          size="sm"
          disabled={busy !== '' || !preview}
          onClick={() => {
            if (!preview) return;
            const ok = window.confirm(
              `${preview.total} ta mahsulot yoziladi: ${preview.willCreate} ta yangi, ` +
                `${preview.willUpdate} ta yangilanadi. Davom etamizmi?`,
            );
            if (!ok) return;
            void run('run', async () => {
              setResult(await adminApi.shopifyImport(sourceUrl.trim(), usdToUzs));
            });
          }}
        >
          {busy === 'run' ? 'Import qilinmoqda…' : 'Import qilish'}
        </Button>
        {!preview ? (
          <span style={{ alignSelf: 'center', fontSize: 12.5, color: 'var(--alv-muted)' }}>
            Avval ko‘rib chiqing
          </span>
        ) : null}
      </div>

      {preview ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <Stat label="Topildi" value={preview.total} />
            <Stat label="Yangi" value={preview.willCreate} />
            <Stat label="Yangilanadi" value={preview.willUpdate} />
            <Stat label="Variant" value={preview.variants} />
            <Stat label="Rasm" value={preview.images} />
          </div>

          <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', fontSize: 13 }}>
            <div>
              <div style={head}>Brendlar</div>
              {preview.brands.map((b) => (
                <div key={b.name}>
                  {b.name} <span style={{ color: 'var(--alv-muted)' }}>· {fmt(b.count)}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={head}>Kategoriyalar</div>
              {preview.categories.map((c) => (
                <div key={c.name}>
                  {c.name} <span style={{ color: 'var(--alv-muted)' }}>· {fmt(c.count)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12.5, minWidth: 620 }}>
              <thead>
                <tr>
                  {['Mahsulot', 'Brend', 'Kategoriya', 'Variant', 'Rasm', 'Narx (so‘m)'].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((row) => (
                  <tr key={row.handle}>
                    <td style={td}>{row.title}</td>
                    <td style={td}>{row.brand}</td>
                    <td style={td}>{row.category}</td>
                    <td style={td}>{row.variants}</td>
                    <td style={td}>{row.images}</td>
                    <td style={td}>
                      {row.minPriceSum === row.maxPriceSum
                        ? fmt(row.minPriceSum)
                        : `${fmt(row.minPriceSum)} – ${fmt(row.maxPriceSum)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--alv-muted)' }}>
            Jadvalda birinchi {preview.sample.length} ta ko‘rsatilgan. Narxlarni tekshiring:
            kurs noto‘g‘ri bo‘lsa hamma narx xato chiqadi.
          </p>
        </div>
      ) : null}

      {result ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <Stat label="Yaratildi" value={result.created} />
            <Stat label="Yangilandi" value={result.updated} />
            <Stat label="Xato" value={result.failed} />
          </div>
          {result.errors.length > 0 ? (
            <details>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Xatolar ({result.failed})
              </summary>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.5 }}>
                {result.errors.map((e) => (
                  <li key={`${e.row}-${e.column}`}>
                    {e.column}: {e.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: 19, fontWeight: 800 }}>{fmt(value)}</div>
      <div style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>{label}</div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'grid', gap: 5, fontSize: 13, fontWeight: 600, minWidth: 0 };
const input: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid var(--alv-line)',
  fontSize: 14,
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  minWidth: 0,
  width: '100%',
};
const head: React.CSSProperties = { fontWeight: 700, marginBottom: 5 };
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '7px 12px 7px 0',
  borderBottom: '1px solid var(--alv-line)',
  color: 'var(--alv-muted)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '7px 12px 7px 0',
  borderBottom: '1px solid var(--alv-line)',
  verticalAlign: 'top',
};
