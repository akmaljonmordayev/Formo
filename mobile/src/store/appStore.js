import { useCallback, useEffect, useMemo, useState } from 'react';
import { getItem, setItem } from '../utils/storage';

const LANGUAGE_KEY = 'formo_language';

// Savat va sevimlilar endi serverda (/api/cart, /api/catalog/favorites) —
// bu yerda faqat qurilmaga xos holat qoladi.
export function useAppStore() {
  // ─── Language (persisted) ────────────────────────────────────────────────────
  const [language, setLanguageState] = useState('uz');

  useEffect(() => {
    getItem(LANGUAGE_KEY).then((saved) => {
      if (saved) setLanguageState(saved);
    });
  }, []);

  const setLanguage = useCallback((code) => {
    setLanguageState(code);
    setItem(LANGUAGE_KEY, code);
  }, []);

<<<<<<< HEAD
  const updateCart = useCallback((updater) => {
    setCart((current) => {
      const next = updater(current);
      setItem(CART_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addToCart = useCallback((item) => updateCart((current) => [...current, item]), [updateCart]);
  const removeFromCart = useCallback(
    (index) => updateCart((current) => current.filter((_, i) => i !== index)),
    [updateCart],
  );
  const clearCart = useCallback(() => updateCart(() => []), [updateCart]);

  const updateFavorites = useCallback((updater) => {
    setFavorites((current) => {
      const next = updater(current);
      setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleFavorite = useCallback(
    (id) =>
      updateFavorites((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      ),
    [updateFavorites],
  );

  // ─── Memoized store object ────────────────────────────────────────────────────
  return useMemo(
    () => ({
      // language
      language,
      setLanguage,
      // cart
      cart,
      updateCart,
      addToCart,
      removeFromCart,
      clearCart,
      // favorites
      favorites,
      toggleFavorite,
    }),
    [
      language,
      setLanguage,
      cart,
      updateCart,
      addToCart,
      removeFromCart,
      clearCart,
      favorites,
      toggleFavorite,
    ],
  );
=======
  return useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
}
