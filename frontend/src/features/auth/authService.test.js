import { beforeEach, describe, expect, it, vi } from 'vitest';

const load = async (mock) => {
  vi.resetModules();
  vi.stubEnv('VITE_USE_MOCK_AUTH', mock ? 'true' : 'false');
  const api = vi.fn();
  vi.doMock('../../services/api', () => ({ api }));
  return { api, ...(await import('./authService')) };
};

describe('authService (real backend)', () => {
  let svc;
  beforeEach(async () => {
    svc = await load(false);
  });

  it('login — tokensiz POST', async () => {
    svc.api.mockResolvedValue({ accessToken: 'a' });
    const credentials = { phone: '+998901111111', password: 'x' };
    await expect(svc.login(credentials)).resolves.toEqual({ accessToken: 'a' });
    expect(svc.api).toHaveBeenCalledWith('/auth/login', { method: 'POST', body: credentials, auth: false });
  });

  it('logout — server xato qaytarsa ham lokal chiqish to‘xtamaydi', async () => {
    svc.api.mockRejectedValue(new Error('network'));
    await expect(svc.logout()).resolves.toBeUndefined();
    expect(svc.api).toHaveBeenCalledWith('/auth/logout', { method: 'POST' });
  });

  it('fetchMe — /auth/me', async () => {
    svc.api.mockResolvedValue({ id: 1 });
    await expect(svc.fetchMe()).resolves.toEqual({ id: 1 });
    expect(svc.api).toHaveBeenCalledWith('/auth/me');
  });
});

describe('authService (VITE_USE_MOCK_AUTH=true)', () => {
  let svc;
  beforeEach(async () => {
    svc = await load(true);
  });

  it('backendga murojaat qilmaydi', async () => {
    const result = await svc.login({ phone: '+998901111111', password: 'admin123' });
    await svc.logout();
    await expect(svc.fetchMe()).resolves.toBeNull();

    expect(svc.api).not.toHaveBeenCalled();
    expect(result.user.role).toBe('SUPERADMIN');
    expect(result.user).not.toHaveProperty('password');
  });

  it('noto‘g‘ri parol — xato', async () => {
    await expect(svc.login({ phone: '+998901111111', password: 'wrong' })).rejects.toThrow(/noto'g'ri/);
  });
});
