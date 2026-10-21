import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api } from '../../services/api';

// Ro'yxat/badge sekin, ochiq suhbat tez yangilanadi
export const LIST_POLL_MS = 20000;
export const MESSAGES_POLL_MS = 5000;

const toError = (err) => (err instanceof Error ? err : new Error(String(err)));

/** Interval bilan qayta yuklash; ekran yopilganda to'xtaydi */
function usePolling(fn, ms, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(() => fnRef.current(), ms);
    return () => clearInterval(timer);
  }, [ms, enabled]);
}

/** Id bo'yicha birlashtirish (takrorlarsiz), eskisi birinchi */
function mergeMessages(prev, incoming) {
  if (!incoming.length) return prev;
  const seen = new Set(prev.map((m) => m.id));
  const fresh = incoming.filter((m) => !seen.has(m.id));
  return fresh.length ? [...prev, ...fresh] : prev;
}

/** Mening suhbatlarim (GET /api/chat/conversations), 20 s da yangilanadi */
export function useConversations() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await api.chat.conversations();
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(toError(err));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  usePolling(() => refresh({ silent: true }), LIST_POLL_MS);

  return { items, isLoading, error, refresh };
}

/**
 * Bitta suhbat xabarlari. Birinchi yuklash — oxirgi 100 ta, so'ng har 5 s da
 * `after` = eng katta id bilan faqat yangilari. Ilova fonda bo'lsa polling to'xtaydi.
 *
 * @returns {{ messages: object[], isLoading: boolean, error: Error|null, sendError: Error|null,
 *   sending: boolean, send: (text: string) => Promise<boolean>, refresh: () => Promise<void> }}
 */
export function useChatMessages(conversationId) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(conversationId));
  const [error, setError] = useState(null);
  const [sendError, setSendError] = useState(null);
  const [sending, setSending] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');

  const lastIdRef = useRef(null);
  // Suhbat almashganda eski javoblar e'tiborsiz qoldiriladi
  const convRef = useRef(conversationId);
  convRef.current = conversationId;
  const inFlightRef = useRef(false);

  const apply = useCallback((items) => {
    if (!items.length) return;
    setMessages((prev) => {
      const next = mergeMessages(prev, items);
      const last = next[next.length - 1];
      lastIdRef.current = last ? last.id : lastIdRef.current;
      return next;
    });
  }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
    const id = conversationId;
    if (!id || inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) setIsLoading(true);
    try {
      const params = lastIdRef.current ? { after: lastIdRef.current } : {};
      const data = await api.chat.messages(id, params);
      if (convRef.current !== id) return;
      apply(data?.items || []);
      setError(null);
    } catch (err) {
      if (convRef.current === id && !silent) setError(toError(err));
    } finally {
      inFlightRef.current = false;
      if (!silent && convRef.current === id) setIsLoading(false);
    }
  }, [conversationId, apply]);

  useEffect(() => {
    lastIdRef.current = null;
    inFlightRef.current = false;
    setMessages([]);
    setError(null);
    setSendError(null);
    setIsLoading(Boolean(conversationId));
    if (conversationId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => sub.remove();
  }, []);

  usePolling(() => load({ silent: true }), MESSAGES_POLL_MS, Boolean(conversationId) && active);

  const send = useCallback(async (text) => {
    const id = conversationId;
    const body = String(text || '').trim();
    if (!id || !body) return false;
    setSending(true);
    setSendError(null);
    try {
      const message = await api.chat.send(id, body);
      if (convRef.current !== id) return false;
      apply([message]);
      return true;
    } catch (err) {
      if (convRef.current === id) setSendError(toError(err));
      return false;
    } finally {
      setSending(false);
    }
  }, [conversationId, apply]);

  return { messages, isLoading, error, sendError, sending, send, refresh: load };
}

/** O'qilmagan xabarlar soni (GET /api/chat/unread), 20 s da yangilanadi; xatolar yutiladi */
export function useChatUnread(enabled = true) {
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const data = await api.chat.unread();
      setTotal(Number(data?.total) || 0);
    } catch {
      // badge muhim emas — keyingi so'rovda tiklanadi
    }
  }, []);

  useEffect(() => {
    if (enabled) refresh();
    else setTotal(0);
  }, [enabled, refresh]);

  usePolling(refresh, LIST_POLL_MS, enabled);

  return { total, refresh };
}
