import { useCallback, useEffect, useMemo, useState } from 'react';
import { getItem, setItem } from '../utils/storage';

const LANGUAGE_KEY = 'formo_language';

export function useAppStore() {
  // ─── Language (persisted) ────────────────────────────────────────────────────
  const [language, setLanguageState] = useState('uz');

  // Hydrate language from storage on mount
  useEffect(() => {
    getItem(LANGUAGE_KEY).then((saved) => {
      if (saved) setLanguageState(saved);
    });
  }, []);

  const setLanguage = useCallback((code) => {
    setLanguageState(code);
    setItem(LANGUAGE_KEY, code);
  }, []);

  // ─── Auth state ──────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUserState] = useState(null);

  const setUser = useCallback((userData) => {
    setUserState(userData);
    setIsAuthenticated(true);
  }, []);

  const clearUser = useCallback(() => {
    setUserState(null);
    setIsAuthenticated(false);
  }, []);

  // ─── Cart ────────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState([]);

  const addToCart = useCallback(
    (item) => setCart((current) => [...current, item]),
    [],
  );

  const removeFromCart = useCallback(
    (index) => setCart((current) => current.filter((_, i) => i !== index)),
    [],
  );

  const clearCart = useCallback(() => setCart([]), []);

  // ─── Favorites ───────────────────────────────────────────────────────────────
  const [favorites, setFavorites] = useState([]);

  const toggleFavorite = useCallback(
    (id) =>
      setFavorites((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      ),
    [],
  );

  // ─── Memoized store object ────────────────────────────────────────────────────
  return useMemo(
    () => ({
      // language
      language,
      setLanguage,
      // auth
      isAuthenticated,
      user,
      setUser,
      clearUser,
      // cart
      cart,
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
      isAuthenticated,
      user,
      setUser,
      clearUser,
      cart,
      addToCart,
      removeFromCart,
      clearCart,
      favorites,
      toggleFavorite,
    ],
  );
}
