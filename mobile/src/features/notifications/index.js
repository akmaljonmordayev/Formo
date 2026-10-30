import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';

/** GET /api/notifications — Superadmin push kampaniyalari (yangilari birinchi) */
export default function useNotifications() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.notifications.list();
      setItems(data?.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, isLoading, error, refetch };
}
