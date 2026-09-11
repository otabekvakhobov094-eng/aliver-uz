'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ShopError, shopApi, type Cart } from '@/lib/shop-api';

interface CartContextValue {
  cart: Cart | null;
  /** Birinchi yuklash tugagunicha — sarlavhadagi hisoblagich ko‘rsatilmaydi. */
  ready: boolean;
  /** Savat YUKLANMADI (bo'sh emas). Ikkisini ajratish shart. */
  failed: boolean;
  busy: boolean;
  error: string | null;
  add: (variantId: string, quantity?: number) => Promise<void>;
  update: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Savat holati butun sayt bo'ylab bitta joyda turadi: sarlavhadagi
 * hisoblagich, mahsulot sahifasi va savat sahifasi bir xil ma'lumotni
 * ko'radi. Server har javobda savatning to'liq ko'rinishini qaytaradi,
 * shuning uchun bu yerda summalar qayta hisoblanmaydi (ekspertiza A-5:
 * narx faqat serverda).
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<Cart>) => {
    setBusy(true);
    setError(null);
    try {
      setCart(await fn());
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Savatni yangilab bo‘lmadi');
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setCart(await shopApi.cart());
      setFailed(false);
    } catch {
      /*
       * NOSOZLIK BO'SH SAVAT EMAS.
       *
       * Ilgari bu yerda `setCart(null)` turardi va u savat sahifasida
       * "Savat bo'sh" deb ko'rinardi. Ya'ni API bir soniyaga yiqilsa,
       * mijoz o'zi tanlagan tovarlar yo'qolgan deb o'ylab ketardi.
       *
       * Endi nosozlik alohida belgilanadi: savat sahifasi "yuklanmadi,
       * qayta urinib ko'ring" deb yozadi va tanlov saqlanib turganini
       * bildiradi.
       */
      setFailed(true);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      ready,
      failed,
      busy,
      error,
      refresh,
      clearError: () => setError(null),
      add: (variantId, quantity = 1) => run(() => shopApi.addToCart(variantId, quantity)),
      update: (itemId, quantity) => run(() => shopApi.updateCartItem(itemId, quantity)),
      remove: (itemId) => run(() => shopApi.removeCartItem(itemId)),
      applyCoupon: (code) => run(() => shopApi.applyCoupon(code)),
      removeCoupon: () => run(() => shopApi.removeCoupon()),
    }),
    [cart, ready, busy, error, refresh, run],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart faqat CartProvider ichida ishlaydi');
  return ctx;
}
