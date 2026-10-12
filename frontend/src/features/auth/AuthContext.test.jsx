import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../hooks/useAuth';
import { session, SESSION_EXPIRED_EVENT } from '../../services/session';
import { AuthProvider } from './AuthContext';
import { fetchMe, login as loginRequest, logout as logoutRequest } from './authService';

vi.mock('./authService', () => ({ login: vi.fn(), logout: vi.fn(), fetchMe: vi.fn() }));

const operator = { id: 2, fullName: 'Dilshod Karimov', role: 'OPERATOR' };
const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };

let auth;
function Probe() {
  auth = useAuth();
  return <p>{auth.isAuthenticated ? `${auth.user.fullName} (${auth.role})` : 'mehmon'}</p>;
}
const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

describe('AuthProvider', () => {
  beforeEach(() => {
    fetchMe.mockResolvedValue(null);
    logoutRequest.mockResolvedValue(undefined);
  });

  it('token yo‘q — mehmon, /auth/me chaqirilmaydi', () => {
    renderProvider();
    expect(screen.getByText('mehmon')).toBeInTheDocument();
    expect(fetchMe).not.toHaveBeenCalled();
  });

  it('saqlangan sessiya — darhol tiklanadi, keyin bazadagi yangi ma’lumot bilan yangilanadi', async () => {
    session.save({ ...tokens, user: operator });
    fetchMe.mockResolvedValue({ ...operator, fullName: 'Yangi Ism' });

    renderProvider();

    expect(screen.getByText('Dilshod Karimov (OPERATOR)')).toBeInTheDocument();
    expect(await screen.findByText('Yangi Ism (OPERATOR)')).toBeInTheDocument();
    expect(session.user.fullName).toBe('Yangi Ism');
    expect(session.accessToken).toBe('access-1');
  });

  it('/auth/me xato bersa (tarmoq) — foydalanuvchi chiqarib yuborilmaydi', async () => {
    session.save({ ...tokens, user: operator });
    fetchMe.mockRejectedValue(new Error('Failed to fetch'));

    renderProvider();
    await waitFor(() => expect(fetchMe).toHaveBeenCalled());

    expect(screen.getByText('Dilshod Karimov (OPERATOR)')).toBeInTheDocument();
  });

  it('login: sessiya saqlanadi, onSuccess chaqiriladi', async () => {
    loginRequest.mockResolvedValue({ ...tokens, user: operator });
    const onSuccess = vi.fn();
    renderProvider();

    let result;
    await act(async () => {
      result = await auth.login({ phone: '+998902222222', password: 'x' }, { onSuccess });
    });

    expect(result).toEqual(operator);
    expect(onSuccess).toHaveBeenCalledWith(operator);
    expect(session.accessToken).toBe('access-1');
    expect(screen.getByText('Dilshod Karimov (OPERATOR)')).toBeInTheDocument();
  });

  it('login: mobil foydalanuvchi (USER) panelga kiritilmaydi va serverdagi sessiyasi yopiladi', async () => {
    loginRequest.mockResolvedValue({ ...tokens, user: { id: 9, fullName: 'Aziz', role: 'USER' } });
    // Logout so'rovi token bilan ketishi kerak — aks holda serverda sessiya ochiq qoladi
    logoutRequest.mockImplementation(async () => {
      expect(session.accessToken).toBe('access-1');
    });
    renderProvider();

    await act(async () => {
      await expect(auth.login({ phone: '+998909999999', password: 'x' })).rejects.toThrow(/faqat Formo xodimlari/);
    });

    expect(logoutRequest).toHaveBeenCalledTimes(1);
    expect(session.accessToken).toBeNull();
    expect(screen.getByText('mehmon')).toBeInTheDocument();
  });

  it('login xatosi — sessiya ochilmaydi', async () => {
    loginRequest.mockRejectedValue(new Error("Telefon raqam yoki parol noto'g'ri"));
    renderProvider();

    await act(async () => {
      await expect(auth.login({ phone: '+998902222222', password: 'wrong' })).rejects.toThrow(/noto'g'ri/);
    });

    expect(session.accessToken).toBeNull();
    expect(screen.getByText('mehmon')).toBeInTheDocument();
  });

  it('logout: server + lokal sessiya yopiladi', async () => {
    session.save({ ...tokens, user: operator });
    renderProvider();

    await act(() => auth.logout());

    expect(logoutRequest).toHaveBeenCalledTimes(1);
    expect(session.accessToken).toBeNull();
    expect(screen.getByText('mehmon')).toBeInTheDocument();
  });

  it('sessiya tugadi hodisasi — avtomatik chiqarib yuboriladi', async () => {
    session.save({ ...tokens, user: operator });
    renderProvider();

    act(() => {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    });

    expect(screen.getByText('mehmon')).toBeInTheDocument();
  });
});

describe('useAuth', () => {
  it('AuthProvider tashqarisida — tushunarli xato', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/AuthProvider ichida/);
  });
});
