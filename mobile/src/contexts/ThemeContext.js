import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { darkColors, lightColors, setActiveTheme } from '../constants/theme';
import { getItem, setItem } from '../utils/storage';

const THEME_KEY = 'formo_theme';

const ThemeContext = createContext({
  theme: 'dark',
  colors: darkColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

/** Xom Context — faqat class komponentlarda `static contextType` uchun (masalan ErrorBoundary) */
export const ThemeContextObject = ThemeContext;

/** Butun ilovani o'rab turadi (App.js) — har bir ekran useTheme() orqali joriy ranglarni oladi */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    getItem(THEME_KEY).then((saved) => {
      if (saved !== 'light') return;
      // Avval global palitra, keyin holat: qayta chizilgan ekranlar yangi ranglarni o'qiydi
      setActiveTheme('light');
      setThemeState('light');
    });
  }, []);

  const setTheme = (next) => {
    const value = next === 'light' ? 'light' : 'dark';
    setActiveTheme(value);
    setThemeState(value);
    setItem(THEME_KEY, value).catch(() => {});
  };

  const value = useMemo(
    () => ({
      theme,
      colors: theme === 'light' ? lightColors : darkColors,
      toggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light'),
      setTheme,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Ekran/komponent ichida: const { colors, theme, toggleTheme } = useTheme(); */
export function useTheme() {
  return useContext(ThemeContext);
}
