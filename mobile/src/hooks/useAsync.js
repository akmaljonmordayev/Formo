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

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fnRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []); // intentionally stable — deps trigger the effect below

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  // Auto-run on mount and whenever deps change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { execute(); }, deps);

  return { data, isLoading, error, execute, reset };
}
