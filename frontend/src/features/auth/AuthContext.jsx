import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { ROLE_HOME } from '../../constants/roles';
import { session, SESSION_EXPIRED_EVENT } from '../../services/session';
import { fetchMe, login as loginRequest, logout as logoutRequest } from './authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (session.accessToken ? session.user : null));

  // Sahifa ochilganda ma'lumotni bazadan yangilaymiz: superadmin ism/sex nomini
  // o'zgartirgan bo'lsa ham panelda darhol to'g'ri ko'rinadi
  useEffect(() => {
    if (!session.accessToken) return;
    let cancelled = false;
    fetchMe()
      .then((fresh) => {
        if (cancelled || !fresh) return;
        session.save({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: fresh });
        setUser(fresh);
      })
      .catch((err) => {
        if (cancelled) return;
        // Server role/sessiyani tasdiqlay olmadi (401/403) — DevTools orqali tahrirlangan/eskirgan
        // lokal role'ga ishonib qolmasligimiz uchun sessiyani tugatamiz (ProtectedRoute /login'ga yuboradi).
        // Tarmoq/5xx — vaqtinchalik xato, eski sessiya saqlanadi (keyingi urinishda qayta tekshiriladi)
        if (err?.status === 401 || err?.status === 403) {
          session.clear();
          setUser(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh token ham o'tmay qolsa — avtomatik chiqarib yuboramiz
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // onSuccess + delayMs: login sahifasi "Xush kelibsiz" animatsiyasini ko'rsatib ulgurishi uchun
  const login = useCallback(async (credentials, { onSuccess, delayMs = 0 } = {}) => {
    const result = await loginRequest(credentials);

    // Mobil ilova foydalanuvchilari (USER) web panelga kira olmaydi
    if (!ROLE_HOME[result.user.role]) {
      session.save(result);
      await logoutRequest();
      session.clear();
      throw new Error("Bu panel faqat Formo xodimlari uchun. Mobil ilovadan foydalaning");
    }

    session.save(result);
    onSuccess?.(result.user);
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    session.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, role: user?.role ?? null, isAuthenticated: !!user, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
