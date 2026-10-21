import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, normalizePhone } from '../../services/api';
import * as storage from '../../utils/storage';

function toAuthError(err, fallbackKey) {
  if (err instanceof ApiError) {
    if (err.status === 0) return { key: 'networkError', message: err.message };
    if (err.status === 401) return { key: 'loginError', message: 'Telefon raqam yoki parol noto‘g‘ri' };
    return { key: fallbackKey, message: err.message || null };
  }
  if (err instanceof TypeError) return { key: 'networkError', message: 'Tarmoq xatosi yuz berdi' };
  return { key: fallbackKey, message: err?.message || null };
}

<<<<<<< HEAD
// The backend exposes NO OTP / SMS endpoints. Phone verification is therefore
// a development-only, fully local step: the app accepts a fixed demo code and
// never calls the network or claims that a real SMS was delivered.
const DEV_OTP_CODE = '123456';

const PROFILE_KEYS = ['gender', 'age', 'height', 'weight', 'address'];
const overlayStorageKey = (id) => `formo_profile_overlay_${id}`;
=======
/** PATCH /auth/me qabul qiladigan maydonlar (fullName/address yuborilmaydi — server 400 qaytaradi) */
const PROFILE_KEYS = ['gender', 'age', 'height', 'weight'];
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5

function pickProfileFields(fields) {
  const body = {};
  PROFILE_KEYS.forEach((key) => {
    if (fields?.[key] !== undefined) body[key] = fields[key];
  });
<<<<<<< HEAD
  return merged;
}

async function readOverlay(id) {
  if (!id) return null;
  const raw = await storage.getItem(overlayStorageKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeOverlay(id, fields) {
  if (!id) return null;
  const current = (await readOverlay(id)) || {};
  const next = { ...current };
  PROFILE_KEYS.forEach((key) => {
    if (fields[key] != null) next[key] = fields[key];
  });
  await storage.setItem(overlayStorageKey(id), JSON.stringify(next));
  return next;
}

async function mergeWithOverlay(me) {
  if (!me) return null;
  const overlay = await readOverlay(me.id);
  return applyOverlay(me, overlay);
=======
  return body;
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
}

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Session expiry listener
  useEffect(() => {
    api.auth.onSessionExpired(() => {
      setUser(null);
      setIsAuthenticated(false);
    });
  }, []);

  // Restore session on mount
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const token = await storage.getToken();
        if (!token) {
          if (!cancelled) {
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
          }
          return;
        }

        const me = await api.auth.me();
<<<<<<< HEAD
        if (!cancelled && me) {
          const merged = await mergeWithOverlay(me);
          setUser(merged);
=======
        if (!cancelled) {
          setUser(me);
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
          setIsAuthenticated(true);
        } else if (!cancelled) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setIsAuthenticated(false);
        }
        await storage.removeToken();
        await storage.removeRefreshToken();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Login
  const login = useCallback(async (phone, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const me = await api.auth.login(phone, password);
<<<<<<< HEAD
      const merged = await mergeWithOverlay(me);
      setUser(merged);
=======
      setUser(me);
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
      setIsAuthenticated(true);
      return { success: true, user: merged };
    } catch (err) {
      const authErr = toAuthError(err, 'loginError');
      setUser(null);
      setIsAuthenticated(false);
      setError(authErr);
      return { success: false, error: authErr };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register
  const register = useCallback(async (payload) => {
    setIsLoading(true);
    setError(null);
    try {
      const me = await api.auth.register(payload);
<<<<<<< HEAD
      const merged = await mergeWithOverlay(me);
      setUser(merged);
=======
      setUser(me);
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
      setIsAuthenticated(true);
      return { success: true, user: merged };
    } catch (err) {
      const authErr = toAuthError(err, 'authError');
      setUser(null);
      setIsAuthenticated(false);
      setError(authErr);
      return { success: false, error: authErr };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await api.auth.logout();
    } catch {
      // ignore
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  // Refresh user
  const refreshUser = useCallback(async () => {
<<<<<<< HEAD
    try {
      const me = await api.auth.me();
      const merged = await mergeWithOverlay(me);
      setUser(merged);
      return merged;
    } catch {
      return null;
    }
  }, []);

  // Update profile
  const updateUser = useCallback(
    async (fields) => {
      try {
        const me = await api.auth.updateMe(fields);
        const merged = await mergeWithOverlay(me);
        setUser(merged);
        return merged;
      } catch (err) {
        // The backend exposes no profile-update route (PATCH /auth/me). A
        // 404/405 therefore means "endpoint absent", and we persist app-only
        // preferences on the device. Any other failure — validation (400),
        // auth (401) or network (0) — is a real error and must surface instead
        // of being silently swallowed.
        const endpointMissing =
          err instanceof ApiError && (err.status === 404 || err.status === 405);
        if (!endpointMissing || !user?.id) throw err;
        const overlay = await writeOverlay(user.id, fields);
        const merged = applyOverlay(user, overlay);
        setUser(merged);
        return merged;
      }
    },
    [user]
  );
=======
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
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5

  // ── Phone verification (development-only, no network) ──────────────────────
  // The backend has no OTP route, so we must not call one. These helpers gate
  // the registration UI with a fixed demo code and clearly report that nothing
  // was actually sent. The real account is still created by `register()`.
  const requestOtp = useCallback(
    async () => ({
      isDemo: true,
      message: `Demo rejim: tasdiqlash kodi ${DEV_OTP_CODE} (haqiqiy SMS yuborilmadi)`,
    }),
    []
  );

  const verifyOtp = useCallback(async (phone, code) => {
    const digits = String(code ?? '').replace(/\D/g, '');
    if (digits.length !== 6) throw new Error('6 xonali tasdiqlash kodini to‘liq kiriting');
    if (digits !== DEV_OTP_CODE) throw new Error('Tasdiqlash kodi noto‘g‘ri');
    return { success: true, phone, verified: true };
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
    requestOtp,
    verifyOtp,
  };
}
