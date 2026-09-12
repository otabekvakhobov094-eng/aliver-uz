'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { adminApi } from '@/lib/api';
import { navSections, visibleNav, type NavItem } from '@/lib/nav';
import { NavIcon } from './NavIcon';

/**
 * Admin panel qobig'i.
 *
 * NEGA QAYTA YOZILDI. Panel saytning o'zi bilan bir xil ko'rinardi:
 * pushti fon, dekorativ serif sarlavhalar, keng bo'shliqlar. Sayt
 * uchun bu to'g'ri — u sotadi. Panel esa SOTMAYDI, unda ishlanadi:
 * kuniga yuzlab qator o'qiladi, o'nlab maydon to'ldiriladi. Bunday
 * ekranda dekorativ bezak ish maydonini yeydi va matn zichligini
 * pasaytiradi.
 *
 * Shuning uchun ish uslubi: neytral kulrang fon, oq kartochkalar,
 * ixcham tipografiya, ikonkali va BO'LIMLARGA ajratilgan menyu.
 *
 * Sidebar huquqlar bo'yicha quriladi (TZ 58, 74) — foydalanuvchi
 * ko'ra olmaydigan bo'lim menyuda ham chiqmaydi.
 */
export function AdminShell({
  title,
  actions,
  description,
  children,
}: {
  title: string;
  /** Sarlavha yonidagi asosiy amallar — o'ngda turadi. */
  actions?: ReactNode;
  /** Sarlavha ostidagi bir qatorlik izoh. */
  description?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<NavItem[]>([]);
  const [role, setRole] = useState('');
  const [who, setWho] = useState<{ name: string | null; email: string | null }>({
    name: null,
    email: null,
  });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Sahifa almashganda mobil menyu yopiladi: aks holda bosgandan keyin
  // u ochiq qolib, yangi sahifani to'sib turadi.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    adminApi
      .permissions()
      .then((res) => {
        setRole(res.role);
        setWho({ name: res.fullName, email: res.email });
        setItems(visibleNav(res.permissions, res.role));
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="alv-adm__boot">
        <span className="alv-adm__spinner" aria-hidden="true" />
        Yuklanmoqda…
      </div>
    );
  }

  const sections = navSections(items);

  return (
    <div className={`alv-adm${open ? ' alv-adm--open' : ''}`}>
      {/*
        Yuqori qator — butun kenglikda va qorong'i.
        U panelni saytdan darhol ajratadi: xodim qaysi muhitda
        ishlayotganini bir qarashda ko'radi va jonli do'konda tasodifan
        tahrir qilib qo'ymaydi.
      */}
      <header className="alv-adm__top">
        <button
          type="button"
          className="alv-adm__burger"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="alv-adm-nav"
          aria-label={open ? 'Menyuni yopish' : 'Menyuni ochish'}
        >
          {open ? '✕' : '☰'}
        </button>

        <Link href="/" className="alv-adm__brand">
          ALIVER<span>.UZ</span>
        </Link>

        <span className="alv-adm__env">Admin</span>

        <div className="alv-adm__who">
          <span className="alv-adm__whoName">{who.name ?? who.email ?? 'Admin'}</span>
          <span className="alv-adm__whoRole">{role}</span>
          <button
            type="button"
            className="alv-adm__exit"
            onClick={() => {
              void adminApi
                .logout()
                .catch(() => undefined)
                .finally(() => router.push('/login'));
            }}
          >
            Chiqish
          </button>
        </div>
      </header>

      <div className="alv-adm__body">
        <button
          type="button"
          className="alv-adm__scrim"
          aria-label="Menyuni yopish"
          onClick={() => setOpen(false)}
        />

        <aside id="alv-adm-nav" className="alv-adm__side">
          <nav>
            {sections.map((section) => (
              <div key={section.key} className="alv-nav__group">
                {section.label ? (
                  <div className="alv-nav__title">{section.label}</div>
                ) : null}
                {section.items.map((item) => {
                  const base = item.href.split('#')[0];
                  const active = pathname === item.href || pathname === base;
                  return (
                    <Link
                      key={item.href}
                      href={item.ready ? item.href : '#'}
                      aria-disabled={!item.ready}
                      aria-current={active ? 'page' : undefined}
                      className={`alv-nav__item${active ? ' alv-nav__item--on' : ''}${
                        item.ready ? '' : ' alv-nav__item--off'
                      }`}
                    >
                      <NavIcon name={item.icon} />
                      <span className="alv-nav__label">{item.label}</span>
                      {!item.ready ? (
                        <span className="alv-nav__soon" title="Bu bo‘lim hali yozilmagan">
                          tez orada
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <main className="alv-adm__main">
          {/*
            Sahifa sarlavhasi va asosiy amal BIR QATORDA.
            Ilgari har bir sahifa tugmalarni o'zi xohlagan joyga
            qo'yardi — natijada bir sahifada «Yaratish» yuqorida,
            boshqasida pastda edi va xodim uni har safar qidirardi.
          */}
          <div className="alv-adm__head">
            <div className="alv-adm__headText">
              <h1>{title}</h1>
              {description ? <p>{description}</p> : null}
            </div>
            {actions ? <div className="alv-adm__actions">{actions}</div> : null}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
