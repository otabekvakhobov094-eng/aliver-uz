'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type AdminDiscount } from '@/lib/api';
import { fmtDate, fmtNumber } from '@/lib/order-labels';

/** Chegirmalar — TZ 47, TZ-2 4.7. */

const STATES = [
  { key: '', label: 'Barchasi' },
  { key: 'active', label: 'Faol' },
  { key: 'scheduled', label: 'Rejalashtirilgan' },
  { key: 'expired', label: 'Tugagan' },
];

const TYPES = [
  { value: 'PERCENT', label: 'Foiz' },
  { value: 'FIXED_AMOUNT', label: 'Belgilangan summa' },
  { value: 'FREE_SHIPPING', label: 'Bepul yetkazish' },
];

const SCOPES = [
  { value: 'CART', label: 'Butun savat' },
  { value: 'PRODUCT', label: 'Tanlangan mahsulotlar' },
  { value: 'CATEGORY', label: 'Kategoriya' },
  { value: 'COLLECTION', label: 'Kolleksiya' },
];

const EMPTY = {
  code: '',
  nameUz: '',
  nameRu: '',
  type: 'PERCENT',
  scope: 'CART',
  value: 10,
  minOrderAmount: '',
  usageLimit: '',
  usagePerCustomer: '',
  stackable: false,
  startsAt: '',
  endsAt: '',
};

function money(tiyin: string | null): string {
  if (!tiyin) return '—';
  return `${fmtNumber(Number(tiyin) / 100)} ${t('so‘m')}`;
}

function valueText(d: AdminDiscount): string {
  if (d.type === 'FREE_SHIPPING') return 'Bepul yetkazish';
  if (d.type === 'PERCENT') return `${d.value}%`;
  return money(String(d.value));
}

function dateText(v: string | null): string {
  return fmtDate(v);
}

export default function DiscountsPage() {
  const [items, setItems] = useState<AdminDiscount[]>([]);
  const [state, setState] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setItems(await adminApi.discounts(state || undefined));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [state]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(ok);
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const input: React.CSSProperties = {
    padding: '9px 12px',
    borderRadius: 10,
    border: '1px solid var(--alv-line)',
    fontSize: 14,
    background: 'var(--alv-surface)',
    color: 'var(--alv-ink)',
    minWidth: 0,
  };

  return (
    <AdminShell title={t("Chegirmalar")}>
      {error ? (
        <div
          role="alert"
          className="alv-card"
          style={{ padding: 14, marginBottom: 16, borderLeft: '3px solid var(--alv-danger,#C0392B)' }}
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          className="alv-card"
          style={{ padding: 14, marginBottom: 16, borderLeft: '3px solid var(--alv-mint,#1F7A5C)' }}
        >
          {notice}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {STATES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setState(s.key)}
            aria-pressed={s.key === state}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: '1px solid var(--alv-line)',
              background: s.key === state ? 'var(--alv-ink)' : 'var(--alv-surface)',
              color: s.key === state ? '#fff' : 'var(--alv-ink)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t(s.label)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            padding: '8px 18px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--alv-brand,#D6336C)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {open ? t("Yopish") : t("Yangi chegirma")}
        </button>
      </div>

      {open ? (
        <form
          className="alv-card"
          style={{ padding: 20, marginBottom: 22, display: 'grid', gap: 14 }}
          onSubmit={async (e) => {
            e.preventDefault();
            const done = await run(
              () =>
                adminApi.createDiscount({
                  code: form.code || null,
                  nameUz: form.nameUz,
                  nameRu: form.nameRu,
                  type: form.type,
                  scope: form.scope,
                  value: Number(form.value),
                  minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) * 100 : null,
                  usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
                  usagePerCustomer: form.usagePerCustomer ? Number(form.usagePerCustomer) : null,
                  stackable: form.stackable,
                  startsAt: form.startsAt || null,
                  endsAt: form.endsAt || null,
                }),
              'Chegirma yaratildi',
            );
            if (done) {
              setForm(EMPTY);
              setOpen(false);
            }
          }}
        >
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}
          >
            <input
              required
              placeholder={t("Nomi (o‘zbekcha)")}
              value={form.nameUz}
              onChange={(e) => setForm({ ...form, nameUz: e.target.value })}
              style={input}
            />
            <input
              required
              placeholder={t("Nomi (ruscha)")}
              value={form.nameRu}
              onChange={(e) => setForm({ ...form, nameRu: e.target.value })}
              style={input}
            />
            <input
              placeholder={t("Promokod (bo‘sh = avtomatik)")}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              style={input}
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              style={input}
              aria-label={t("Chegirma turi")}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {form.type !== 'FREE_SHIPPING' ? (
              <input
                required
                type="number"
                min={0}
                placeholder={form.type === 'PERCENT' ? 'Foiz' : 'Summa (tiyin)'}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                style={input}
              />
            ) : null}
            <select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              style={input}
              aria-label={t("Qamrov")}
            >
              {SCOPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {t(s.label)}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              placeholder={t("Minimal summa (so‘m)")}
              value={form.minOrderAmount}
              onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
              style={input}
            />
            <input
              type="number"
              min={1}
              placeholder={t("Umumiy chegara")}
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
              style={input}
            />
            <input
              type="number"
              min={1}
              placeholder={t("Bitta mijozga")}
              value={form.usagePerCustomer}
              onChange={(e) => setForm({ ...form, usagePerCustomer: e.target.value })}
              style={input}
            />
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5 }}>
              <span style={{ color: 'var(--alv-muted)' }}>{t("Boshlanish")}</span>
              <input
                type="date"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                style={input}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5 }}>
              <span style={{ color: 'var(--alv-muted)' }}>{t("Tugash")}</span>
              <input
                type="date"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                style={input}
              />
            </label>
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={form.stackable}
              onChange={(e) => setForm({ ...form, stackable: e.target.checked })}
              style={{ width: 17, height: 17, accentColor: 'var(--alv-brand,#D6336C)' }}
            />
            {t("Boshqa chegirmalar bilan birga ishlaydi")}
          </label>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
            {t("Birlashtirishni yoqishdan oldin Sozlamalardagi «Maksimal umumiy chegirma» qiymatini tekshiring — u yakuniy chegani ushlab turadi.")}
          </p>

          <button
            type="submit"
            disabled={busy}
            style={{
              justifySelf: 'start',
              padding: '10px 22px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--alv-ink)',
              color: '#fff',
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            {t("Yaratish")}
          </button>
        </form>
      ) : null}

      <div className="alv-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              {[t("Nomi"), t("Kod"), t("Qiymat"), t("Shart"), t("Muddat"), t("Ishlatilgan"), ''].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--alv-line)',
                    fontSize: 11,
                    letterSpacing: '.1em',
                    textTransform: 'uppercase',
                    color: 'var(--alv-muted)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id} style={{ opacity: d.isActive ? 1 : 0.55 }}>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--alv-line)' }}>
                  <strong>{d.nameUz}</strong>
                  <div style={{ color: 'var(--alv-muted)', fontSize: 13 }}>
                    {SCOPES.find((s) => s.value === d.scope)?.label}
                    {d.stackable ? t(" · birlashadi") : ''}
                  </div>
                </td>
                <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--alv-line)' }}>
                  {d.code ? (
                    <code style={{ fontSize: 13 }}>{d.code}</code>
                  ) : (
                    <span style={{ color: 'var(--alv-muted)' }}>{t("avtomatik")}</span>
                  )}
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--alv-line)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {valueText(d)}
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--alv-line)',
                    color: 'var(--alv-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.minOrderAmount ? `${money(d.minOrderAmount)} dan` : '—'}
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--alv-line)',
                    color: 'var(--alv-muted)',
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {dateText(d.startsAt)} → {dateText(d.endsAt)}
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--alv-line)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {d.usedCount}
                  {d.usageLimit ? ` / ${d.usageLimit}` : ''}
                </td>
                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--alv-line)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      void run(
                        () => adminApi.toggleDiscount(d.id),
                        d.isActive ? 'To‘xtatildi' : 'Yoqildi',
                      )
                    }
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--alv-line)',
                      background: 'transparent',
                      color: 'var(--alv-ink)',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    {d.isActive ? t("To‘xtatish") : t("Yoqish")}
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 28, textAlign: 'center', color: 'var(--alv-muted)' }}>
                  {state ? t("Bu holatda chegirma yo‘q") : t("Hali chegirma yaratilmagan")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
