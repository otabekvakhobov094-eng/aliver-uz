'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type UzumProductPreview, type UzumReviewImport, type UzumStatus } from '@/lib/api';

/**
 * Uzum Seller bilan bog'lanish — TZ-4.
 *
 * Ekran ataylab «ko'rib chiqish» ga qurilgan, «import qilish» ga emas.
 *
 * Mahsulot importi YOZMAYDI: faqat Uzum'da nima borligini va uning
 * qanchasi bizning katalogda allaqachon borligini ko'rsatadi. 500 ta
 * mahsulotni bir tugma bilan yozib qo'yish va keyin qo'lda tozalash —
 * bu admin panel qiladigan ish emas.
 *
 * Sharhlar importida esa avval «sinov» tugmasi turadi. Haqiqiy import
 * ham xavfsiz: sharhlar «Uzum'dan» belgisi bilan va MODERATSIYAGA
 * tushadi, «tasdiqlangan xarid» belgisi qo'yilmaydi — xarid bizda
 * emas, Uzum'da qilingan va buni tasdiqlay olmaymiz.
 */
export default function UzumPage() {
  const [status, setStatus] = useState<UzumStatus | null>(null);
  const [preview, setPreview] = useState<UzumProductPreview | null>(null);
  const [imported, setImported] = useState<UzumReviewImport | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const loadStatus = useCallback(async () => {
    setError('');
    try {
      setStatus(await adminApi.uzumStatus());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function run(key: string, fn: () => Promise<void>) {
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

  const ready = status?.ready ?? false;

  return (
    <AdminShell title="Uzum Seller">
      {error ? (
        <div
          role="alert"
          className="alv-card"
          style={{ padding: 14, marginBottom: 16, borderLeft: '3px solid var(--alv-danger,#C0392B)' }}
        >
          {error}
        </div>
      ) : null}

      <section className="alv-card" style={{ padding: 18, display: 'grid', gap: 10, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--alv-font-display)' }}>Ulanish</h2>
        {!status ? (
          <p style={{ margin: 0, color: 'var(--alv-muted)' }}>Tekshirilmoqda…</p>
        ) : ready ? (
          <p style={{ margin: 0 }}>
            Ulangan. Manzil: <code>{status.baseUrl}</code>
          </p>
        ) : (
          <>
            <p style={{ margin: 0 }}>
              Ulanmagan. Yetishmayotgan sozlamalar:{' '}
              <strong>{status.missing.join(', ')}</strong>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
              Kalitlar server muhitida (Render → Environment) beriladi va admin panelda
              ko‘rsatilmaydi. Kalitni bu yerga kiritish mumkin emas — u brauzerga tushib
              qolmasligi kerak.
            </p>
          </>
        )}
      </section>

      <section className="alv-card" style={{ padding: 18, display: 'grid', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--alv-font-display)' }}>Mahsulotlar</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
          Bu yerda hech narsa yozilmaydi. Uzum’dagi mahsulotlar bizning katalog bilan SKU va
          shtrix-kod bo‘yicha solishtiriladi. Narxlar ko‘chirilmaydi: Uzum narxida marketpleys
          komissiyasi bor va uni saytga qo‘yish noto‘g‘ri bo‘ladi.
        </p>
        <div>
          <Button
            size="sm"
            disabled={!ready || busy !== ''}
            onClick={() =>
              void run('preview', async () => {
                setPreview(await adminApi.uzumPreview());
              })
            }
          >
            {busy === 'preview' ? 'Tekshirilmoqda…' : 'Ko‘rib chiqish'}
          </Button>
        </div>

        {preview ? (
          <>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              <Stat label="Uzum’da" value={preview.total} />
              <Stat label="O‘qildi" value={preview.readable} />
              <Stat label="O‘qib bo‘lmadi" value={preview.unreadable} />
              <Stat label="Katalogda bor" value={preview.alreadyInCatalog} />
              <Stat label="Katalogda yo‘q" value={preview.newToCatalog} />
            </div>
            {preview.sample.length > 0 ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Katalogda yo‘q mahsulotlardan namuna:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: 'grid', gap: 3 }}>
                  {preview.sample.map((s) => (
                    <li key={s.externalId}>
                      {s.nameUz} {s.sku ? <span style={{ color: 'var(--alv-muted)' }}>· {s.sku}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      <section className="alv-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--alv-font-display)' }}>Sharhlar</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
          Import qilingan sharh saytda «Uzum’dan» belgisi bilan chiqadi va moderatsiyaga tushadi.
          «Tasdiqlangan xarid» belgisi qo‘yilmaydi — xarid bizda emas, Uzum’da qilingan.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="ghost"
            size="sm"
            disabled={!ready || busy !== ''}
            onClick={() =>
              void run('dry', async () => {
                setImported(await adminApi.uzumImportReviews(true));
              })
            }
          >
            {busy === 'dry' ? 'Sinalmoqda…' : 'Sinov (hech narsa yozilmaydi)'}
          </Button>
          <Button
            size="sm"
            disabled={!ready || busy !== ''}
            onClick={() => {
              if (!window.confirm('Sharhlar bazaga yoziladi va moderatsiyaga tushadi. Davom etamizmi?')) return;
              void run('real', async () => {
                setImported(await adminApi.uzumImportReviews(false));
              });
            }}
          >
            {busy === 'real' ? 'Import qilinmoqda…' : 'Import qilish'}
          </Button>
        </div>

        {imported ? (
          <>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              <Stat label="Uzum’da" value={imported.total} />
              <Stat label={imported.dryRun ? 'Yozilardi' : 'Yozildi'} value={imported.created} />
              <Stat label="Takror" value={imported.duplicate} />
              <Stat label="Mahsulot topilmadi" value={imported.unmatched} />
              <Stat label="O‘qib bo‘lmadi" value={imported.unreadable} />
            </div>
            {imported.dryRun ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
                Bu sinov edi — bazaga hech narsa yozilmadi.
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 13 }}>
                Sharhlar «Sharhlar» bo‘limida moderatsiyani kutmoqda.
              </p>
            )}
            {imported.unmatchedSample.length > 0 ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  Mahsuloti topilmagan sharhlar (SKU bo‘yicha):
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: 'grid', gap: 3 }}>
                  {imported.unmatchedSample.map((u) => (
                    <li key={u.externalId}>
                      {u.sku ?? 'SKU yo‘q'} · {u.rating}★
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: 19, fontWeight: 800 }}>{value.toLocaleString('uz-UZ')}</div>
      <div style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>{label}</div>
    </div>
  );
}
