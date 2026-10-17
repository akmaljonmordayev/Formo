import { useMemo, useState } from 'react';
import OrderDetail from './OrderDetail';
import QueueList from './QueueList';
import { useT } from './i18n';
import { useTailor } from './prefs';
import { queueOrders as initialOrders } from './mockData';

export default function Navbat() {
  const t = useT();
  const {
    orders = initialOrders,
    orderActionLoading = false,
    processOrder,
  } = useTailor() ?? {};
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('barchasi');
  const [selectedId, setSelectedId] = useState(initialOrders[0].id);
  const [mobileView, setMobileView] = useState('detail');
  const [toastMessage, setToastMessage] = useState('');
  const [toastError, setToastError] = useState(false);

  const showToast = (msg, isError = false) => {
    setToastMessage(msg);
    setToastError(isError);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleStartPress = async (order) => {
    if (!processOrder) return;
    try {
      await processOrder(order);
      const nextStatus = order.apiStatus === 'QUALITY_CHECK'
        ? 'tayyor'
        : order.status === 'qabul'
          ? 'bosildi'
          : 'tayyor';
      showToast(t('navbat.statusToast', { id: order.id, status: t(`status.${nextStatus}`) }));
    } catch {
      // The shell displays the API error; do not show a success toast.
    }
  };

  const counts = useMemo(
    () => ({
      barchasi: orders.length,
      qabul: orders.filter((o) => o.status === 'qabul').length,
      bosildi: orders.filter((o) => o.status === 'bosildi').length,
      tayyor: orders.filter((o) => o.status === 'tayyor').length,
    }),
    [orders]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      const matchTab = tab === 'barchasi' || order.status === tab;
      const matchQuery =
        !q ||
        order.customer.toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q) ||
        order.model.toLowerCase().includes(q);
      return matchTab && matchQuery;
    });
  }, [query, tab, orders]);

  const selected = orders.find((order) => order.id === selectedId) ?? filtered[0] ?? orders[0];

  const handleSelect = (id) => {
    setSelectedId(id);
    setMobileView('detail');
  };

  return (
    <div className="relative space-y-4">
      {/* Interactive Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-20 right-6 z-50 rounded-2xl px-5 py-3 text-xs font-black shadow-2xl animate-fade-in flex items-center gap-2 ${toastError ? 'bg-rose-500 text-white' : 'bg-teal-400 text-slate-950'}`}>
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile view toggle */}
      <div className="flex gap-2 xl:hidden">
        <button
          type="button"
          onClick={() => setMobileView('list')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            mobileView === 'list'
              ? 'bg-teal-400 text-slate-950'
              : 'bg-white/5 text-slate-400 border border-white/10'
          }`}
        >
          {t('navbat.list')}
        </button>
        <button
          type="button"
          onClick={() => setMobileView('detail')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
            mobileView === 'detail'
              ? 'bg-teal-400 text-slate-950'
              : 'bg-white/5 text-slate-400 border border-white/10'
          }`}
        >
          {t('navbat.detail')}
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <QueueList
          className={`${mobileView === 'list' ? 'block' : 'hidden'} xl:block`}
          orders={filtered}
          counts={counts}
          activeTab={tab}
          onTabChange={setTab}
          query={query}
          onQueryChange={setQuery}
          selectedId={selected?.id}
          onSelect={handleSelect}
        />
        <div className={`${mobileView === 'detail' ? 'block' : 'hidden'} xl:block`}>
          <OrderDetail
            order={selected}
            onStartPress={handleStartPress}
            actionLoading={orderActionLoading}
            onToast={showToast}
          />
        </div>
      </div>
    </div>
  );
}
