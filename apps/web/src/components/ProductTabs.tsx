'use client';

import { useState } from 'react';

export interface Tab {
  key: string;
  label: string;
  body: string | null;
}

/** Mahsulot sahifasidagi tablar: Tavsif, Foydasi, Tarkibi, Qo‘llash, Ogohlantirish. */
export function ProductTabs({ tabs }: { tabs: Tab[] }) {
  const visible = tabs.filter((t) => t.body && t.body.trim().length > 0);
  const [active, setActive] = useState(visible[0]?.key ?? '');
  if (visible.length === 0) return null;

  return (
    <div>
      <div className="alv-tabs" role="tablist">
        {visible.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            className={`alv-tab${active === t.key ? ' alv-tab--on' : ''}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {visible.map((t) =>
        t.key === active ? (
          <div
            key={t.key}
            role="tabpanel"
            style={{ padding: '22px 0', maxWidth: 780, lineHeight: 1.75 }}
          >
            {t.body!.split('\n').map((line, i) => (
              <p key={i} style={{ margin: '0 0 12px' }}>
                {line}
              </p>
            ))}
          </div>
        ) : null,
      )}
    </div>
  );
}
