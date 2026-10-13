import { STORAGE_KEYS } from '../constants/storage';

// Tokenlar bilan ishlash bir joyda: api.js ham, AuthContext ham shu yerdan foydalanadi
export const session = {
  get accessToken() {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  },
  get refreshToken() {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
  get user() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save({ accessToken, refreshToken, user }) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },
  clear() {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  },
};

// Sessiya tugaganda (refresh ham o'tmasa) AuthContext'ga xabar beriladi
export const SESSION_EXPIRED_EVENT = 'formo:session-expired';
