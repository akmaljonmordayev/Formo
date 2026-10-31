import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { getCached, setCached } from '../../utils/memCache';

/**
 * Saqlangan manzillar (GET/POST /api/addresses).
 * `create` yangi manzilni qaytaradi yoki ApiError tashlaydi (validatsiya xabari bilan).
 */
export function useAddresses() {
  const [addresses, setAddresses] = useState(() => getCached('addresses') || []);
  const [isLoading, setIsLoading] = useState(() => getCached('addresses') === undefined);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    // Keshdagi ro'yxat ko'rinib turadi — spinner faqat birinchi marta
    setIsLoading(getCached('addresses') === undefined);
    setError(null);
    try {
      setAddresses(setCached('addresses', (await api.addresses.list()) || []));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (payload) => {
      const created = await api.addresses.create(payload);
      await refetch();
      return created;
    },
    [refetch],
  );

  const remove = useCallback(
    async (id) => {
      await api.addresses.remove(id);
      await refetch();
    },
    [refetch],
  );

  const update = useCallback(
    async (id, fields) => {
      const updated = await api.addresses.update(id, fields);
      await refetch();
      return updated;
    },
    [refetch],
  );

  return { addresses, isLoading, error, refetch, create, update, remove };
}

/** Yetkazish kunlari va slotlari (GET /api/checkout/delivery-slots): { fee, days } */
export function useDeliverySlots(days = 3) {
  const [data, setData] = useState({ fee: 0, days: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData((await api.orders.deliverySlots(days)) || { fee: 0, days: [] });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { fee: data.fee, days: data.days, isLoading, error, refetch };
}

/** POST /api/orders/checkout — yaratilgan buyurtma (+ payment) yoki ApiError */
export const placeOrder = (payload) => api.orders.checkout(payload);
