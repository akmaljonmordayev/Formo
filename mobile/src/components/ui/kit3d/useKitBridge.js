import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MOBILE_TEXTURE_SIZE,
  UPDATE_DEBOUNCE_MS,
  parseViewerMessage,
  printProps,
  viewerMessage,
  withAssetUrls,
} from '../../../features/kit3d';

/**
 * Ilova ↔ viewer.html ko'prigi (native WebView va web iframe uchun bir xil):
 * viewer "ready" deguncha kutadi, keyin propslar o'zgarganda ~80 ms debounce bilan "update" yuboradi.
 * Yozish paytida har harfga sahna qayta chizilmaydi — oxirgi qiymat yuboriladi.
 */
export default function useKitBridge({ design, backName, number, glow, patch, view, onViewChange }, post) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const timer = useRef(null);
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;

  const props = useMemo(
    () => ({
      design: withAssetUrls(design),
      ...printProps(backName, number),
      glow: Boolean(glow),
      patch: patch || null,
      view: view === 'back' ? 'back' : 'front',
      autoRotate: false,
      textureSize: MOBILE_TEXTURE_SIZE,
    }),
    [design, backName, number, glow, patch, view],
  );
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    if (!ready) return undefined;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => post(viewerMessage(latest.current)), UPDATE_DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [ready, props, post]);

  const onMessage = useCallback(
    (raw) => {
      const msg = parseViewerMessage(raw);
      if (!msg) return;
      if (msg.type === 'ready') {
        setError(null);
        setReady(true);
        // Birinchi kadr kechikishsiz
        post(viewerMessage(latest.current));
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
