'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ShopError, ShopNetworkError } from '@/lib/shop-api';

/**
 * Kabinet sahifalari uchun yuklash holati.
 *
 * NEGA UMUMIY HOOK. Kabinetda oltita sahifa bor va har biri o'zicha
 * yuklardi: `useEffect`, `try/catch`, «Yuklanmoqda…». Natijada har
 * birida bir xil kamchilik takrorlanardi — xato sababini ajratmaslik va
 * qayta urinish yo'qligi.
 *
 * Eng muhimi: Render'ning bepul instansi uxlab qoladi va birinchi
 * so'rov 50 soniyagacha kutadi. Bu vaqt davomida ekranda faqat
 * «Yuklanmoqda…» turardi va foydalanuvchi saytni buzilgan deb o'ylardi.
 * Endi bir necha soniyadan keyin NIMA bo'layotgani aytiladi.
 */

export type AccountState =
  | { status: 'loading'; slow: boolean }
  | { status: 'auth' }
  | { status: 'offline'; kind: 'timeout' | 'offline' }
  | { status: 'error'; message: string }
  | { status: 'ready' };

/** Shundan keyin «server uyg'onmoqda» deb aytiladi. */
const SLOW_AFTER_MS = 3_500;

export function useAccountData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<AccountState>({ status: 'loading', slow: false });

  /*
   * `load` har chizishda yangi funksiya bo'lib kelishi mumkin. Uni
   * bevosita `useEffect` bog'lanishiga qo'ysak, cheksiz so'rov halqasi
   * hosil bo'lardi — shuning uchun oxirgi nusxasi refda saqlanadi.
   */
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(async () => {
    setState({ status: 'loading', slow: false });
    const slowTimer = setTimeout(() => {
      setState((s) => (s.status === 'loading' ? { status: 'loading', slow: true } : s));
    }, SLOW_AFTER_MS);

    try {
      const result = await loadRef.current();
      setData(result);
      setState({ status: 'ready' });
    } catch (e) {
      if (e instanceof ShopNetworkError) {
        setState({ status: 'offline', kind: e.kind });
      } else if (e instanceof ShopError && (e.status === 401 || e.status === 403)) {
        // Eng ko'p uchraydigan sabab. «Xatolik» deb ko'rsatish yolg'on:
        // hech narsa buzilmagan, shunchaki qayta kirish kerak.
        setState({ status: 'auth' });
      } else {
        setState({
          status: 'error',
          message: e instanceof Error ? e.message : 'Kutilmagan xatolik',
        });
      }
    } finally {
      clearTimeout(slowTimer);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, state, reload: run, setData };
}
