import { describe, expect, it } from 'vitest';
import { cx, initialsOf, prettyPhone } from './utils';

describe('cx', () => {
  it('bo‘sh/yolg‘on qiymatlarni tashlab, klasslarni birlashtiradi', () => {
    expect(cx('a', false, null, undefined, '', 'b', 0 && 'c')).toBe('a b');
    expect(cx()).toBe('');
  });
});

describe('initialsOf', () => {
  it.each([
    ['Akmal Toshev', 'AT'],
    ['  sardor   aliyev  karimovich ', 'SA'],
    ['Madina', 'M'],
    ['', 'TS'],
    ['   ', 'TS'],
  ])('"%s" -> %s', (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });

  it('argumentsiz — standart', () => {
    expect(initialsOf()).toBe('TS');
  });
});

describe('prettyPhone', () => {
  it('+998903333333 -> +998 90 333 33 33', () => {
    expect(prettyPhone('+998903333333')).toBe('+998 90 333 33 33');
  });

  it('mos kelmasa o‘zgarishsiz', () => {
    expect(prettyPhone('903333333')).toBe('903333333');
    expect(prettyPhone()).toBe('');
  });
});
