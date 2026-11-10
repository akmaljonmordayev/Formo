import { useMemo, useState } from 'react';
import OrderCard from './OrderCard';
import OrderDrawer from './OrderDrawer';
import { groupActiveOrders } from './orderBuckets';
import { useT } from './i18n';
import { useTailor } from './prefs';
import useOrderActions from './useOrderActions';

/** Bitta tekis ro'yxat. view: active (kechikmagan, muddat bo'yicha) | late (kechikkanlar) | ready (tayyorlar) */
export default function OrderList({ view }) {
  const t = useT();
  const { orders = [], ordersError = '', ordersLoading = false } = useTailor() ?? {};
  const { advance, reject, toastView, actionLoading } = useOrderActions();
  const [openId, setOpenId] = useState(null);

  const rows = useMemo(() => {
    if (view === 'ready') {
      return orders.filter((o) => o.status === 'tayyor').map((order) => ({ order, bucket: 'ready' }));
    }
    const groups = groupActiveOrders(orders);
    const buckets = view === 'late' ? ['late'] : ['today', 'upcoming', 'nodate'];
    return buckets.flatMap((bucket) => groups[bucket].map((order) => ({ order, bucket })));
  }, [orders, view]);

  // Faol ro'yxatda yangi (qabul kutayotgan) buyurtmalar tepada, alohida bo'limda
  const sections = useMemo(() => {
    if (view !== 'active') return [{ key: view, rows }];
    const fresh = rows.filter(({ order }) => order.status === 'yangi');
    const inProgress = rows.filter(({ order }) => order.status !== 'yangi');
    return [
      { key: 'new', title: t('q.new'), rows: fresh },
      { key: 'progress', title: t('prod.inProgress'), rows: inProgress },
    ].filter((section) => section.rows.length > 0);
  }, [rows, view, t]);

  const opened = orders.find((o) => o.id === openId) ?? null;

  return (
    <div className="space-y-3">
      {toastView}
      {ordersError && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{ordersError}</div>
      )}

      {sections.map(({ key, title, rows: sectionRows }) => (
        <section key={key} className="space-y-3">
          {title && (
            <h2 className="flex items-center gap-2 pt-2 text-sm font-bold uppercase tracking-wide text-slate-300">
              {title}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs tabular-nums">{sectionRows.length}</span>
            </h2>
          )}
          <div className={view === 'ready' ? 'grid gap-3 md:grid-cols-2' : 'space-y-3'}>
          {sectionRows.map(({ order, bucket }, index) => (
            <OrderCard
              key={order.id}
              index={index + 1}
              order={order}
              bucket={bucket}
              onOpen={(o) => setOpenId(o.id)}
            />
          ))}
          </div>
        </section>
      ))}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-[#121829] px-6 py-12 text-center text-sm text-slate-400">
          {ordersLoading ? t('api.loading') : view === 'ready' ? t('prod.emptyReady') : view === 'late' ? t('q.emptyLate') : t('q.allDone')}
        </div>
      )}

      <p className="sticky bottom-3 z-20 mx-auto w-fit rounded-full border border-white/10 bg-[#121829]/90 px-5 py-2 text-center text-sm font-semibold text-slate-200 shadow-lg backdrop-blur-md">
        {t(view === 'late' ? 'orders.totalLate' : view === 'ready' ? 'orders.totalReady' : 'orders.total', { n: rows.length })}
      </p>

      <OrderDrawer
        order={opened}
        onClose={() => setOpenId(null)}
        onAdvance={advance}
        onReject={reject}
        actionLoading={actionLoading}
      />
    </div>
  );
}
