'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import { Badge, Button, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import {
  adminApi,
  type AdminDeliveryMethod,
  type AdminRegion,
  type MethodRegionRow,
} from '@/lib/api';
import { sumInputToTiyin, tiyinToSumInput } from '@/lib/order-labels';

const TYPE_LABEL: Record<string, string> = {
  COURIER: 'Kuryer',
  EXPRESS: 'Ekspress',
  PICKUP: 'Olib ketish',
};

type Tab = 'methods' | 'regions';

/**
 * Yetkazish boshqaruvi.
 *
 * Narxlar admin panelda o'zgaradi — kodda emas. Ekspress usuli uchun
 * hudud yozuvi yo'q bo'lsa u MAVJUD EMAS deb hisoblanadi, qolgan
 * usullar esa standart narx bilan ishlaydi; matritsada shu farq ochiq
 * ko'rsatilgan.
 */
export default function DeliveryPage() {
  const [tab, setTab] = useState<Tab>('methods');
  const [methods, setMethods] = useState<AdminDeliveryMethod[]>([]);
  const [regions, setRegions] = useState<AdminRegion[]>([]);
  const [selected, setSelected] = useState<AdminDeliveryMethod | null>(null);
  const [matrix, setMatrix] = useState<MethodRegionRow[]>([]);
  // Faqat TEGILGAN qatorlar saqlanadi. Aks holda "saqlash" tugmasi
  // barcha hududlar uchun yozuv yaratib qo'yardi va standart narxni
  // muzlatib qo'yardi: keyin usulning asosiy narxini oshirsangiz,
  // checkout eski narxni ko'rsatib turardi.
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [m, r] = await Promise.all([adminApi.deliveryMethods(), adminApi.deliveryRegions()]);
      setMethods(m);
      setRegions(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openMatrix = async (method: AdminDeliveryMethod) => {
    setSelected(method);
    setNotice(null);
    try {
      const res = await adminApi.methodRegions(method.id);
      setMatrix(res.rows);
      setTouched(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  };

  const saveMatrix = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      // Allaqachon sozlangan qatorlar va shu safar tahrirlanganlar.
      const rows = matrix
        .filter((r) => r.configured || touched.has(r.regionId))
        .map((r) => ({
          regionId: r.regionId,
          price: Number(r.price),
          freeThreshold: r.freeThreshold === null ? null : Number(r.freeThreshold),
          daysMin: r.daysMin,
          daysMax: r.daysMax,
          isAvailable: r.isAvailable,
        }));

      if (rows.length === 0) {
        setNotice('O‘zgarish yo‘q — saqlanadigan qator topilmadi.');
        return;
      }

      const res = await adminApi.saveMethodRegions(selected.id, rows);
      setMatrix(res.rows);
      setTouched(new Set());
      setNotice(`${rows.length} ta hudud saqlandi.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const toggleMethod = async (m: AdminDeliveryMethod) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.setMethodActive(m.id, !m.isActive);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const toggleRegion = async (r: AdminRegion) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.setRegionActive(r.id, !r.isActive);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const patch = (regionId: string, change: Partial<MethodRegionRow>) => {
    setMatrix((rows) => rows.map((r) => (r.regionId === regionId ? { ...r, ...change } : r)));
    setTouched((prev) => new Set(prev).add(regionId));
  };

  return (
    <AdminShell title={t("Yetkazib berish")}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <TabButton active={tab === 'methods'} onClick={() => setTab('methods')}>
          {t("Usullar va narxlar")}
        </TabButton>
        <TabButton active={tab === 'regions'} onClick={() => setTab('regions')}>
          {t("Hududlar")}
        </TabButton>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="mint">{notice}</Alert> : null}

      {tab === "methods" ? (
        <div className="alv-admin-cols">
          <section style={card}>
            <h2 style={h2}>{t("Usullar")}</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr style={thRow}>
                    <th style={th}>{t("Usul")}</th>
                    <th style={{ ...th, textAlign: 'right' }}>{t("Narx")}</th>
                    <th style={{ ...th, textAlign: 'right' }}>{t("Bepul chegara")}</th>
                    <th style={th}>{t("Muddat")}</th>
                    <th style={th} />
                  </tr>
                </thead>
                <tbody>
                  {methods.map((m) => (
                    <tr
                      key={m.id}
                      style={{
                        borderTop: '1px solid var(--alv-line)',
                        background: selected?.id === m.id ? 'var(--alv-surface-2)' : undefined,
                      }}
                    >
                      <td style={td}>
                        <div style={{ fontWeight: 700 }}>{m.nameUz}</div>
                        <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                          {t(TYPE_LABEL[m.type] ?? m.type)} · {m.code}
                          {m.regionsConfigured > 0 ? ` · ${m.regionsConfigured} hudud` : ''}
                        </div>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>{formatTiyin(m.basePrice)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        {m.freeThreshold ? formatTiyin(m.freeThreshold) : '—'}
                      </td>
                      <td style={td}>
                        {m.estimatedDaysMin}–{m.estimatedDaysMax} {t("kun")}
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <div style={{ display: 'grid', gap: 6, justifyItems: 'end' }}>
                          <Badge tone={m.isActive ? 'mint' : 'neutral'}>
                            {m.isActive ? t("Faol") : t("O‘chirilgan")}
                          </Badge>
                          <Button variant="ghost" size="sm" onClick={() => void openMatrix(m)}>
                            {t("Hududlar narxi")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => void toggleMethod(m)}
                          >
                            {m.isActive ? t("O‘chirish") : t("Yoqish")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={card}>
            <h2 style={h2}>{selected ? `${selected.nameUz} — hududlar` : t("Usulni tanlang")}</h2>

            {!selected ? (
              <p style={muted}>
                {t("Chapdagi ro‘yxatdan usulni tanlang — hudud bo‘yicha narx, bepul chegara va muddat shu yerda tahrirlanadi.")}
              </p>
            ) : (
              <>
                {selected.type === 'EXPRESS' ? (
                  <p style={{ ...muted, color: 'var(--alv-warn)' }}>
                    {t("Ekspress faqat siz belgilagan hududlarda ishlaydi. «Mavjud» belgilanmagan hududda u checkout da umuman ko‘rinmaydi.")}
                  </p>
                ) : (
                  <p style={muted}>
                    {t("Hudud uchun alohida narx belgilamasangiz standart narx ishlatiladi — tegilmagan qatorlar saqlanmaydi.")}
                  </p>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                    <thead>
                      <tr style={thRow}>
                        <th style={th}>{t("Hudud")}</th>
                        <th style={th}>{t("Mavjud")}</th>
                        <th style={th}>{t("Narx (so‘m)")}</th>
                        <th style={th}>{t("Bepul chegara")}</th>
                        <th style={th}>{t("Muddat")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.map((r) => (
                        <tr key={r.regionId} style={{ borderTop: '1px solid var(--alv-line)' }}>
                          <td style={td}>
                            <div style={{ fontWeight: 600 }}>{r.regionNameUz}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--alv-muted)' }}>
                              {!r.regionActive ? t("hudud o‘chirilgan · ") : ''}
                              {touched.has(r.regionId)
                                ? t("o‘zgartirildi")
                                : r.configured
                                  ? t("sozlangan")
                                  : t("standart narx")}
                            </div>
                          </td>
                          <td style={td}>
                            <input
                              type="checkbox"
                              checked={r.isAvailable}
                              onChange={(e) => patch(r.regionId, { isAvailable: e.target.checked })}
                              aria-label={`${r.regionNameUz} — mavjud`}
                              style={{ width: 20, height: 20, accentColor: 'var(--alv-brand)' }}
                            />
                          </td>
                          <td style={td}>
                            <input
                              value={tiyinToSumInput(r.price)}
                              onChange={(e) => {
                                const t = sumInputToTiyin(e.target.value);
                                if (t !== null) patch(r.regionId, { price: t.toString() });
                              }}
                              inputMode="decimal"
                              style={{ ...input, width: 120 }}
                            />
                          </td>
                          <td style={td}>
                            <input
                              value={r.freeThreshold ? tiyinToSumInput(r.freeThreshold) : ''}
                              placeholder={t("yo‘q")}
                              onChange={(e) => {
                                const raw = e.target.value.trim();
                                if (raw === '') {
                                  patch(r.regionId, { freeThreshold: null });
                                  return;
                                }
                                const t = sumInputToTiyin(raw);
                                if (t !== null) patch(r.regionId, { freeThreshold: t.toString() });
                              }}
                              inputMode="decimal"
                              style={{ ...input, width: 120 }}
                            />
                          </td>
                          <td style={td}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input
                                value={r.daysMin}
                                onChange={(e) =>
                                  patch(r.regionId, { daysMin: Number(e.target.value) || 0 })
                                }
                                inputMode="numeric"
                                style={{ ...input, width: 56 }}
                                aria-label={t("Minimal kun")}
                              />
                              <span>–</span>
                              <input
                                value={r.daysMax}
                                onChange={(e) =>
                                  patch(r.regionId, { daysMax: Number(e.target.value) || 0 })
                                }
                                inputMode="numeric"
                                style={{ ...input, width: 56 }}
                                aria-label={t("Maksimal kun")}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button
                  variant="primary"
                  disabled={busy || touched.size === 0}
                  onClick={() => void saveMatrix()}
                >
                  {touched.size === 0 ? t("O‘zgarish yo‘q") : `Saqlash (${touched.size} ta hudud)`}
                </Button>
              </>
            )}
          </section>
        </div>
      ) : (
        <section style={card}>
          <h2 style={h2}>{t("Viloyatlar va tumanlar")}</h2>
          <p style={muted}>
            {t("Hudud o‘chirilsa checkout da ko‘rinmaydi, lekin eski buyurtmalarda saqlanib qoladi — yozuv hech qachon o‘chirilmaydi.")}
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            {regions.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
                  opacity: r.isActive ? 1 : 0.6,
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong>{r.nameUz}</strong>
                  <span style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
                    {r.code} · {r.districtsCount} {t("tuman")}
                  </span>
                  <Badge tone={r.isActive ? 'mint' : 'neutral'}>
                    {r.isActive ? t("Faol") : t("O‘chirilgan")}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    style={{ marginLeft: 'auto' }}
                    onClick={() => void toggleRegion(r)}
                  >
                    {r.isActive ? t("O‘chirish") : t("Yoqish")}
                  </Button>
                </div>

                {r.districts.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    {r.districts.map((d) => (
                      <span
                        key={d.id}
                        style={{
                          fontSize: 12,
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: d.isActive ? 'var(--alv-surface-2)' : 'var(--alv-bg)',
                          color: d.isActive ? 'var(--alv-ink)' : 'var(--alv-muted)',
                          textDecoration: d.isActive ? 'none' : 'line-through',
                        }}
                      >
                        {d.nameUz}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      )}
    </AdminShell>
  );
}

const card: React.CSSProperties = {
  background: 'var(--alv-surface)',
  borderRadius: 'var(--alv-radius-lg)',
  padding: 18,
  boxShadow: 'var(--alv-shadow-sm)',
  display: 'grid',
  gap: 12,
  marginBottom: 16,
};
const h2: React.CSSProperties = { fontFamily: 'var(--alv-font-display)', fontSize: 16, margin: 0 };
const th: React.CSSProperties = { padding: '10px 12px', fontWeight: 700 };
const thRow: React.CSSProperties = { fontSize: 12.5, color: 'var(--alv-muted)', textAlign: 'left' };
const td: React.CSSProperties = { padding: 12, fontSize: 13.5, verticalAlign: 'top' };
const muted: React.CSSProperties = {
  margin: 0,
  color: 'var(--alv-muted)',
  fontSize: 13,
  lineHeight: 1.55,
};
const input: React.CSSProperties = {
  minHeight: 40,
  padding: '8px 10px',
  borderRadius: 10,
  border: 0,
  boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
  font: 'inherit',
  background: 'var(--alv-surface)',
};

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        minHeight: 44,
        padding: '0 18px',
        borderRadius: 999,
        border: 0,
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 13.5,
        background: active ? 'var(--alv-brand)' : 'var(--alv-surface)',
        color: active ? '#fff' : 'var(--alv-ink)',
        boxShadow: active ? 'none' : 'inset 0 0 0 1.5px var(--alv-line-2)',
      }}
    >
      {children}
    </button>
  );
}

function Alert({ tone, children }: { tone: 'danger' | 'mint'; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      style={{
        padding: '12px 16px',
        borderRadius: 14,
        marginBottom: 16,
        fontWeight: 600,
        fontSize: 13.5,
        background: tone === 'danger' ? 'var(--alv-danger-soft)' : 'var(--alv-mint-soft)',
        color: tone === 'danger' ? 'var(--alv-danger)' : 'var(--alv-mint)',
      }}
    >
      {children}
    </div>
  );
}
