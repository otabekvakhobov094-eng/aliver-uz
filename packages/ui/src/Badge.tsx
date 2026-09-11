import type { ReactNode } from 'react';

export type BadgeTone = 'sale' | 'new' | 'top' | 'low' | 'mint' | 'neutral';

/** Mahsulot kartochkasidagi belgilar: SALE, YANGI, TOP, OZ QOLDI (TZ 20). */
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`alv-badge alv-badge--${tone}`}>{children}</span>;
}
