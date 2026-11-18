import { useCallback, useEffect, useMemo, useState } from 'react';
import { LANGUAGE_CODES } from '../i18n';
import { getItem, setItem } from '../utils/storage';

const LANGUAGE_KEY = 'formo_language';
// Birinchi ochilishdagi "Tilni tanlang" ekrani o'tilganmi
const LANGUAGE_CHOSEN_KEY = 'formo_language_chosen';

// Savat va sevimlilar endi serverda (/api/cart, /api/catalog/favorites) —
// bu yerda faqat qurilmaga xos holat qoladi.
export function useAppStore() {
  // ─── Language (persisted) ────────────────────────────────────────────────────
  const [language, setLanguageState] = useState('uz');
  // null — hali o'qilmadi (ekran miltillamasin), true/false — til tanlash ekrani o'tilgan/o'tilmagan
  const [languageChosen, setLanguageChosen] = useState(null);

  useEffect(() => {
    Promise.all([getItem(LANGUAGE_KEY), getItem(LANGUAGE_CHOSEN_KEY)]).then(([saved, chosen]) => {
      if (saved && LANGUAGE_CODES.includes(saved)) setLanguageState(saved);
      setLanguageChosen(chosen === '1');
    });
  }, []);

  const setLanguage = useCallback((code) => {
    setLanguageState(code);
    setItem(LANGUAGE_KEY, code);
  }, []);

  const confirmLanguage = useCallback((code) => {
    setLanguage(code);
    setLanguageChosen(true);
    setItem(LANGUAGE_CHOSEN_KEY, '1');
  }, [setLanguage]);

  return useMemo(
    () => ({ language, setLanguage, languageChosen, confirmLanguage }),
    [language, setLanguage, languageChosen, confirmLanguage],
  );
}
