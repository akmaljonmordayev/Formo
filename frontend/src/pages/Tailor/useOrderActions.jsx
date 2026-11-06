import { useCallback, useState } from 'react';
import { useT } from './i18n';
import { useTailor } from './prefs';

const NEXT_STATUS = { yangi: 'qabul', qabul: 'tayyor' };

/** Navbat va Ishlab chiqarish sahifalari uchun umumiy: qabul / tayyor / rad etish + toast */
export default function useOrderActions() {
  const t = useT();
  const { processOrder, rejectOrder, orderActionLoading = false } = useTailor() ?? {};
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const advance = async (order) => {
    if (!processOrder) return;
    try {
      await processOrder(order);
      showToast(t('navbat.statusToast', { id: order.id, status: t(`status.${NEXT_STATUS[order.status]}`) }));
    } catch (requestError) {
      showToast(requestError.message, true);
    }
  };

  const reject = async (order, reason) => {
    if (!rejectOrder) return false;
    try {
      await rejectOrder(order, reason);
      showToast(t('navbat.rejectToast', { id: order.id }));
      return true;
    } catch (requestError) {
      showToast(requestError.message, true);
      return false;
    }
  };

  const toastView = toast && (
    <div
      role="status"
      className={`fixed right-6 top-20 z-[60] flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black shadow-2xl ${
        toast.isError ? 'bg-rose-500 text-white' : 'bg-teal-400 text-slate-950'
      }`}
    >
      <span>{toast.isError ? '!' : '✓'}</span>
      <span>{toast.message}</span>
    </div>
  );

  return { advance, reject, showToast, toastView, actionLoading: orderActionLoading };
}
