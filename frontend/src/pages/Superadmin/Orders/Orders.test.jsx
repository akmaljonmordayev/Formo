import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SuperadminOrders from './index';
import { ordersApi } from '../../../features/platform/platformApi';

vi.mock('../../../features/platform/platformApi', async (orig) => ({
  ...(await orig()),
  ordersApi: { list: vi.fn() },
}));

const page = (byStatus) => ({ items: [], total: 0, byStatus });

describe('Buyurtmalar sahifasi', () => {
  afterEach(() => vi.useRealTimers());

  it("'Yangi' (NEW) tab bor; ro'yxat 30 s da jim yangilanadi, yashirin vkladkada — yo'q", async () => {
    vi.useFakeTimers();
    ordersApi.list.mockResolvedValue(page({ NEW: 2, DELIVERED: 1 }));
    render(<MemoryRouter><SuperadminOrders /></MemoryRouter>);
    await act(async () => {});
    expect(screen.getByRole('button', { name: /Yangi · 2/ })).toBeTruthy();
    expect(ordersApi.list).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(ordersApi.list).toHaveBeenCalledTimes(2);

    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(ordersApi.list).toHaveBeenCalledTimes(2);
    visibility.mockRestore();
  });
});
