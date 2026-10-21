import { useEffect, useRef } from 'react';

// Sahifa ko'rinib turgandagina `fn` ni har `ms` da chaqiradi; tab yashirilsa yoki unmount bo'lsa to'xtaydi.
// Tab qaytib ko'ringanda darhol bir marta ishlaydi; oldingi chaqiruv tugamaguncha yangisi boshlanmaydi.
export function usePolling(fn, ms = 5000) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    let timer = null;
    let busy = false;
    const run = async () => {
      if (busy) return;
      busy = true;
      try {
        await ref.current();
      } catch {
        // keyingi poll qayta urinadi
      } finally {
        busy = false;
      }
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(run, ms);
    };
    const onVis = () => {
      if (document.hidden) stop();
      else {
        run();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ms]);
}
