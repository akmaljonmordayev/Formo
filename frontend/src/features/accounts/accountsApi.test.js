import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../services/api';
import { formatDate, operatorApi, prettyPhone, usersApi, workshopsApi } from './accountsApi';

vi.mock('../../services/api', () => ({ api: vi.fn() }));

describe('accountsApi', () => {
  beforeEach(() => api.mockResolvedValue({}));

  describe('query string', () => {
    it('parametrsiz — "?" qo‘shilmaydi', () => {
      workshopsApi.list();
      expect(api).toHaveBeenCalledWith('/admin/workshops');
    });

    it('bo‘sh qiymatlar (undefined, null, "") tashlab yuboriladi, false saqlanadi', () => {
      usersApi.list({ search: '', isActive: false, page: 2, limit: undefined, x: null });
      expect(api).toHaveBeenCalledWith('/admin/users?isActive=false&page=2');
    });

    it('qidiruv matni URL uchun kodlanadi', () => {
      workshopsApi.list({ search: "Ipak Yo'li & Co" });
      expect(api).toHaveBeenCalledWith('/admin/workshops?search=Ipak+Yo%27li+%26+Co');
    });
  });

  it('operator — id siz singular resurs', () => {
    operatorApi.get();
    operatorApi.create({ fullName: 'D' });
    operatorApi.update({ isActive: false });
    operatorApi.remove();
    expect(api.mock.calls).toEqual([
      ['/admin/operator'],
      ['/admin/operator', { method: 'POST', body: { fullName: 'D' } }],
      ['/admin/operator', { method: 'PATCH', body: { isActive: false } }],
      ['/admin/operator', { method: 'DELETE' }],
    ]);
  });

  it('tikuv sexlari — id bo‘yicha tahrirlash va o‘chirish', () => {
    workshopsApi.create({ workshopName: 'Ipak' });
    workshopsApi.update(7, { address: 'Chilonzor' });
    workshopsApi.remove(7);
    expect(api.mock.calls).toEqual([
      ['/admin/workshops', { method: 'POST', body: { workshopName: 'Ipak' } }],
      ['/admin/workshops/7', { method: 'PATCH', body: { address: 'Chilonzor' } }],
      ['/admin/workshops/7', { method: 'DELETE' }],
    ]);
  });

  it('mobil foydalanuvchini bloklash', () => {
    usersApi.setStatus(3, false);
    usersApi.remove(3);
    expect(api.mock.calls).toEqual([
      ['/admin/users/3/status', { method: 'PATCH', body: { isActive: false } }],
      ['/admin/users/3', { method: 'DELETE' }],
    ]);
  });
});

describe('prettyPhone', () => {
  it('+998901234567 -> +998 90 123 45 67', () => {
    expect(prettyPhone('+998901234567')).toBe('+998 90 123 45 67');
  });

  it.each(['', '901234567', '+7999123456', '+99890123456'])('mos kelmasa o‘zgarishsiz: "%s"', (value) => {
    expect(prettyPhone(value)).toBe(value);
  });

  it('argumentsiz — bo‘sh qator', () => {
    expect(prettyPhone()).toBe('');
  });
});

describe('formatDate', () => {
  it('kun, oy, yil — hammasi ko‘rsatiladi', () => {
    const text = formatDate('2026-03-05T12:00:00.000Z');
    expect(text).toMatch(/05/);
    expect(text).toMatch(/03/);
    expect(text).toMatch(/2026/);
  });
});
