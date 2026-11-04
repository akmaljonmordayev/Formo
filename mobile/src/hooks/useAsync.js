import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Generic async executor hook.
 *
 * @param {() => Promise<any>} asyncFn - The async function to call.
 * @param {any[]} [deps=[]] - Dependency array (same semantics as useEffect).
 * @returns {{ data: any, isLoading: boolean, error: Error|null, execute: () => Promise<void>, reset: () => void }}
 */
export default function useAsync(asyncFn, deps = []) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Keep a stable ref to the latest asyncFn without re-running effects
  const fnRef = useRef(asyncFn);
  useEffect(() => {
    fnRef.current = asyncFn;
  });

  // Eski so'rov javobi unmount bo'lgan/yangi so'rov boshlangan componentga
  // yozilmasin (boshqa hook'lardagi kabi — features/wallet, features/products)
  const seq = useRef(0);

  const execute = useCallback(async () => {
    const id = ++seq.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fnRef.current();
      if (id === seq.current) setData(result);
    } catch (err) {
      if (id === seq.current) setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (id === seq.current) setIsLoading(false);
    }
  }, []); // intentionally stable — deps trigger the effect below

  // Unmount bo'lganda ham eski javob yozilmasligi uchun seq'ni bir pog'ona oshiramiz
  useEffect(() => () => { seq.current += 1; }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  // Auto-run on mount and whenever deps change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { execute(); }, deps);

  return { data, isLoading, error, execute, reset };
}
