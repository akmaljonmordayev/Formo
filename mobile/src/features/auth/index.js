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

/**
 * useAuth — manages authentication state for the whole app.
 *
 * On mount: reads the stored token, validates it with GET /auth/me.
 * Exposes login(), register(), logout(), refreshUser() and updateUser().
 *
 * `error` shape: { key: string, message: string|null } — screens render
 * `error.message || t(error.key)`.
 *
 * Returns: { user, isLoading, isAuthenticated, error, login, register, logout, refreshUser, updateUser }
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, []);

  // ─── Register ────────────────────────────────────────────────────────────────
  /**
   * @param {{fullName, phone, password, gender?, age?, height?, weight?}} payload
   */
  const register = useCallback(async (payload) => {
    setIsLoading(true);
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
      setIsLoading(false);
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

  // ─── Update profile via API; refreshes local user on success ─────────────────
  const updateUser = useCallback(async (fields) => {
    const me = await api.auth.updateMe(fields);
    setUser(me);
    return me;
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    login,
    register,
    logout,
    refreshUser,
    updateUser,
  };
}
