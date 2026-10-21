import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

const EMPTY = { items: [], count: 0, promocode: null, summary: { subtotal: 0, discount: 0, delivery: 0, total: 0 } };

/**
 * Server savati (/api/cart). AppNavigator'da bir marta yaratiladi va ekranlarga
 * uzatiladi — header'dagi son, studiya, savat va rasmiylashtirish bitta holatni ko'radi.
 *
 * Narx/yakun faqat serverdan: { subtotal, discount, delivery, total }.
 * Qo'llangan promokod eslab qolinadi: savat o'zgarsa yakun shu promokod bilan
 * qayta hisoblanadi; endi yaroqsiz bo'lsa (masalan, minimal summa) olib tashlanadi
 * va sababi `promoError`da qoladi.
 *
 * @param {boolean} enabled - faqat kirgan foydalanuvchi uchun yuklanadi
 */
export default function useCart(enabled) {
  const [cart, setCart] = useState(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [promoError, setPromoError] = useState(null);
  const promoRef = useRef(null);

  /** Javobni qabul qiladi; promokod qo'llangan bo'lsa yakunni u bilan qayta so'raydi */
  const accept = useCallback(async (view) => {
    if (!promoRef.current) {
      setCart(view || EMPTY);
      return view;
    }
    try {
      const withPromo = await api.cart.view(promoRef.current);
      setCart(withPromo);
      return withPromo;
    } catch (err) {
      promoRef.current = null;
      setPromoError(err);
      setCart(view || EMPTY);
      return view;
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await accept(await api.cart.view());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [accept]);

<<<<<<< HEAD
      // Throws on error — intentionally not caught here
      const createdOrder = await api.orders.checkout(payload);
      clearCart();
      return createdOrder;
    },
    [cart, total, clearCart],
  );
=======
  useEffect(() => {
    if (enabled) {
      refresh();
    } else {
      promoRef.current = null;
      setCart(EMPTY);
      setError(null);
      setPromoError(null);
    }
  }, [enabled, refresh]);
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5

  // O'zgartiruvchi amallar xatoni chaqiruvchiga uzatadi (ekran o'zi ko'rsatadi)
  const addItem = useCallback(async (item) => accept(await api.cart.add(item)), [accept]);
  const updateItem = useCallback(async (id, fields) => accept(await api.cart.update(id, fields)), [accept]);
  const removeItem = useCallback(async (id) => accept(await api.cart.remove(id)), [accept]);
  const clear = useCallback(async () => {
    promoRef.current = null;
    setCart(await api.cart.clear());
  }, []);

  /** POST /cart/promocode — yaroqsiz bo'lsa ApiError (400) tashlanadi */
  const applyPromocode = useCallback(async (code) => {
    setPromoError(null);
    const view = await api.cart.applyPromocode(code);
    promoRef.current = view.promocode?.code || code;
    setCart(view);
    return view;
  }, []);

  const removePromocode = useCallback(async () => {
    promoRef.current = null;
    setPromoError(null);
    setCart(await api.cart.view());
  }, []);

  return {
    cart,
    items: cart.items,
    count: cart.count,
    summary: cart.summary,
    promocode: cart.promocode?.code || null,
    isLoading,
    error,
    promoError,
    refresh,
    addItem,
    updateItem,
    removeItem,
    clear,
    applyPromocode,
    removePromocode,
  };
}
