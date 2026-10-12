import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../constants/storage';
import { session } from './session';

const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };
const user = { id: 1, fullName: 'Super Admin', role: 'SUPERADMIN' };

describe('session', () => {
  it('bo‘sh holatda hammasi null', () => {
    expect(session.accessToken).toBeNull();
    expect(session.refreshToken).toBeNull();
    expect(session.user).toBeNull();
  });

  it('save: tokenlar va foydalanuvchi saqlanadi', () => {
    session.save({ ...tokens, user });
    expect(session.accessToken).toBe('access-1');
    expect(session.refreshToken).toBe('refresh-1');
    expect(session.user).toEqual(user);
  });

  it('save: user berilmasa (refresh javobi) avvalgi foydalanuvchi o‘chmaydi', () => {
    session.save({ ...tokens, user });
    session.save({ accessToken: 'access-2', refreshToken: 'refresh-2' });
    expect(session.accessToken).toBe('access-2');
    expect(session.user).toEqual(user);
  });

  it('buzilgan JSON — xato emas, null', () => {
    localStorage.setItem(STORAGE_KEYS.USER, '{not json');
    expect(session.user).toBeNull();
  });

  it('clear: faqat Formo kalitlari o‘chadi', () => {
    session.save({ ...tokens, user });
    localStorage.setItem('other-app', 'keep');
    session.clear();
    expect(session.accessToken).toBeNull();
    expect(session.refreshToken).toBeNull();
    expect(session.user).toBeNull();
    expect(localStorage.getItem('other-app')).toBe('keep');
  });
});
