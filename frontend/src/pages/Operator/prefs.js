import { createContext, useContext } from 'react';

// Operator sozlamalari faqat shu qurilmada saqlanadi (backendda bunday maydon yo'q)
const PREFS_KEY = 'formo_operator_prefs';
const LOGIN_KEY = 'formo_operator_login';
const COLLAPSE_KEY = 'formo_operator_sidebar';

export const DEFAULT_PREFS = {
  theme: 'system', // system | light | dark
  lang: 'uz',
  notify: {
    newOrders: true,
    orderStatus: true,
    workshops: true,
    system: true,
    sound: false,
  },
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
  } catch {
    // brauzer xotirasi yopiq bo'lsa ham panel ishlayveradi
  }
}

export function loadPrefs() {
  const saved = read(PREFS_KEY);
  if (!saved) return DEFAULT_PREFS;
  return { ...DEFAULT_PREFS, ...saved, notify: { ...DEFAULT_PREFS.notify, ...saved.notify } };
}

export const storePrefs = (prefs) => write(PREFS_KEY, prefs);

export const loadCollapsed = () => read(COLLAPSE_KEY) === true;
export const storeCollapsed = (value) => write(COLLAPSE_KEY, value);

/** Shu sessiya qachon boshlanganini eslab qoladi (User modelida lastLogin yo'q) */
export function rememberLogin(userId) {
  const saved = read(LOGIN_KEY);
  if (saved?.userId === userId) return saved.at;
  const at = new Date().toISOString();
  write(LOGIN_KEY, { userId, at });
  return at;
}

export const forgetLogin = () => write(LOGIN_KEY, null);

export const OperatorContext = createContext(null);

/** { prefs, savePrefs, loginAt, toast } — OperatorShell beradi */
export const useOperator = () => useContext(OperatorContext);

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
