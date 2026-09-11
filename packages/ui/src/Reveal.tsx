'use client';

import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

/**
 * Skroll bilan ochiluvchi blok.
 *
 * Ikkita qoida:
 *
 *  1. KONTENT JS SIZ HAM KO'RINADI. Yashirish `data-reveal="hidden"`
 *     atributi orqali, va uni JS qo'yadi. JS yuklanmasa yoki xato
 *     bersa, element oddiy holatda qoladi. Agar boshlang'ich holat CSS
 *     da `opacity: 0` bo'lganda edi, bitta JS xatosi butun sahifani
 *     bo'sh qoldirardi.
 *
 *  2. BIR MARTA OCHILADI. Kuzatuvchi birinchi ko'rinishdan keyin
 *     uziladi: yuqoriga qaytganda blok qayta "yonib" chiqsa, bu
 *     bezovta qiladi va o'qishni buzadi.
 */
export function Reveal({
  as,
  children,
  delay = 0,
  className,
  ...rest
}: {
  as?: ElementType;
  children: ReactNode;
  /** 0–5: ketma-ket ochilish uchun qadam. */
  delay?: 0 | 1 | 2 | 3 | 4 | 5;
  className?: string;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Harakatni kamaytirish so'ralgan bo'lsa — umuman aralashmaymiz.
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof IntersectionObserver === 'undefined') return;

    // Element allaqachon ekranda bo'lsa (masalan sahifa o'rtasidan
    // ochilgan havola), uni yashirib keyin ko'rsatish ortiqcha miltillash.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return;

    node.setAttribute('data-reveal', 'hidden');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          node.setAttribute('data-reveal', 'shown');
          observer.disconnect();
        }
      },
      // Blok to'liq ko'rinishini kutmaymiz: pastdan 12% chiqishi yetarli,
      // aks holda animatsiya kech boshlanib, sakrab qolgandek tuyuladi.
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag
      ref={ref}
      className={className}
      {...(delay ? { 'data-reveal-delay': String(delay) } : {})}
      {...rest}
    >
      {children}
    </Tag>
  );
}
