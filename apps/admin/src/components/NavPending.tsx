'use client';

import { useLinkStatus } from 'next/link';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * O'tish paytidagi belgi.
 *
 * NEGA KERAK. Bosilgandan keyin sahifa ma'lumot yuklab bo'lguncha
 * ekranda HECH NARSA o'zgarmaydi. Xodim bosilmadi deb o'ylab yana
 * bosadi. Shuning uchun ikkita belgi: bosilgan bandning yonida
 * aylanma, tepada esa ingichka chiziq.
 */

const Ctx = createContext<{ pending: boolean; report: (on: boolean) => void }>({
  pending: false,
  report: () => undefined,
});

export function NavPendingProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const value = useMemo(
    () => ({
      pending: count > 0,
      report: (on: boolean) => setCount((n) => Math.max(0, n + (on ? 1 : -1))),
    }),
    [count],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Yuqoridagi chiziq. Faqat o'tish davom etayotganda ko'rinadi. */
export function NavProgress() {
  const { pending } = useContext(Ctx);
  return <div className="alv-adm__progress" data-on={pending ? '1' : '0'} aria-hidden="true" />;
}

/**
 * `Link` ICHIDA turishi shart: `useLinkStatus` aynan o'z havolasining
 * holatini beradi.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  const { report } = useContext(Ctx);

  useEffect(() => {
    if (!pending) return;
    report(true);
    return () => report(false);
  }, [pending, report]);

  return pending ? <span className="alv-nav__spin" aria-label="Yuklanmoqda" /> : null;
}
