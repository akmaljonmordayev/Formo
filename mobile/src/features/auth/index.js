import { useCallback, useEffect, useState } from 'react';
import { api, AuthError } from '../../services/api';
import * as storage from '../../utils/storage';
import { isValidChallenge } from './telegram';

/** PATCH /auth/me qabul qiladigan maydonlar (UpdateProfileDto). address yuborilmaydi — server 400 qaytaradi */
const PROFILE_KEYS = ['fullName', 'gender', 'age', 'height', 'weight'];

export function pickProfileFields(fields) {
  const body = {};
  PROFILE_KEYS.forEach((key) => {
    if (fields?.[key] !== undefined) body[key] = fields[key];
  });
  return body;
}

const RESTORE_RETRY_DELAYS_MS = [1000, 2500];

/** Sessiya yaroqsizligi aniq (refresh rad etildi yoki hisob bloklangan) — tarmoq/server xatosi emas */
export function isSessionInvalid(err) {
  return err instanceof AuthError || err?.status === 401 || err?.status === 403;
}

/** GET /auth/me; vaqtinchalik xatoda (tarmoq, 5xx, 429) qisqa pauza bilan qayta uriniladi */
export async function meWithRetry(isCancelled = () => false, delays = RESTORE_RETRY_DELAYS_MS) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await api.auth.me();
    } catch (err) {
      if (isSessionInvalid(err) || attempt >= delays.length || isCancelled()) throw err;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      if (isCancelled()) return null;
    }
  }
}

/**
 * useAuth — manages authentication state for the whole app.
 *
 * On mount: reads the stored token, validates it with GET /auth/me.
 * Mijozlar faqat Telegram bot orqali kiradi: startTelegram() → verifyTelegram().
 * Xatolar chaqiruvchi ekranga uzatiladi (ekran o'zi lokalizatsiya qiladi).
 *
 * Returns: { user, isLoading, isSubmitting, isAuthenticated, startTelegram, verifyTelegram, logout, refreshUser, updateUser }
 *   isLoading    — initial session restore only (full-screen loader)
 *   isSubmitting — verify request in flight (inline button state)
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // `isLoading` only covers the initial session restore (AppNavigator shows a
  // full-screen loader for it). Submits use `isSubmitting` so the auth screen is
  // not unmounted mid-request — remounting it dropped focus, closed the keyboard
  // and wiped the typed code on a failed attempt.
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Session expiry: bounce back to the login screen ────────────────────────
  useEffect(() => {
    api.auth.onSessionExpired(() => {
      setUser(null);
      setIsAuthenticated(false);
    });
  }, []);

  // ─── Restore session on mount ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const token = await storage.getToken();
        if (!token) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        // Validate token against the server. Tarmoq/server xatosida bir necha marta qayta urinamiz
        const me = await meWithRetry(() => cancelled);
        if (!cancelled && me) {
          setUser(me);
          setIsAuthenticated(true);
        }
      } catch (err) {
        // Faqat sessiya haqiqatan yaroqsiz bo'lsa (401/403) tokenlar o'chiriladi. Internet yo'q yoki backend
        // vaqtincha ishlamasa tokenlar saqlanadi — keyingi ochilishda sessiya tiklanadi, qayta kirish shart emas
        if (isSessionInvalid(err)) {
          await storage.removeToken();
          await storage.removeRefreshToken();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  // ─── Telegram bot orqali kirish (mijozlar uchun yagona kirish usuli) ──────────────────────────────────────────────
  /** So'rov ochadi: { challengeId, deepLink, expiresAt, ... }. Xato chaqiruvchiga uzatiladi. */
  const startTelegram = useCallback(async (phone) => {
    const challenge = await api.auth.telegramStart(phone);
    if (!isValidChallenge(challenge)) throw new Error('Unexpected Telegram challenge response');
    return challenge;
  }, []);

  /**
   * Botdagi kodni tekshiradi. Muvaffaqiyatda sessiya saqlanadi va `isAuthenticated` o'zgaradi —
   * yangi hisob uchun AppNavigator ism/jins/yosh qadamlarini o'zi ko'rsatadi (ism "Yangi mijoz").
   */
  const verifyTelegram = useCallback(async (challengeId, code) => {
    setIsSubmitting(true);
    try {
      const result = await api.auth.telegramVerify(challengeId, code);
      setUser(result.user);
      setIsAuthenticated(true);
      return result;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Server-side logout errors are non-fatal — clear locally regardless
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  // ─── Refresh profile from the server ─────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    const me = await api.auth.me();
    setUser(me);
    return me;
  }, []);

  // ─── Update profile measurements (PATCH /auth/me — server is the source of truth) ─
  /** Xatoni (ApiError) chaqiruvchiga uzatadi — ekran o'zi ko'rsatadi */
  const updateUser = useCallback(async (fields) => {
    const updated = await api.auth.updateMe(pickProfileFields(fields));
    setUser(updated);
    return updated;
  }, []);

  return {
    user,
    isLoading,
    isSubmitting,
    isAuthenticated,
    startTelegram,
    verifyTelegram,
    logout,
    refreshUser,
    updateUser,
  };
}
