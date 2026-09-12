'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import { Button } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import {
  adminApi,
  type UzumProductPreview,
  type UzumReviewImport,
  type UzumStatus,
  type UzumSyncPlan,
} from '@/lib/api';
import { fmtNumber } from '@/lib/order-labels';

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
  const [sync, setSync] = useState<UzumSyncPlan | null>(null);
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
    <AdminShell title={t("Uzum Seller")}>
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
        <h2 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--alv-font-display)' }}>{t("Ulanish")}</h2>
        {!status ? (
          <p style={{ margin: 0, color: 'var(--alv-muted)' }}>{t("Tekshirilmoqda…")}</p>
        ) : ready ? (
          <p style={{ margin: 0 }}>
            {t("Ulangan. Manzil:")} <code>{status.baseUrl}</code>
          </p>
        ) : (
          <>
            <p style={{ margin: 0 }}>
              {t("Ulanmagan. Yetishmayotgan sozlamalar:")}{' '}
              <strong>{status.missing.join(', ')}</strong>
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
              {t("Kalitlar server muhitida (Render → Environment) beriladi va admin panelda ko‘rsatilmaydi. Kalitni bu yerga kiritish mumkin emas — u brauzerga tushib qolmasligi kerak.")}
            </p>
          </>
        )}
      </section>

      <section className="alv-card" style={{ padding: 18, display: 'grid', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--alv-font-display)' }}>{t("Mahsulotlar")}</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
          {t("Bu yerda hech narsa yozilmaydi. Uzum’dagi mahsulotlar bizning katalog bilan SKU va shtrix-kod bo‘yicha solishtiriladi. Narxlar ko‘chirilmaydi: Uzum narxida marketpleys komissiyasi bor va uni saytga qo‘yish noto‘g‘ri bo‘ladi.")}
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
            {busy === "preview" ? t("Tekshirilmoqda…") : t("Ko‘rib chiqish")}
          </Button>
        </div>

        {preview ? (
          <>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              <Stat label={t("Uzum’da")} value={preview.total} />
              <Stat label={t("O‘qildi")} value={preview.readable} />
              <Stat label={t("O‘qib bo‘lmadi")} value={preview.unreadable} />
              <Stat label={t("Katalogda bor")} value={preview.alreadyInCatalog} />
              <Stat label={t("Katalogda yo‘q")} value={preview.newToCatalog} />
            </div>
            {preview.sample.length > 0 ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {t("Katalogda yo‘q mahsulotlardan namuna:")}
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

      {/*
        SINXRONIZATSIYA — aynan shu bo'lim qo'lda solishtirishni
        almashtiradi. Uzum yozish API si ulanmagan bo'lsa ham ishlaydi:
        farq hisoblanadi va CSV qilib beriladi, fayl esa Uzum
        kabinetidagi ommaviy tahrirlashga yuklanadi.
      */}
      <section className="alv-card" style={{ padding: 18, display: 'grid', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--alv-font-display)' }}>
          {t("Narx va qoldiqni tenglashtirish")}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
          {t("Ikkala do‘kondagi farq SKU bo‘yicha hisoblanadi. Hech narsa o‘zgartirilmaydi — natijani CSV qilib olib, Uzum kabinetidagi ommaviy tahrirlashga yuklaysiz.")}
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            size="sm"
            disabled={!ready || busy !== ''}
            onClick={() =>
              void run('sync', async () => {
                setSync(await adminApi.uzumSyncPlan());
              })
            }
          >
            {busy === "sync" ? t("Solishtirilmoqda…") : t("Farqni hisoblash")}
          </Button>
          {sync ? (
            <a
              className="alv-btn alv-btn--ghost alv-btn--sm"
              href={adminApi.uzumSyncCsvUrl()}
              download="uzum-sync.csv"
            >
              {t("CSV yuklab olish")}
            </a>
          ) : null}
        </div>

        {sync ? (
          <>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              <Stat label={t("Jami")} value={sync.summary.total} />
              <Stat label={t("Mos")} value={sync.summary.ok} />
              <Stat label={t("Qoldiq farqi")} value={sync.summary.needsStock} />
              <Stat label={t("Narx farqi")} value={sync.summary.needsPrice} />
              <Stat label={t("Uzum’da yo‘q")} value={sync.summary.onlyHere} />
              <Stat label={t("Bizda yo‘q")} value={sync.summary.onlyThere} />
            </div>

            {!sync.summary.priceSyncEnabled ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  padding: '10px 12px',
                  background: 'var(--alv-warn-soft)',
                  borderRadius: 8,
                }}
              >
                {t("Narx taqqoslanmayapti. Uzum narxi ichida marketpleys komissiyasi bor, ya’ni saytdagi narxni o‘sha yerga ko‘chirish zarar keltiradi. Taqqoslash uchun server sozlamasida")} <code>UZUM_PRICE_MARKUP_PERCENT</code> {t("ni ko‘rsating — masalan")} <code>15</code>.
              </p>
            ) : null}

            {sync.summary.reserveStock > 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
                {t("Marketpleysga har bir tovardan")} {sync.summary.reserveStock} {t("dona kam ko‘rsatiladi — oxirgi donani ikki joyda bir vaqtda sotib qo‘ymaslik uchun.")}
              </p>
            ) : null}

            <div style={{ overflowX: 'auto' }}>
              <table className="alv-table" style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>SKU</th>
                    <th style={{ textAlign: 'left' }}>{t("Nomi")}</th>
                    <th style={{ textAlign: 'right' }}>{t("Qoldiq (biz / Uzum)")}</th>
                    <th style={{ textAlign: 'left' }}>{t("Izoh")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sync.rows
                    .filter((r) => r.action !== "ok")
                    .slice(0, 40)
                    .map((r) => (
                      <tr key={`${r.sku}-${r.externalId ?? 'x'}`}>
                        <td>
                          <code>{r.sku}</code>
                        </td>
                        <td>{r.nameUz}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {r.local.available ?? '—'} / {r.remote.stock ?? '—'}
                          {r.target.stock !== null && r.target.stock !== r.remote.stock ? (
                            <strong> → {r.target.stock}</strong>
                          ) : null}
                        </td>
                        <td style={{ color: 'var(--alv-muted)' }}>{r.note}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section className="alv-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontFamily: 'var(--alv-font-display)' }}>{t("Sharhlar")}</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
          {t("Import qilingan sharh saytda «Uzum’dan» belgisi bilan chiqadi va moderatsiyaga tushadi. «Tasdiqlangan xarid» belgisi qo‘yilmaydi — xarid bizda emas, Uzum’da qilingan.")}
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
            {busy === "dry" ? t("Sinalmoqda…") : t("Sinov (hech narsa yozilmaydi)")}
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
            {busy === "real" ? t("Import qilinmoqda…") : t("Import qilish")}
          </Button>
        </div>

        {imported ? (
          <>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              <Stat label={t("Uzum’da")} value={imported.total} />
              <Stat label={imported.dryRun ? 'Yozilardi' : 'Yozildi'} value={imported.created} />
              <Stat label={t("Takror")} value={imported.duplicate} />
              <Stat label={t("Mahsulot topilmadi")} value={imported.unmatched} />
              <Stat label={t("O‘qib bo‘lmadi")} value={imported.unreadable} />
            </div>
            {imported.dryRun ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
                {t("Bu sinov edi — bazaga hech narsa yozilmadi.")}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 13 }}>
                {t("Sharhlar «Sharhlar» bo‘limida moderatsiyani kutmoqda.")}
              </p>
            )}
            {imported.unmatchedSample.length > 0 ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {t("Mahsuloti topilmagan sharhlar (SKU bo‘yicha):")}
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: 'grid', gap: 3 }}>
                  {imported.unmatchedSample.map((u) => (
                    <li key={u.externalId}>
                      {u.sku ?? t("SKU yo‘q")} · {u.rating}★
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
      <div style={{ fontSize: 19, fontWeight: 800 }}>{fmtNumber(value)}</div>
      <div style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>{label}</div>
    </div>
  );
}
