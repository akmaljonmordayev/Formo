import { useCallback, useEffect, useRef, useState } from 'react';
import { kit360Message, parseKit360Message } from '../../../features/kit360';

const DEBOUNCE_MS = 80;

/**
 * Ilova ↔ Forma 360° viewer ko'prigi (native WebView va web iframe uchun bir xil): "ready" deguncha kutadi,
 * keyin ism/raqam/tomon o'zgarganda ~80 ms debounce bilan "update" yuboradi.
 */
export default function useKit360Bridge({ team, name, number, view, onViewChange }, post) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const timer = useRef(null);
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;
  const latest = useRef('');
  latest.current = kit360Message({ team, name, number, side: view });

  useEffect(() => {
    if (!ready) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => post(latest.current), DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [ready, team, name, number, view, post]);

  const onMessage = useCallback(
    (raw) => {
      const msg = parseKit360Message(raw);
      if (!msg) return;
      if (msg.type === 'ready') {
        setError(null);
        setReady(true);
        post(latest.current);
      } else if (msg.type === 'face') {
        onViewChangeRef.current?.(msg.view);
      } else if (msg.type === 'error') {
        setError(msg.message || 'error');
      }
    },
    [post],
  );

  const reset = useCallback(() => {
    setReady(false);
    setError(null);
  }, []);

  return { ready, error, onMessage, reset };
}
