import { parseCorsOrigins, parseTrustProxy } from './http.config';

describe('parseCorsOrigins', () => {
  it('berilmasa — lokal Vite manzili', () => {
    expect(parseCorsOrigins(undefined)).toEqual(['http://localhost:5173']);
  });

  it('vergul bilan ajratilgan ro‘yxat, bo‘shliq va oxirgi "/" tozalanadi', () => {
    expect(parseCorsOrigins(' https://a.uz/ ,http://b.uz:8080 ,, ')).toEqual(['https://a.uz', 'http://b.uz:8080']);
  });

  it('bo‘sh qator — bo‘sh ro‘yxat', () => {
    expect(parseCorsOrigins('')).toEqual([]);
  });
});

describe('parseTrustProxy', () => {
  it('berilmasa: productionda bitta proxy, devda o‘chiq', () => {
    expect(parseTrustProxy(undefined, 'production')).toBe(1);
    expect(parseTrustProxy('', 'production')).toBe(1);
    expect(parseTrustProxy(undefined, 'development')).toBe(false);
    expect(parseTrustProxy(undefined, undefined)).toBe(false);
  });

  it.each([
    ['true', true],
    ['false', false],
    ['0', 0],
    ['2', 2],
    [' 1 ', 1],
    ['loopback, 10.0.0.0/8', 'loopback, 10.0.0.0/8'],
  ])('%s -> %p', (value, expected) => {
    expect(parseTrustProxy(value, 'production')).toBe(expected);
  });
});
