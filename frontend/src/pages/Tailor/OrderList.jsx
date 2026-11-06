import { useMemo, useState } from 'react';
import OrderCard from './OrderCard';
import OrderDrawer from './OrderDrawer';
import { groupActiveOrders } from './orderBuckets';
import { useT } from './i18n';
import { useTailor } from './prefs';
import useOrderActions from './useOrderActions';

/** Bitta tekis ro'yxat. view: active (kechikkanlar birinchi, keyin muddat bo'yicha) | ready */
export default function OrderList({ view }) {
  const t = useT();
  const { orders = [], ordersError = '', ordersLoading = false } = useTailor() ?? {};
  const { advance, reject, showToast, toastView, actionLoading } = useOrderActions();
  const [openId, setOpenId] = useState(null);

  const rows = useMemo(() => {
    if (view === 'ready') {
      return orders.filter((o) => o.status === 'tayyor').map((order) => ({ order, bucket: 'ready' }));
    }
    const groups = groupActiveOrders(orders);
    return ['late', 'today', 'upcoming', 'nodate'].flatMap((bucket) => groups[bucket].map((order) => ({ order, bucket })));
  }, [orders, view]);

  const opened = orders.find((o) => o.id === openId) ?? null;

  return (
    <div className="space-y-3">
      {toastView}
      {ordersError && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{ordersError}</div>
      )}

      {rows.map(({ order, bucket }, index) => (
        <OrderCard
          key={order.id}
          index={index + 1}
          order={order}
          bucket={bucket}
          onOpen={(o) => setOpenId(o.id)}
          onAdvance={advance}
          actionLoading={actionLoading}
        />
      ))}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#121829] px-6 py-12 text-center text-sm text-slate-400">
          {ordersLoading ? t('api.loading') : view === 'ready' ? t('prod.emptyReady') : t('q.allDone')}
        </div>
      )}

      <OrderDrawer
        order={opened}
        onClose={() => setOpenId(null)}
        onAdvance={advance}
        onReject={reject}
        actionLoading={actionLoading}
        onToast={showToast}
      />
    </div>
  );
}
