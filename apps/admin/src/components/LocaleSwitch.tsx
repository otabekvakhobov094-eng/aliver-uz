'use client';

import { LOCALES, currentLocale, switchLocale, t } from '@/lib/i18n';

/** Yuqori qatordagi til tugmalari. */
export function LocaleSwitch() {
  const active = currentLocale();
  return (
    <div className="alv-adm__lang" role="group" aria-label={t("Til / Язык")}>
      {LOCALES.map((l) => (
        <button
          key={l.value}
          type="button"
          className={`alv-adm__langBtn${l.value === active ? ' alv-adm__langBtn--on' : ''}`}
          aria-pressed={l.value === active}
          onClick={() => {
            if (l.value !== active) switchLocale(l.value);
          }}
        >
          {l.value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
