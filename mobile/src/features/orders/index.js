import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';

/**
 * Provides the current user's order list plus order creation.
 * Data comes from the live API only — no mock fallback; when the orders
 * endpoint is unavailable the list stays empty and `error` is set so the UI
 * can show an honest empty state.
 * createOrder() throws to the caller on failure so the UI can show inline errors.
 *
 * @returns {{ orders: object[], isLoading: boolean, error: Error|null, createOrder: (payload: object) => Promise<object>, refetch: () => void }}
 */
export default function useOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const normalizeOrders = useCallback((payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.items)) return payload.items;
    return [];
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.orders.list();
      setOrders(normalizeOrders(data));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [normalizeOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /**
   * Creates a new order and prepends it to local state after the backend confirms it.
   * Throws on failure — the caller is responsible for handling the error.
   */
  const createOrder = useCallback(async (payload) => {
    const created = await api.orders.checkout(payload);
    setOrders((current) => [created, ...current]);
    return created;
  }, []);

  return { orders, isLoading, error, createOrder, refetch: fetchOrders };
}
