import { createContext, useContext } from 'react';

// Tailor panel sozlamalari faqat shu qurilmada saqlanadi (backendda bunday maydon yo'q)
const PREFS_KEY = 'formo_tailor_prefs';

export const DEFAULT_PREFS = {
  lang: 'uz', // uz | ru
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

export function loadPrefs() {
  const saved = read(PREFS_KEY);
  if (!saved) return DEFAULT_PREFS;
  return {
    ...DEFAULT_PREFS,
    ...saved,
    lang: ['uz', 'ru'].includes(saved.lang) ? saved.lang : 'uz',
    notifications: { ...DEFAULT_PREFS.notifications, ...saved.notifications },
  };
}

export const storePrefs = (prefs) => {
  if (!write(PREFS_KEY, prefs)) throw new Error('Browser storage is unavailable');
};

export const TailorContext = createContext(null);

/** { prefs, savePrefs, notes, setNotes } — TailorShell beradi */
export const useTailor = () => useContext(TailorContext);
