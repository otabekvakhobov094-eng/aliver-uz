'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import { AdminShell } from '@/components/AdminShell';
import { AdminApiError, adminApi, type SettingItem, type SettingsPayload } from '@/lib/api';

/**
 * Sozlamalar — TZ-2, 4.10-bo'lim.
 *
 * `Setting` jadvali kalit/qiymat, shuning uchun har bir kalit serverdagi
 * ta'rifdan keladi: turi, izohi, chegaralari. UI shu ta'rifga qarab
 * to'g'ri boshqaruv elementini chizadi — xom JSON muharriri emas.
 */

function equal(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return a === b;
}

function Field({
  item,
  value,
  error,
  onChange,
}: {
  item: SettingItem;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
}) {
  const id = `set-${item.key.replace(/\./g, '-')}`;
  const border = error ? '1px solid var(--alv-danger, #C0392B)' : '1px solid var(--alv-line)';
  const input: React.CSSProperties = {
    width: '100%',
    maxWidth: 420,
    padding: '9px 12px',
    borderRadius: 10,
    border,
    fontSize: 14,
    background: 'var(--alv-surface)',
    color: 'var(--alv-ink)',
  };

  let control: React.ReactNode;
  switch (item.type) {
    case 'boolean':
      control = (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--alv-brand, #D6336C)' }}
          />
          <span style={{ fontSize: 14 }}>{value === true ? t("Yoqilgan") : t("O‘chirilgan")}</span>
        </label>
      );
      break;
    case 'enum':
      control = (
        <select
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          style={input}
        >
          {(item.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.label)}
            </option>
          ))}
        </select>
      );
      break;
    case 'number':
      control = (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            id={id}
            type="number"
            inputMode="numeric"
            value={typeof value === 'number' ? value : ''}
            min={item.min}
            max={item.max}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            style={{ ...input, maxWidth: 160, fontVariantNumeric: 'tabular-nums' }}
          />
          {item.unit ? (
            <span style={{ color: 'var(--alv-muted)', fontSize: 14 }}>{item.unit}</span>
          ) : null}
        </div>
      );
      break;
    case 'stringList':
      control = (
        <input
          id={id}
          type="text"
          value={Array.isArray(value) ? (value as string[]).join(', ') : ''}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((v) => v.trim())
                .filter((v) => v !== ''),
            )
          }
          placeholder={t("Vergul bilan ajrating")}
          style={input}
        />
      );
      break;
    default:
      control = (
        <input
          id={id}
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          style={input}
        />
      );
  }

  /*
   * Qator kengligi CSS da, inline uslubda emas.
   *
   * Ilgari ikki ustun inline `gridTemplateColumns` bilan berilgan edi.
   * Inline uslub media-so'rovdan KUCHLIROQ, ya'ni telefonda ham ikki
   * ustun bo'lib qolardi va maydonga sig'magan qiymat kesilib
   * ko'rinardi — «+998 90 199 99 3» degan holatda.
   */
  return (
    <div className="alv-set__row">
      <div style={{ minWidth: 0 }}>
        <label
          htmlFor={id}
          style={{ fontSize: 14.5, fontWeight: 600, display: 'block', marginBottom: 4 }}
        >
          {t(item.label)}
          {item.sensitive ? (
            <span
              className="alv-badge alv-badge--neutral"
              style={{ height: 18, fontSize: 9, marginLeft: 8, verticalAlign: 'middle' }}
              title={t("Faqat Super Admin o‘zgartira oladi")}
            >
              {t("nozik")}
            </span>
          ) : null}
        </label>
        {item.help ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)', lineHeight: 1.55 }}>
            {item.help}
          </p>
        ) : null}
        <code style={{ fontSize: 11.5, color: 'var(--alv-muted)' }}>{item.key}</code>
      </div>
      <div style={{ minWidth: 0 }}>
        {control}
        {item.missing ? (
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--alv-amber, #9A5A12)' }}>
            {t("Bazada yo‘q — saqlasangiz yaratiladi")}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--alv-danger, #C0392B)' }}
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setFailure('');
    try {
      const payload = await adminApi.settings();
      setData(payload);
      setDraft(Object.fromEntries(payload.settings.map((s) => [s.key, s.value])));
      setErrors({});
    } catch (e) {
      setFailure((e as Error).message || 'Sozlamalar yuklanmadi');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Faqat haqiqatan o'zgargan kalitlar yuboriladi. */
  const changed = useMemo(() => {
    if (!data) return {};
    const out: Record<string, unknown> = {};
    for (const s of data.settings) {
      if (!equal(draft[s.key], s.value)) out[s.key] = draft[s.key];
    }
    return out;
  }, [data, draft]);

  const changedCount = Object.keys(changed).length;

  async function save() {
    setSaving(true);
    setNotice('');
    setFailure('');
    setErrors({});
    try {
      const res = await adminApi.saveSettings(changed);
      setNotice(`${res.saved} ta sozlama saqlandi`);
      await load();
    } catch (e) {
      if (e instanceof AdminApiError && e.fieldErrors) {
        setErrors(e.fieldErrors);
        setFailure('Ba’zi maydonlarda xato bor — hech narsa saqlanmadi');
      } else {
        setFailure((e as Error).message || 'Saqlab bo‘lmadi');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title={t("Sozlamalar")}>
      {failure ? (
        <div
          role="alert"
          className="alv-card"
          style={{
            padding: 16,
            marginBottom: 18,
            borderLeft: '3px solid var(--alv-danger, #C0392B)',
          }}
        >
          {failure}
        </div>
      ) : null}
      {notice ? (
        <div
          className="alv-card"
          style={{ padding: 16, marginBottom: 18, borderLeft: '3px solid var(--alv-mint, #1F7A5C)' }}
        >
          {notice}
        </div>
      ) : null}

      {!data ? (
        <p style={{ color: 'var(--alv-muted)' }}>{t("Yuklanmoqda…")}</p>
      ) : (
        <>
          {data.groups.map((group) => {
            const items = data.settings.filter((s) => s.group === group.key);
            if (items.length === 0) return null;
            return (
              <section key={group.key} style={{ marginBottom: 34 }}>
                <h2 style={{ fontSize: 18, margin: '0 0 2px' }}>{t(group.label)}</h2>
                {group.help ? (
                  <p style={{ margin: '0 0 6px', color: 'var(--alv-muted)', fontSize: 13.5 }}>
                    {group.help}
                  </p>
                ) : null}
                <div className="alv-card" style={{ padding: '4px 20px 18px' }}>
                  {items.map((item) => (
                    <Field
                      key={item.key}
                      item={item}
                      value={draft[item.key]}
                      error={errors[item.key]}
                      onChange={(v) => setDraft((d) => ({ ...d, [item.key]: v }))}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Saqlash paneli faqat o'zgarish bo'lganda chiqadi va ekran
              pastida yopishib turadi — 24 ta maydonni aylantirib, keyin
              tugmani qidirish kerak bo'lmasin. */}
          {changedCount > 0 ? (
            <div
              style={{
                position: 'sticky',
                bottom: 0,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 14,
                padding: '14px 18px',
                marginTop: 8,
                background: 'var(--alv-ink)',
                color: '#fff',
                borderRadius: 12,
              }}
            >
              <strong style={{ fontSize: 14 }}>{changedCount} {t("ta o‘zgarish saqlanmagan")}</strong>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => data && setDraft(Object.fromEntries(data.settings.map((s) => [s.key, s.value])))}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.35)',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {t("Bekor qilish")}
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                style={{
                  padding: '9px 22px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--alv-brand, #D6336C)',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: saving ? 'wait' : 'pointer',
                  fontSize: 14,
                }}
              >
                {saving ? t("Saqlanmoqda…") : t("Saqlash")}
              </button>
            </div>
          ) : null}
        </>
      )}
    </AdminShell>
  );
}
