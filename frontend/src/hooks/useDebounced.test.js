import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounced } from './useDebounced';

describe('useDebounced', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('boshlang‘ich qiymat darhol qaytadi', () => {
    const { result } = renderHook(() => useDebounced('a'));
    expect(result.current).toBe('a');
  });

  it('tez-tez o‘zgarsa faqat oxirgi qiymat, kutish tugagach o‘tadi', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounced(value, 300), {
      initialProps: { value: 'i' },
    });

    rerender({ value: 'ip' });
    act(() => vi.advanceTimersByTime(200));
    rerender({ value: 'ipa' });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('i');

    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('ipa');
  });

  it('unmount bo‘lganda taymer tozalanadi', () => {
    const { rerender, unmount } = renderHook(({ value }) => useDebounced(value), { initialProps: { value: 'a' } });
    rerender({ value: 'b' });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
