import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api } from '../../services/api';
import { getCached, setCached } from '../../utils/memCache';

// Holat operator/sex panelida o'zgaradi — ochiq ekran shu oraliqda qayta so'raydi
export const POLL_MS = 20000;

/** Yakunlangan holatlar ("Tugagan" tabi) */
export const FINAL_STATUSES = ['DELIVERED', 'CANCELLED', 'RETURNED'];
export const isFinal = (order) => FINAL_STATUSES.includes(order?.status);

// Mijoz faqat admin buyurtmani qabul qilguncha bekor qila oladi: "Qabul qilindi" (SENT_TO_WORKSHOP) holatidan
// boshlab — yo'q. Muddatni (`cancelWindowHours`) server `canCancel` orqali o'zi tekshiradi.
const CUSTOMER_CANCELLABLE = ['PENDING_PAYMENT', 'NEW'];
export const canCancelOrder = (order) => Boolean(order?.canCancel) && CUSTOMER_CANCELLABLE.includes(order.status);

/** Admin "Qaytarildi" deb belgilagan buyurtma mijozga "Bekor qilindi" bo'lib ko'rinadi */
export const toCustomerOrder = (order) =>
  order?.status === 'RETURNED' ? { ...order, status: 'CANCELLED', statusLabel: null, canCancel: false } : order;

// Backend `PaymentMethod`: BALANCE | CASH | CLICK | PAYME (prisma/schema.prisma).
// Mijoz ilovasida: balans (asosiy) va naqd — naqd faqat Toshkent shahri ichida kuryerga (Superadmin allowCash);
// viloyatlarga (pochta) — faqat balansdan. Click/Payme ko'rsatilmaydi, balans Telegram bot orqali to'ldiriladi.
export const CHECKOUT_METHODS = ['BALANCE', 'CASH'];

/** Buyurtmaning yetkazish qatori: viloyatga "Pochta orqali · 2–5 ish kuni", Toshkent shahriga "Kuryer orqali · 2–3 kun"
 *  (kun/vaqt tanlangan eski buyurtmada — "20.10.2026 · 18:00–22:00") */
export function deliveryText(t, delivery) {
  if (!delivery) return '—';
  if (delivery.date) return [delivery.date.split('-').reverse().join('.'), delivery.slot?.replace('-', '–')].filter(Boolean).join(' · ');
  if (delivery.postal) {
    const days = delivery.postalDays || { min: 2, max: 5 };
    return `${t('postShort')} · ${t('postDaysValue').replace('{min}', days.min).replace('{max}', days.max)}`;
  }
  if (delivery.address) {
    const days = delivery.courierDays || { min: 2, max: 3 };
    return `${t('courierShort')} · ${t('courierDaysValue').replace('{min}', days.min).replace('{max}', days.max)}`;
  }
  return '—';
}

/**
 * Holat nomi joriy tilda. Backend `statusLabel` faqat o'zbekcha — tarjima
 * topilmasa shu qaytariladi.
 */
export function statusText(t, status, fallback) {
  const key = `status_${status}`;
  const text = t(key);
  return text === key ? fallback || status : text;
}

export const paymentText = (t, method) => t(`pay_${method}`);

/** Timeline bo'yicha bajarilgan ulush (0..1) — progress chizig'i uchun */
export function progressOf(order) {
  const steps = order?.timeline || [];
  if (!steps.length) return 0;
  return steps.filter((s) => s.done).length / steps.length;
}

/** Interval bilan qayta yuklash; ekran yopilganda to'xtaydi, ilova fonda bo'lsa so'rov yuborilmaydi (tarmoq va batareya) */
function usePolling(fn, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') fnRef.current();
    }, POLL_MS);
    // Fondan qaytganda keyingi tikni kutmasdan darhol yangilanadi (holat fonda o'zgargan bo'lishi mumkin)
    const sub = AppState.addEventListener?.('change', (state) => {
      if (state === 'active') fnRef.current();
    });
    return () => {
      clearInterval(timer);
      sub?.remove?.();
    };
  }, [enabled]);
}

/**
 * Buyurtmalarim (GET /api/orders). Faqat haqiqiy API — mock yo'q.
 * `silent` yangilash (polling) spinner ko'rsatmaydi.
 *
 * @returns {{ orders: object[], isLoading: boolean, error: Error|null, refetch: () => Promise<void> }}
 */
export default function useOrders() {
  const [orders, setOrders] = useState(() => getCached('orders') || []);
  const [isLoading, setIsLoading] = useState(() => getCached('orders') === undefined);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.orders.list({ limit: 50 });
      setOrders(setCached('orders', (data?.items || []).map(toCustomerOrder)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Keshdan ko'rsatilayotgan bo'lsa — fonda (spinnersiz) yangilaymiz
    fetchOrders({ silent: getCached('orders') !== undefined });
  }, [fetchOrders]);

  usePolling(() => fetchOrders({ silent: true }));

  return { orders, isLoading, error, refetch: fetchOrders };
}

/** Bosh sahifadagi kuzatish kartasi: GET /api/orders/active -> { order | null } */
export function useActiveOrder() {
  const [order, setOrder] = useState(() => getCached('activeOrder') ?? null);
  const [isLoading, setIsLoading] = useState(() => getCached('activeOrder') === undefined);
  const [error, setError] = useState(null);

  const fetchActive = useCallback(async () => {
    try {
      const data = await api.orders.active();
      setOrder(setCached('activeOrder', toCustomerOrder(data?.order) || null));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  usePolling(fetchActive);

  return { order, isLoading, error, refetch: fetchActive };
}

/**
 * Bitta buyurtma (timeline, canCancel, payment) va undagi amallar.
 * Amallar yangilangan buyurtmani qaytaradi yoki ApiError tashlaydi.
 */
export function useOrder(id) {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrder = useCallback(
    async ({ silent = false } = {}) => {
      if (!id) return;
      if (!silent) setIsLoading(true);
      try {
        setOrder(toCustomerOrder(await api.orders.get(id)));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Yakunlangan buyurtma endi o'zgarmaydi — so'rash shart emas
  usePolling(() => fetchOrder({ silent: true }), Boolean(order) && !isFinal(order));

  const run = useCallback(async (call) => {
    const updated = toCustomerOrder(await call());
    setOrder(updated);
    return updated;
  }, []);

  const cancel = useCallback(() => run(() => api.orders.cancel(id)), [id, run]);
  // "Buyurtmani qabul qildim" — yetkazilayotgan buyurtma darhol "Yetkazildi" bo'ladi
  const received = useCallback(() => run(() => api.orders.received(id)), [id, run]);
  const confirmPayment = useCallback(() => run(() => api.orders.confirmPayment(id)), [id, run]);
  const changePaymentMethod = useCallback(
    (method) => run(() => api.orders.changePaymentMethod(id, method)),
    [id, run],
  );

  return { order, isLoading, error, refetch: fetchOrder, cancel, received, confirmPayment, changePaymentMethod };
}
