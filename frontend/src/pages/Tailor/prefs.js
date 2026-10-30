import { createContext, useContext } from 'react';

// Tailor panel sozlamalari faqat shu qurilmada saqlanadi (backendda bunday maydon yo'q)
const PREFS_KEY = 'formo_tailor_prefs';
const preferencesKey = (userId) => userId ? `${PREFS_KEY}_${userId}` : PREFS_KEY;

export const DEFAULT_PREFS = {
  lang: 'uz',
  notifications: { newOrders: true, deadline: true, summary: true },
};

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadPrefs(userId) {
  const saved = read(preferencesKey(userId));
  return {
    ...DEFAULT_PREFS,
    lang: ['uz', 'uz-Cyrl', 'ru'].includes(saved?.lang) ? saved.lang : 'uz',
  };
}

export const storePrefs = (prefs, userId) => {
  if (!write(preferencesKey(userId), prefs)) throw new Error('Browser storage is unavailable');
};

export const TailorContext = createContext(null);

/** { prefs, savePrefs, notes, setNotes } — TailorShell beradi */
export const useTailor = () => useContext(TailorContext);
