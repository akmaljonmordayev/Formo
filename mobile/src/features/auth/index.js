import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import * as storage from '../../utils/storage';

/**
 * useAuth — manages authentication state for the whole app.
 *
 * On mount: reads the stored token, validates it with GET /auth/me.
 * Exposes login(), register(), and logout() actions.
 *
 * Returns: { user, isLoading, isAuthenticated, error, login, register, logout }
 */
export default function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
      const data = await api.auth.login(phone, password);
      const me = data.user || await api.auth.me();

      await storage.setToken(data.accessToken);
      await storage.setRefreshToken(data.refreshToken);

      setUser(me);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      const message = err?.message?.includes('401') || err?.name === 'AuthError'
        ? 'loginError'     // i18n key — screens call t(error)
        : 'networkError';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Register ────────────────────────────────────────────────────────────────
  const register = useCallback(async (fullName, phone, password) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.auth.register(fullName, phone, password);
      const me = data.user || await api.auth.me();

      await storage.setToken(data.accessToken);
      await storage.setRefreshToken(data.refreshToken);

      setUser(me);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      const message = err?.message?.includes('401') || err?.name === 'AuthError'
        ? 'authError'
        : 'networkError';
      setError(message);
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
      await storage.removeToken();
      await storage.removeRefreshToken();
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  return { user, isLoading, isAuthenticated, error, login, register, logout };
}
