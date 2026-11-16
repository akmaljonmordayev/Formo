import { useCallback, useEffect, useRef, useState } from 'react';
import { kit360Message, parseKit360Message } from '../../../features/kit360';
import { framesOf } from './frames';

const DEBOUNCE_MS = 80;

/**
 * Ilova ↔ Forma 360° viewer ko'prigi (native WebView va web iframe uchun bir xil): "ready" deguncha kutadi,
 * keyin ism/raqam/tomon o'zgarganda ~80 ms debounce bilan "update" yuboradi.
 *
 * Viewer HTML'da kadrlar yo'q: jamoa kadrlari (~0.5 MB) faqat jamoa birinchi marta ko'rsatilganda (yoki viewer qayta
 * yuklanganda) xabarga qo'shiladi — keyingi ism/raqam xabarlari yengil.
 */
export default function useKit360Bridge({ team, variant, name, number, shortsNumber, view, onViewChange }, post) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const timer = useRef(null);
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;
  // Viewer'ga kadrlari yuborilgan jamoa (viewer qayta yuklansa — null)
  const sentTeam = useRef(null);
  const state = useRef({});
  state.current = { team, variant, name, number, shortsNumber, side: view };

  const send = useCallback(() => {
    const s = state.current;
    const frames = sentTeam.current === s.team ? undefined : framesOf(s.team) || undefined;
    post(kit360Message({ ...s, frames }));
    if (frames) sentTeam.current = s.team;
  }, [post]);

  useEffect(() => {
    if (!ready) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(send, DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [ready, team, variant, name, number, shortsNumber, view, send]);

  const onMessage = useCallback(
    (raw) => {
      const msg = parseKit360Message(raw);
      if (!msg) return;
      if (msg.type === 'ready') {
        // Yangi (yoki qayta yuklangan) viewer — kadrlar yo'q, birinchi xabar ular bilan
        sentTeam.current = null;
        setError(null);
        setReady(true);
        send();
      } else if (msg.type === 'face') {
        onViewChangeRef.current?.(msg.view);
      } else if (msg.type === 'error') {
        setError(msg.message || 'error');
      }
    },
    [send],
  );

  const reset = useCallback(() => {
    sentTeam.current = null;
    setReady(false);
    setError(null);
  }, []);

  return { ready, error, onMessage, reset };
}
