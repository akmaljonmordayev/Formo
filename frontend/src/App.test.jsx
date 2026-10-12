import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { session } from './services/session';

/**
 * Integratsion test: haqiqiy router + AuthProvider + api.js, faqat tarmoq (fetch) soxta.
 * Backend javoblari e2e testlardagi (backend/test) shaklga mos.
 */
const json = (status, body) => ({ ok: status < 300, status, json: async () => body });
const operator = { id: 2, phone: '+998902222222', fullName: 'Dilshod Karimov', role: 'OPERATOR', isActive: true };

function mockBackend(routes) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => {
      const handler = routes[`${init.method} ${url.split('?')[0]}`];
      return handler ? handler(init) : json(200, { items: [], total: 0, page: 1, limit: 20 });
    }),
  );
}

const requestsTo = (path) => fetch.mock.calls.filter(([url]) => url === path);

async function submitLogin(phone, password) {
  fireEvent.change(await screen.findByPlaceholderText('90 123 45 67'), { target: { value: phone } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /Kirish/ }));
}

describe('Ilova: login oqimi', () => {
  beforeEach(() => {
    // "Xush kelibsiz" animatsiyasi kutilmasin
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    window.history.pushState({}, '', '/');
  });

  it('"/" — login sahifasiga yo‘naltiradi', async () => {
    mockBackend({});
    render(<App />);
    expect(await screen.findByText('Telefon raqam')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('himoyalangan sahifa tokensiz ochilmaydi', async () => {
    mockBackend({});
    window.history.pushState({}, '', '/superadmin/users');
    render(<App />);
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('operator kiradi: raqam +998 formatida ketadi, tokenlar saqlanadi, o‘z paneliga o‘tadi', async () => {
    mockBackend({
      'POST /api/auth/login': () => json(200, { accessToken: 'access-1', refreshToken: 'refresh-1', user: operator }),
    });
    render(<App />);

    await submitLogin('90 222 22 22', 'operator-pass');

    await waitFor(() => expect(window.location.pathname).toBe('/operator'));
    const [[, init]] = requestsTo('/api/auth/login');
    expect(JSON.parse(init.body)).toEqual({ phone: '+998902222222', password: 'operator-pass' });
    expect(init.headers.Authorization).toBeUndefined();
    expect(session.accessToken).toBe('access-1');
    expect(session.user).toEqual(operator);
    expect(await screen.findByText('Dilshod Karimov')).toBeInTheDocument();
  });

  it('noto‘g‘ri parol — server xabari ko‘rsatiladi, login sahifasida qoladi', async () => {
    mockBackend({
      'POST /api/auth/login': () => json(401, { message: "Telefon raqam yoki parol noto'g'ri" }),
    });
    render(<App />);

    await submitLogin('90 222 22 22', 'wrong');

    expect(await screen.findByText("Telefon raqam yoki parol noto'g'ri")).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
    expect(session.accessToken).toBeNull();
  });

  it('to‘liq bo‘lmagan raqam — serverga so‘rov ketmaydi', async () => {
    mockBackend({});
    render(<App />);

    await submitLogin('90 222', 'whatever');

    expect(await screen.findByText("Telefon raqamni to'liq kiriting")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('mobil foydalanuvchi (USER) — panelga kiritilmaydi, sessiyasi serverda yopiladi', async () => {
    mockBackend({
      'POST /api/auth/login': () =>
        json(200, { accessToken: 'access-9', refreshToken: 'refresh-9', user: { ...operator, role: 'USER' } }),
      'POST /api/auth/logout': () => json(200, { message: 'Tizimdan chiqildi' }),
    });
    render(<App />);

    await submitLogin('90 999 99 99', 'secret123');

    expect(await screen.findByText(/faqat Formo xodimlari/)).toBeInTheDocument();
    const [[, logoutInit]] = requestsTo('/api/auth/logout');
    expect(logoutInit.headers.Authorization).toBe('Bearer access-9');
    expect(session.accessToken).toBeNull();
    expect(window.location.pathname).toBe('/login');
  });

  it('saqlangan sessiya bilan /login ochilsa — panelga qaytariladi; begona panelga o‘tolmaydi', async () => {
    session.save({ accessToken: 'access-1', refreshToken: 'refresh-1', user: operator });
    mockBackend({ 'GET /api/auth/me': () => json(200, operator) });
    window.history.pushState({}, '', '/superadmin');

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/operator'));
  });

  it('sessiya serverda tugagan (refresh ham o‘tmaydi) — login sahifasiga chiqariladi', async () => {
    session.save({ accessToken: 'expired', refreshToken: 'revoked', user: operator });
    mockBackend({
      'GET /api/auth/me': () => json(401, { message: 'Sessiya tugagan, qaytadan kiring' }),
      'POST /api/auth/refresh': () => json(401, { message: 'Sessiya tugagan, qaytadan kiring' }),
    });
    window.history.pushState({}, '', '/operator');

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(session.accessToken).toBeNull();
    expect(session.refreshToken).toBeNull();
  });

  it('mavjud bo‘lmagan manzil — 404', async () => {
    mockBackend({});
    window.history.pushState({}, '', '/yoq-sahifa');
    render(<App />);
    expect(await screen.findByText('Sahifa topilmadi')).toBeInTheDocument();
  });
});
