'use client';

import { useId } from 'react';

/**
 * ALIVER.UZ logotipi — animatsion matn belgisi.
 *
 * HOZIRCHA BU VAQTINCHALIK YECHIM. aliver.com dagi rasmiy logotip fayli
 * hali yo'q (uni yuklab olishga urinish tarmoq siyosati tomonidan
 * bloklandi). Shuning uchun belgi saytning o'z shriftida chizilgan.
 *
 * Rasmiy logo kelganda ALMASHTIRISH OSON: `mark` qismini `<image>` yoki
 * import qilingan SVG bilan almashtirish yetarli — o'rash, o'lchamlar
 * va animatsiya o'z joyida qoladi.
 *
 * Animatsiya matn ustidan o'tuvchi yorug'likdan iborat: kosmetika
 * qadog'idagi yaltiroq plyonka effekti. U `<text>` ning o'zida emas,
 * gradient ichida harakatlanadi — shuning uchun matn har doim to'liq
 * o'qiladi va qidiruv tizimlari uni ko'radi.
 */
export function AliverLogo({
  height = 26,
  animated = true,
  title = 'ALIVER.UZ',
}: {
  height?: number;
  /** Sarlavhada `false`: doimiy harakat diqqatni tortadi. */
  animated?: boolean;
  title?: string;
}) {
  // Bitta sahifada bir nechta logo bo'lishi mumkin — gradient id lari
  // to'qnashmasligi kerak, aks holda ikkinchisi birinchisining
  // gradientini oladi.
  const id = useId().replace(/:/g, '');
  const sweepId = `alv-logo-sweep-${id}`;

  return (
    <svg
      role="img"
      aria-label={title}
      height={height}
      viewBox="0 0 208 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <title>{title}</title>

      <defs>
        {/* Yorug'lik dog'i — matn ustidan chapdan o'ngga suriladi. */}
        <linearGradient id={sweepId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          {animated ? (
            <animate
              attributeName="x1"
              values="-1.4;1;1"
              keyTimes="0;0.45;1"
              dur="5s"
              repeatCount="indefinite"
            />
          ) : null}
          {animated ? (
            <animate
              attributeName="x2"
              values="-0.4;2;2"
              keyTimes="0;0.45;1"
              dur="5s"
              repeatCount="indefinite"
            />
          ) : null}
        </linearGradient>
      </defs>

      <g>
        {/*
          Ikki qism BITTA `<text>` ichida, `tspan` bilan.

          Ilgari ".UZ" alohida `<text>` da qat'iy `x` bilan turardi va
          shrift yuklanmaganda (yoki boshqa shrift tushganda) "ALIVER"
          bilan orasida bo'shliq paydo bo'lardi. `tspan` esa oldingi
          qismdan KEYIN joylashadi — shrift qanday bo'lishidan qat'i nazar.
        */}
        <text
          x="0"
          y="25"
          fontFamily="var(--alv-font-display, 'Prata', Georgia, serif)"
          fontWeight="400"
          fontSize="28"
          letterSpacing="-1.2"
        >
          <tspan fill="var(--alv-ink, #1b1220)">ALIVER</tspan>
          <tspan fill="var(--alv-brand, #d42a64)">.UZ</tspan>
        </text>

        {/*
         * Yaltirash qatlami matn USTIDA turadi.
         * `pointer-events: none` majburiy: aks holda u logo ustidagi
         * bosishni to'sib qo'yardi.
         */}
        {animated ? (
          <text
            x="0"
            y="25"
            fontFamily="var(--alv-font-display, 'Prata', Georgia, serif)"
            fontWeight="400"
            fontSize="28"
            letterSpacing="-1.2"
            fill={`url(#${sweepId})`}
            style={{ mixBlendMode: 'overlay', pointerEvents: 'none' }}
            aria-hidden="true"
          >
            ALIVER.UZ
          </text>
        ) : null}
      </g>
    </svg>
  );
}
