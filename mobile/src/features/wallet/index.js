import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { api } from '../../services/api';
import { isBotUsername } from '../config';

// Ochiq so'rov (chek kutilmoqda / tekshiruvda) bo'lsa holat shu oraliqda yangilanadi
export const WALLET_POLL_MS = 15000;
export const OPEN_TOPUP = ['PENDING', 'REVIEW'];

/** Balans harakati turi → i18n kaliti va belgisi */
export const TX_META = {
  TOPUP: { key: 'txTopUp', icon: 'arrow-down-bold-circle-outline' },
  TOPUP_REVERSAL: { key: 'txReversal', icon: 'arrow-up-bold-circle-outline' },
  ORDER_PAYMENT: { key: 'txOrderPayment', icon: 'shopping-outline' },
  ORDER_REFUND: { key: 'txOrderRefund', icon: 'cash-refund' },
};

/** To'ldirish so'rovi holati → i18n kaliti va rang ohangi (Badge variant) */
export const TOPUP_STATUS = {
  PENDING: { key: 'topupPending', tone: 'orange' },
  REVIEW: { key: 'topupReview', tone: 'orange' },
  APPROVED: { key: 'topupApproved', tone: 'teal' },
  REJECTED: { key: 'topupRejected', tone: 'red' },
  CANCELLED: { key: 'topupCancelled', tone: 'red' },
};

/** Botni "to'ldirish" oqimida ochadigan havolalar: avval Telegram ilovasi, bo'lmasa brauzer */
export function topUpLinks(bot) {
  if (!isBotUsername(bot)) return null;
  return { app: `tg://resolve?domain=${bot}&start=topup`, web: `https://t.me/${bot}?start=topup` };
}

/** true — havola ochildi */
export async function openTopUpBot(bot) {
  const links = topUpLinks(bot);
  if (!links) return false;
  try {
    if (await Linking.canOpenURL(links.app)) {
      await Linking.openURL(links.app);
      return true;
    }
  } catch {
    // tg:// sxemasi ruxsat etilmagan — https orqali
  }
  try {
    await Linking.openURL(links.web);
    return true;
  } catch {
    return false;
  }
}

/** Savatdagi summaga balans yetadimi (yakuniy tekshiruvni baribir server qiladi) */
export const canPayFromBalance = (balance, total) => Number.isFinite(balance) && Number.isFinite(total) && balance >= total;

/**
 * GET /wallet. Ilovaga qaytganda (Telegram'dan) va ochiq so'rov bo'lsa har 15 soniyada yangilanadi.
 * Returns { balance, transactions, topUps, hasOpen, isLoading, error, refetch }
 */
export default function useWallet(enabled = true) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  const refetch = useCallback(async ({ silent = false } = {}) => {
    if (!enabled) return;
    const id = ++seq.current;
    if (!silent) setIsLoading(true);
    try {
      const result = await api.wallet.get();
      if (id !== seq.current) return;
      setData(result);
      setError(null);
    } catch (err) {
      if (id === seq.current) setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (id === seq.current) setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!enabled) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch({ silent: true });
    });
    return () => sub.remove();
  }, [enabled, refetch]);

  const topUps = data?.topUps || [];
  const hasOpen = topUps.some((x) => OPEN_TOPUP.includes(x.status));
  useEffect(() => {
    if (!hasOpen) return undefined;
    const timer = setInterval(() => refetch({ silent: true }), WALLET_POLL_MS);
    return () => clearInterval(timer);
  }, [hasOpen, refetch]);

  return {
    balance: data ? data.balance : null,
    transactions: data?.transactions || [],
    topUps,
    hasOpen,
    isLoading,
    error,
    refetch,
  };
}
