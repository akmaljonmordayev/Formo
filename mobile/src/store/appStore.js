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

  return useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
}
