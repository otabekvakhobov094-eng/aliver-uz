'use client';

import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';

/**
 * Yon panelda ochiladigan kichik forma.
 *
 * Kategoriya va brend uchun alohida ikkita modal yozish o'rniga bitta
 * shakl: ikkalasida ham maydonlar kam, amal bir xil (yaratish, tahrirlash,
 * o'chirish) va ular bir-biriga ergashib o'zgaradi.
 *
 * Panel modal emas, `aside`: sahifadagi ro'yxat ko'rinib turadi va
 * foydalanuvchi nima tahrirlayotganini kontekst bilan ko'radi.
 */

export interface FormField {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
  options?: Array<{ value: string; label: string }>;
  hint?: string;
  required?: boolean;
  placeholder?: string;
}

interface Props {
  title: string;
  fields: FormField[];
  initial: Record<string, unknown>;
  busy?: boolean;
  error?: string | null;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  onClose: () => void;
  onDelete?: () => void | Promise<void>;
  deleteLabel?: string;
}

export function EntityForm({
  title,
  fields,
  initial,
  busy,
  error,
  onSubmit,
  onClose,
  onDelete,
  deleteLabel = 'O‘chirish',
}: Props) {
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [confirming, setConfirming] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initial);
    setLocalError(null);
  }, [initial]);

  // Escape bilan yopilish: panel ochiq qolib ro'yxatni to'sib turmasin.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit() {
    const missing = fields.find(
      (f) => f.required && String(values[f.key] ?? '').trim() === '',
    );
    if (missing) {
      setLocalError(`«${missing.label}» to‘ldirilmagan.`);
      return;
    }
    setLocalError(null);
    void onSubmit(values);
  }

  const shown = localError ?? error ?? null;

  return (
    <aside
      className="alv-card"
      aria-label={title}
      style={{ padding: 18, display: 'grid', gap: 12, alignContent: 'start', position: 'sticky', top: 16 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>{title}</h2>
        <button type="button" onClick={onClose} aria-label={t("Yopish")} style={GHOST}>
          ✕
        </button>
      </div>

      {shown ? (
        <div role="alert" style={{ ...NOTE, borderLeft: '3px solid var(--alv-danger)' }}>
          {shown}
        </div>
      ) : null}

      {fields.map((f) => (
        <label key={f.key} style={{ display: 'grid', gap: 5, fontSize: 13 }}>
          <span style={{ fontWeight: 600 }}>
            {t(f.label)}
            {f.required ? <span style={{ color: 'var(--alv-danger)' }}> *</span> : null}
          </span>

          {f.type === "textarea" ? (
            <textarea
              rows={3}
              value={String(values[f.key] ?? '')}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              style={{ ...FIELD, resize: 'vertical' }}
            />
          ) : f.type === "select" ? (
            <select
              value={String(values[f.key] ?? '')}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              style={FIELD}
            >
              {(f.options ?? []).map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.label)}
                </option>
              ))}
            </select>
          ) : f.type === "checkbox" ? (
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={Boolean(values[f.key])}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.checked })}
              />
              <span style={{ color: 'var(--alv-muted)' }}>{f.hint}</span>
            </span>
          ) : (
            <input
              type={f.type === 'number' ? 'number' : 'text'}
              value={String(values[f.key] ?? '')}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              style={FIELD}
            />
          )}

          {f.hint && f.type !== "checkbox" ? (
            <span style={{ color: 'var(--alv-muted)', fontSize: 12, lineHeight: 1.5 }}>{f.hint}</span>
          ) : null}
        </label>
      ))}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
        <button type="button" onClick={submit} disabled={busy} style={PRIMARY(Boolean(busy))}>
          {busy ? t("Saqlanmoqda…") : t("Saqlash")}
        </button>
        {onDelete ? (
          /*
           * O'CHIRISH IKKI BOSQICHLI.
           *
           * Ilgari bitta bosishda bajarilardi va tugma «Saqlash» ning
           * yonida turardi — ya'ni bir necha piksel xato butun
           * brendni yoki kategoriyani o'chirib yuborardi. Bekor
           * qilish yo'li yo'q.
           *
           * `window.confirm` ataylab EMAS: u brauzer oynasini
           * bloklaydi va bu panelda boshqa joyda ham ishlatilmaydi.
           * Ikkinchi bosish — tugmaning o'zida, matni o'zgargan
           * holda; boshqa joyga bosilsa bekor bo'ladi.
           */
          <button
            type="button"
            onClick={() => {
              if (!confirming) {
                setConfirming(true);
                return;
              }
              setConfirming(false);
              void onDelete();
            }}
            onBlur={() => setConfirming(false)}
            disabled={busy}
            style={{
              ...GHOST,
              color: confirming ? '#fff' : 'var(--alv-danger)',
              background: confirming ? 'var(--alv-danger)' : GHOST.background,
              borderColor: 'var(--alv-danger)',
            }}
          >
            {confirming ? t('Ha, o‘chirilsin') : deleteLabel}
          </button>
        ) : null}
      </div>
    </aside>
  );
}

const FIELD: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid var(--alv-line)',
  fontSize: 14,
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  width: '100%',
  minWidth: 0,
  fontFamily: 'inherit',
};

const NOTE: React.CSSProperties = {
  padding: '10px 13px',
  borderRadius: 9,
  border: '1px solid var(--alv-line)',
  fontSize: 13.5,
  lineHeight: 1.55,
};

const GHOST: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 9,
  border: '1px solid var(--alv-line)',
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  fontSize: 13.5,
  cursor: 'pointer',
};

const PRIMARY = (busy: boolean): React.CSSProperties => ({
  padding: '9px 20px',
  borderRadius: 9,
  border: 'none',
  background: 'var(--alv-ink)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  cursor: busy ? 'progress' : 'pointer',
  opacity: busy ? 0.6 : 1,
});
