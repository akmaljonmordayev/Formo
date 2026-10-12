import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api';
import { session, SESSION_EXPIRED_EVENT } from './session';

const json = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

/** fetch chaqiriqlarini { url, method, headers, body } ko'rinishida qaytaradi */
const calls = () =>
  fetch.mock.calls.map(([url, init]) => ({
    url,
    method: init.method,
    auth: init.headers.Authorization,
    body: init.body ? JSON.parse(init.body) : undefined,
  }));

describe('api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('so‘rov', () => {
    it('GET: /api prefiksi, JSON header, token bo‘lmasa Authorization yo‘q', async () => {
      fetch.mockResolvedValue(json(200, { ok: true }));

      await expect(api('/admin/users')).resolves.toEqual({ ok: true });

      const [url, init] = fetch.mock.calls[0];
      expect(url).toBe('/api/admin/users');
      expect(init.method).toBe('GET');
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(init.body).toBeUndefined();
    });

    it('token bo‘lsa Bearer header qo‘shiladi, body JSON qilinadi', async () => {
      session.save({ accessToken: 'access-1', refreshToken: 'refresh-1' });
      fetch.mockResolvedValue(json(201, { id: 5 }));

      await api('/admin/workshops', { method: 'POST', body: { fullName: 'Sardor' } });

      expect(calls()[0]).toEqual({
        url: '/api/admin/workshops',
        method: 'POST',
        auth: 'Bearer access-1',
        body: { fullName: 'Sardor' },
      });
    });

    it('auth: false — token bo‘lsa ham yuborilmaydi (login)', async () => {
      session.save({ accessToken: 'access-1', refreshToken: 'refresh-1' });
      fetch.mockResolvedValue(json(200, {}));

      await api('/auth/login', { method: 'POST', body: {}, auth: false });

      expect(calls()[0].auth).toBeUndefined();
    });
  });

  describe('xatolar', () => {
    it('server xabari ApiError ga o‘tadi (status bilan)', async () => {
      fetch.mockResolvedValue(json(409, { message: 'Bu telefon raqam band' }));

      const error = await api('/admin/workshops', { method: 'POST', body: {} }).catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Bu telefon raqam band');
      expect(error.status).toBe(409);
    });

    it('validatsiya xabarlari massiv bo‘lsa — birinchisi ko‘rsatiladi', async () => {
      fetch.mockResolvedValue(json(400, { message: ['Ismingizni kiriting', 'Parol qisqa'] }));
      await expect(api('/x')).rejects.toThrow('Ismingizni kiriting');
    });

    it('JSON bo‘lmagan javob (502 HTML) — umumiy xabar', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      });
      await expect(api('/x')).rejects.toThrow('Serverda xatolik yuz berdi');
    });

    it('429 — tushunarli xabar', async () => {
      fetch.mockResolvedValue(json(429, { message: 'ThrottlerException: Too Many Requests' }));
      const error = await api('/auth/login', { method: 'POST', body: {}, auth: false }).catch((e) => e);
      expect(error.status).toBe(429);
      expect(error.message).toMatch(/Juda ko'p urinish/);
    });

    it('login 401 (auth: false) — refresh urinilmaydi', async () => {
      session.save({ accessToken: 'old', refreshToken: 'refresh-1' });
      fetch.mockResolvedValue(json(401, { message: "Telefon raqam yoki parol noto'g'ri" }));

      await expect(api('/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toThrow(/noto'g'ri/);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(session.refreshToken).toBe('refresh-1');
    });

    it('refresh token yo‘q bo‘lsa 401 — refresh urinilmaydi', async () => {
      fetch.mockResolvedValue(json(401, { message: 'Unauthorized' }));
      await expect(api('/auth/me')).rejects.toMatchObject({ status: 401 });
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('access token muddati tugaganda', () => {
    const fresh = { accessToken: 'access-2', refreshToken: 'refresh-2' };

    beforeEach(() => {
      session.save({ accessToken: 'access-1', refreshToken: 'refresh-1', user: { id: 1 } });
    });

    it('401 -> refresh -> so‘rov yangi token bilan qayta yuboriladi', async () => {
      fetch
        .mockResolvedValueOnce(json(401, { message: 'Sessiya tugagan' }))
        .mockResolvedValueOnce(json(200, fresh))
        .mockResolvedValueOnce(json(200, { id: 1 }));

      await expect(api('/auth/me')).resolves.toEqual({ id: 1 });

      expect(calls()).toEqual([
        { url: '/api/auth/me', method: 'GET', auth: 'Bearer access-1', body: undefined },
        { url: '/api/auth/refresh', method: 'POST', auth: undefined, body: { refreshToken: 'refresh-1' } },
        { url: '/api/auth/me', method: 'GET', auth: 'Bearer access-2', body: undefined },
      ]);
      expect(session.accessToken).toBe('access-2');
      expect(session.refreshToken).toBe('refresh-2');
      expect(session.user).toEqual({ id: 1 });
    });

    it('bir vaqtda bir nechta 401 — refresh faqat bir marta chaqiriladi', async () => {
      // Rotatsiya: ikkinchi refresh eski token bilan ketsa server sessiyani o'g'irlangan deb yopadi
      fetch.mockImplementation(async (url, init) => {
        if (url === '/api/auth/refresh') return json(200, fresh);
        return init.headers.Authorization === 'Bearer access-2' ? json(200, { url }) : json(401, {});
      });

      const results = await Promise.all([api('/a'), api('/b'), api('/c')]);

      expect(results).toEqual([{ url: '/api/a' }, { url: '/api/b' }, { url: '/api/c' }]);
      expect(calls().filter((c) => c.url === '/api/auth/refresh')).toHaveLength(1);
    });

    it('refresh ham o‘tmasa — sessiya tozalanadi va ilovaga xabar beriladi', async () => {
      const onExpired = vi.fn();
      window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
      fetch
        .mockResolvedValueOnce(json(401, { message: 'Sessiya tugagan, qaytadan kiring' }))
        .mockResolvedValueOnce(json(401, { message: 'Sessiya tugagan, qaytadan kiring' }));

      await expect(api('/auth/me')).rejects.toMatchObject({ status: 401 });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(session.accessToken).toBeNull();
      expect(session.refreshToken).toBeNull();
      expect(session.user).toBeNull();
      expect(onExpired).toHaveBeenCalledTimes(1);
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    });

    it('muvaffaqiyatsiz refreshdan keyin keyingi urinish yana refresh qila oladi', async () => {
      fetch.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {}));
      await expect(api('/auth/me')).rejects.toBeInstanceOf(ApiError);

      session.save({ accessToken: 'access-1', refreshToken: 'refresh-1' });
      fetch
        .mockResolvedValueOnce(json(401, {}))
        .mockResolvedValueOnce(json(200, fresh))
        .mockResolvedValueOnce(json(200, { id: 1 }));
      await expect(api('/auth/me')).resolves.toEqual({ id: 1 });
    });
  });

  describe('VITE_API_URL', () => {
    it.each(['https://api.example.com', 'https://api.example.com/', 'https://api.example.com//'])(
      '%s — manzil bitta slash bilan yig‘iladi',
      async (base) => {
        vi.resetModules();
        vi.stubEnv('VITE_API_URL', base);
        const { api: prodApi } = await import('./api');
        fetch.mockResolvedValue(json(200, {}));

        await prodApi('/auth/me');

        expect(fetch.mock.calls[0][0]).toBe('https://api.example.com/api/auth/me');
      },
    );
  });
});
