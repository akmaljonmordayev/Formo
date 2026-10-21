import { useCallback, useEffect, useState } from 'react';
import { chatApi } from './chatApi';
import { usePolling } from './usePolling';

const UNREAD_POLL_MS = 20000;

// O'qilmagan xabarlar umumiy soni (menyudagi belgi uchun); xatolar yutiladi
export function useChatUnread() {
  const [total, setTotal] = useState(0);
  const load = useCallback(async () => {
    try {
      const data = await chatApi.unread();
      setTotal(Number(data?.total) || 0);
    } catch {
      // belgi shunchaki yangilanmaydi
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  usePolling(load, UNREAD_POLL_MS);
  return total;
}
