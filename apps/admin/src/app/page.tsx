'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import { money } from '@/lib/money';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type DashboardData } from '@/lib/api';
import { fmtDate, fmtNumber } from '@/lib/order-labels';

/**
 * Admin bosh sahifasi — KPI, grafik va e'tibor talab qiladigan ishlar.
 * TZ-2, 4.9-bo'lim.
 *
 * Ilgari bu yerda 1-etap maketi turardi: sidebar `<span>` bilan chizilgan,
 * ya'ni hech narsa bosilmaydigan. Endi qobiq umumiy `AdminShell` dan
 * olinadi, shuning uchun navigatsiya bitta joyda boshqariladi.
 */

/*
 * Ro'yxat modul darajasida — ya'ni til o'rnatilishidan OLDIN
 * hisoblanadi. Shuning uchun bu yerda O'ZBEKCHA kalit turadi,
 * tarjima esa chizilgan joyida qo'llanadi.
 */
const PERIODS: Array<{ key: string; label: string }> = [
  { key: 'today', label: 'Bugun' },
  { key: 'yesterday', label: 'Kecha' },
  { key: '7d', label: '7 kun' },
  { key: '30d', label: '30 kun' },
  { key: 'month', label: 'Shu oy' },
];


function delta(current: string, previous: string): { text: string; up: boolean } | null {
  const a = Number(current ?? 0);
  const b = Number(previous ?? 0);
  if (b === 0) return null;
  const pct = ((a - b) / b) * 100;
  return { text: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, up: pct >= 0 };
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: { text: string; up: boolean } | string | null;
  tone?: 'warn';
}) {
  return (
    <div
      className="alv-card"
      style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}
    >
      <div style={{ color: 'var(--alv-muted)', fontSize: 13 }}>{label}</div>
      <strong
        style={{
          /* Telefonda ikki ustunda «1 845 000 so'm» uch qatorga
             bo'linib ketardi. Kenglikka qarab kichrayadi. */
          fontSize: 'clamp(19px, 4.6vw, 26px)',
          lineHeight: 1.15,
          fontVariantNumeric: 'tabular-nums',
          color: tone === 'warn' ? 'var(--alv-amber, #9A5A12)' : undefined,
          overflowWrap: 'break-word',
        }}
      >
        {value}
      </strong>
      {hint ? (
        <div style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>
          {typeof hint === "string" ? (
            hint
          ) : (
            <span style={{ color: hint.up ? 'var(--alv-mint, #1F7A5C)' : 'var(--alv-danger, #C0392B)' }}>
              {hint.text} <span style={{ color: 'var(--alv-muted)' }}>{t("oldingi davrga nisbatan")}</span>
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Oddiy ustunli grafik. Kutubxonasiz — sahifa og'irlashmasin.
 *
 * `series` YO'Q bo'lishi mumkin: javob kutilgandan boshqa shaklda
 * kelsa (eski API, proksi xato sahifasi, qisman javob), massiv o'rniga
 * `undefined` keladi. Ilgari bu chizish paytida xato bo'lardi va
 * React uni ushlay olmasdi — BUTUN panel oq ekranga aylanardi.
 * Endi grafik shunchaki bo'sh holatini ko'rsatadi.
 */
function RevenueChart({ series }: { series?: DashboardData['series'] }) {
  if (!Array.isArray(series) || series.length === 0) {
    return (
      <p style={{ color: 'var(--alv-muted)', margin: 0 }}>
        {t("Bu davrda to&apos;langan buyurtma yo&apos;q.")}
      </p>
    );
  }
  const values = series.map((p) => Number(p.revenue ?? 0));
  const peak = Math.max(...values, 1);
  const first = series[0];
  const last = series[series.length - 1];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
          height: 180,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {series.map((point) => {
          const value = Number(point.revenue ?? 0);
          const height = Math.max(2, Math.round((value / peak) * 168));
          const day = new Date(point.day);
          return (
            <div
              key={point.day}
              title={`${fmtDate(day)} — ${money(point.revenue)} · ${point.orders} ${t('ta buyurtma')}`}
              style={{
                flex: '1 0 14px',
                minWidth: 14,
                height,
                /* Ustunlar diagramma rangida — panelda brend pushti
                   emas, neytral ko'k ishlatiladi: rang bu yerda
                   BEZAK emas, «bu o'lchov» degan belgi. */
                background: 'var(--adm-accent, #2C6ECB)',
                opacity: 0.9,
                borderRadius: '4px 4px 0 0',
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: 12,
          color: 'var(--alv-muted)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>{first ? fmtDate(first.day) : ''}</span>
        <span>{t("Eng yuqori kun:")} {money(peak)}</span>
        <span>{last ? fmtDate(last.day) : ''}</span>
      </div>
    </div>
  );
}

export default function AdminHome() {
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await adminApi.dashboard(period));
    } catch (e) {
      // Xato yutilmaydi: aks holda sahifa bo'sh turadi va sababi ko'rinmaydi.
      setError((e as Error).message || 'Ma’lumotni yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  /*
   * `data.previous` YO'Q bo'lishi mumkin: javob kutilgandan boshqa
   * shaklda kelsa (proksi xato sahifasi, eski API, qisman javob),
   * `data` haqiqiy bo'ladi-yu, ichi bo'sh qoladi. Ilgari shu yerda
   * chizish paytida xato bo'lardi va React uni ushlay olmasdi —
   * natijada BUTUN panel oq ekranga aylanardi.
   */
  const revenueDelta = data?.previous ? delta(data.revenue, data.previous.revenue) : null;
  const ordersDelta = data?.previous
    ? delta(String(data.orders), String(data.previous.orders))
    : null;

  return (
    <AdminShell title={t("Dashboard")}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
        {PERIODS.map((p) => {
          const active = p.key === period;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              aria-pressed={active}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                border: '1px solid var(--alv-line)',
                background: active ? 'var(--alv-ink)' : 'var(--alv-surface)',
                color: active ? '#fff' : 'var(--alv-ink)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t(p.label)}
            </button>
          );
        })}
      </div>

      {error ? (
        <div
          role="alert"
          className="alv-card"
          style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <strong>{t("Ma&apos;lumot yuklanmadi")}</strong>
          <span style={{ color: 'var(--alv-muted)', fontSize: 14 }}>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 18px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--alv-ink)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {t("Qayta urinish")}
          </button>
        </div>
      ) : null}

      {loading && !data ? <p style={{ color: 'var(--alv-muted)' }}>{t("Yuklanmoqda…")}</p> : null}

      {data ? (
        <>
          {/*
            Ustunlar soni `admin.css` da: inline uslub media
            so'rovlaridan kuchli bo'lgani uchun telefon va monitor
            uchun bitta qiymat to'g'ri kelmasdi — monitorda oltita
            kartochka bir qatorga tiqilib, «1 845 000 so'm» uch
            qatorga bo'linib ketardi.
          */}
          <div className="alv-kpi">
            <Kpi label={t("Tushum")} value={money(data.revenue)} hint={revenueDelta} />
            <Kpi label={t("To'langan buyurtmalar")} value={String(data.paidOrders)} hint={ordersDelta} />
            <Kpi label={t("O'rtacha chek")} value={money(data.avgOrder)} />
            <Kpi label={t("Yangi mijozlar")} value={String(data.newCustomers)} />
            <Kpi
              label={t("Barcha buyurtmalar")}
              value={String(data.allOrders)}
              hint={`${t('shundan')} ${data.cancelledOrders} ${t('ta bekor qilingan')}`}
            />
            <Kpi
              label={t("Kam qolgan mahsulot")}
              value={String(data.lowStock)}
              tone={data.lowStock > 0 ? 'warn' : undefined}
              hint={data.lowStock > 0 ? t('Omborni to‘ldirish kerak') : t('Hammasi yetarli')}
            />
          </div>

          <section style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 14px' }}>{t("Tushum dinamikasi")}</h2>
            <div className="alv-card" style={{ padding: 20 }}>
              <RevenueChart series={data.series} />
            </div>
          </section>
        </>
      ) : null}
    </AdminShell>
  );
}
