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

/** Birinchi bo'sh kun va vaqt: { deliveryDate, deliverySlot } | null */
export function firstFreeSlot(days) {
  for (const day of days || []) {
    const free = (day.slots || []).find((s) => s.available);
    if (free) return { deliveryDate: day.date, deliverySlot: free.slot };
  }
  return null;
}

/**
 * Yetkazish narxi va muddati (GET /api/checkout/delivery-slots): { fee, postalDays, courierDays }.
 * `region` — tanlangan manzil viloyati: narx shundan. Viloyatlarga pochta orqali (`postalDays` — ish kunlari),
 * Toshkent shahri ichida kuryer (`courierDays` — kun). Kun/vaqt tanlanmaydi.
 * `legacySlot` — faqat eski server uchun (javobida `courierDays` yo'q): u Toshkent shahriga kun/vaqtni majburiy
 * qiladi, shuning uchun birinchi bo'sh vaqt yuboriladi. Yangi serverda — null.
 */
export function useDeliverySlots(days = 3, region) {
  // fee: null — hali yuklanmagan (ekran shu paytda spinner ko'rsatadi)
  const [data, setData] = useState({ fee: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setData((await api.orders.deliverySlots(days, region)) || { fee: 0 });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [days, region]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    fee: data.fee,
    postalDays: data.postalDays || { min: 2, max: 5 },
    // Eski server `courierDays` qaytarmaydi — standart muddat
    courierDays: data.courierDays || { min: 2, max: 3 },
    legacySlot: data.courierDays ? null : firstFreeSlot(data.days),
    isLoading,
    error,
    refetch,
  };
}

/** POST /api/orders/checkout — yaratilgan buyurtma (+ payment) yoki ApiError */
export const placeOrder = (payload) => api.orders.checkout(payload);
