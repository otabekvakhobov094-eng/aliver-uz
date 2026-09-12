'use client';

import { useEffect } from 'react';
import { toSum, trackViewContent } from '@/lib/pixel';

/**
 * Mahsulot sahifasi ochilganini reklama pikseliga bildiradi.
 *
 * Alohida komponent, chunki mahsulot sahifasi SERVER komponenti va
 * unda `useEffect` ishlatib bo'lmaydi. Bu esa ekranga hech narsa
 * chizmaydi — faqat bitta hodisa yuboradi.
 */
export function ViewContentPixel({ sku, price }: { sku: string; price: string }) {
  useEffect(() => {
    trackViewContent({ id: sku, price: toSum(price) });
    // Variant almashsa qayta yuborilmaydi: ko'rilgan narsa — MAHSULOT.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sku]);

  return null;
}
