import { useCallback, useEffect, useMemo, useState } from 'react';
import { getItem, setItem } from '../utils/storage';

const LANGUAGE_KEY = 'formo_language';
const CART_KEY = 'formo_cart';
const FAVORITES_KEY = 'formo_favorites';

async function readJson(key, fallback) {
  const raw = await getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function useAppStore() {
  // ─── Language (persisted) ────────────────────────────────────────────────────
  const [language, setLanguageState] = useState('uz');

  // ─── Cart ────────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState([]);

  // ─── Favorites ───────────────────────────────────────────────────────────────
  const [favorites, setFavorites] = useState([]);

  // Hydrate persisted state on mount
  useEffect(() => {
    getItem(LANGUAGE_KEY).then((saved) => {
      if (saved) setLanguageState(saved);
    });
    readJson(CART_KEY, []).then((saved) => {
      if (Array.isArray(saved) && saved.length > 0) setCart(saved);
    });
    readJson(FAVORITES_KEY, []).then((saved) => {
      if (Array.isArray(saved) && saved.length > 0) setFavorites(saved);
    });
  }, []);

  const setLanguage = useCallback((code) => {
    setLanguageState(code);
    setItem(LANGUAGE_KEY, code);
  }, []);

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
}
