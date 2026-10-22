import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../services/api';
import * as storage from '../../utils/storage';

/**
 * Maps an API error to a display-ready error object.
 * `key` is an i18n fallback; `message` is the server's own text when it is
 * trustworthy (never for 401, where the localized key reads better).
 */
function toAuthError(err, fallbackKey) {
  if (err instanceof ApiError) {
    if (err.status === 0) return { key: 'networkError', message: null };
    if (err.status === 401) return { key: 'loginError', message: null };
    return { key: fallbackKey, message: err.message || null };
  }
  if (err instanceof TypeError) return { key: 'networkError', message: null };
  return { key: fallbackKey, message: null };
}

/** PATCH /auth/me qabul qiladigan maydonlar (fullName/address yuborilmaydi — server 400 qaytaradi) */
const PROFILE_KEYS = ['gender', 'age', 'height', 'weight'];

function pickProfileFields(fields) {
  const body = {};
  PROFILE_KEYS.forEach((key) => {
    if (fields?.[key] !== undefined) body[key] = fields[key];
  });
  return body;
}

/**
 * useAuth — manages authentication state for the whole app.
 *
 * On mount: reads the stored token, validates it with GET /auth/me.
 * Exposes login(), register(), logout(), refreshUser() and updateUser().
 *
 * `error` shape: { key: string, message: string|null } — screens render
 * `error.message || t(error.key)`.
 *
 * Returns: { user, isLoading, isSubmitting, isAuthenticated, error, login, register, logout, refreshUser, updateUser }
 *   isLoading    — initial session restore only (full-screen loader)
 *   isSubmitting — login/register request in flight (inline button state)
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // `isLoading` only covers the initial session restore (AppNavigator shows a
  // full-screen loader for it). Submits use `isSubmitting` so the login/register
  // screen is not unmounted mid-request — remounting it dropped focus, closed
  // the keyboard and wiped the typed credentials on a failed attempt.
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

        // Validate token against the server
        const me = await api.auth.me();
        if (!cancelled) {
          setUser(me);
          setIsAuthenticated(true);
        }
      } catch {
        // Token invalid / expired / network failure — clear credentials and stay unauthenticated
        await storage.removeToken();
        await storage.removeRefreshToken();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    return () => { cancelled = true; };
  }, []);

  // ─── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (phone, password) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const me = await api.auth.login(phone, password);
      setUser(me);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setError(toAuthError(err, 'authError'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // ─── Register ────────────────────────────────────────────────────────────────
  /**
   * @param {{fullName, phone, password, gender?, age?, height?, weight?}} payload
   */
  const register = useCallback(async (payload) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const me = await api.auth.register(payload);
      setUser(me);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setError(toAuthError(err, 'authError'));
      return false;
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
    error,
    login,
    register,
    logout,
    refreshUser,
    updateUser,
  };
}
