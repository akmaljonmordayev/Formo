import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { api } from '../../services/api';
import { getCached, setCached } from '../../utils/memCache';


/** Balans harakati turi → i18n kaliti va belgisi */
export const TX_META = {
  TOPUP: { key: 'txTopUp', icon: 'arrow-down-bold-circle-outline' },
  TOPUP_REVERSAL: { key: 'txReversal', icon: 'arrow-up-bold-circle-outline' },
  ORDER_PAYMENT: { key: 'txOrderPayment', icon: 'shopping-outline' },
  ORDER_REFUND: { key: 'txOrderRefund', icon: 'cash-refund' },
};

/** Savatdagi summaga balans yetadimi (yakuniy tekshiruvni baribir server qiladi) */
export const canPayFromBalance = (balance, total) => Number.isFinite(balance) && Number.isFinite(total) && balance >= total;

/**
 * GET /wallet. Returns balance, transaction history and refetch state.
 */
export default function useWallet(enabled = true) {
  const [data, setData] = useState(() => (enabled ? getCached('wallet') ?? null : null));
  const [isLoading, setIsLoading] = useState(() => enabled && getCached('wallet') === undefined);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  const refetch = useCallback(async ({ silent = false } = {}) => {
    if (!enabled) return;
    const id = ++seq.current;
    if (!silent) setIsLoading(true);
    try {
      const result = await api.wallet.get();
      if (id !== seq.current) return;
      setData(setCached('wallet', result));
      setError(null);
    } catch (err) {
      if (id === seq.current) setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (id === seq.current) setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refetch({ silent: getCached('wallet') !== undefined });
  }, [refetch]);

  useEffect(() => {
    if (!enabled) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch({ silent: true });
    });
    return () => sub.remove();
  }, [enabled, refetch]);


  return {
    balance: data ? data.balance : null,
    transactions: data?.transactions || [],
    isLoading,
    error,
    refetch,
  };
}
