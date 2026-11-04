import { useEffect, useState } from 'react';
import { Clock, Search } from 'lucide-react';
import { Card } from './ui';
import { useT, orderSummary, orderTime } from './i18n';
import { cx } from './utils';

const BADGE_STYLES = {
  qabul: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40',
  bosildi: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40',
  tayyor: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40',
};

// Son 0 dan boshlab bittalab sanab chiqiladi (kamayganda darhol yangilanadi; "harakatni kamaytirish" yoqilgan bo'lsa — sanamasdan)
function useCountUp(target) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown === target) return undefined;
    if (shown > target || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(target);
      return undefined;
    }
    // Jami ~600 ms ichida sanab bo'linadi: kam bo'lsa sekinroq, ko'p bo'lsa tezroq
    const delay = Math.min(90, Math.max(25, 600 / (target - shown)));
    const timer = setTimeout(() => setShown((n) => n + 1), delay);
    return () => clearTimeout(timer);
  }, [shown, target]);
  return shown;
}

function Count({ value, className }) {
  const n = useCountUp(value);
  return <span className={cx('tabular-nums', className)}>{n}</span>;
}

function TabCount({ value, active }) {
  return (
    <Count
      value={value}
      className={cx(
        'ml-1.5 inline-block min-w-[1.25rem] rounded-md px-1 text-center text-[11px] font-extrabold',
        active ? 'bg-slate-950/15 text-slate-950' : 'bg-white/10 text-slate-300'
      )}
    />
  );
}

export default function QueueList({
  orders,
  counts = {},
  activeTab,
  onTabChange,
  query,
  onQueryChange,
  selectedId,
  onSelect,
  className,
  loading = false,
}) {
  const t = useT();

  const tabs = [
    { key: 'barchasi', label: t('queue.tab.all') },
    { key: 'qabul', label: t('queue.tab.qabul') },
    { key: 'tayyor', label: t('queue.tab.tayyor') },
  ];

  return (
    <Card className={cx('flex flex-col overflow-hidden bg-[#121829] border border-white/10', className)}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white">{t('queue.title')}</h2>
            <p className="text-xs text-slate-400">{t('queue.count', { n: orders.length })}</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-white/10 bg-[#0e1424] p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('queue.filterStatus')}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tabs.map((tab) => (
              <button
                key={`f-${tab.key}`}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={cx(
                  'rounded-lg px-3 py-1.5 text-xs font-bold',
                  activeTab === tab.key ? 'bg-teal-400 text-slate-950' : 'bg-white/5 text-slate-400'
                )}
              >
                {tab.label}
                <TabCount value={counts[tab.key] ?? 0} active={activeTab === tab.key} />
              </button>
            ))}
          </div>
        </div>

        {/* O'rtada: tanlangan holat soni (masalan "Tayyor — 3") */}
        <div className="mt-2 flex items-baseline justify-center gap-2 rounded-lg border border-teal-400/30 bg-teal-400/5 py-1" aria-live="polite">
          <Count value={counts[activeTab] ?? 0} className="text-base font-extrabold leading-none text-teal-300" />
          <span className="text-xs font-bold text-slate-300">{tabs.find((tb) => tb.key === activeTab)?.label}</span>
        </div>

        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('queue.searchPlaceholder')}
            className="w-full rounded-xl border border-white/10 bg-[#0e1424] pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-teal-500/60"
          />
        </div>
      </div>

      {/* Order Cards List */}
      <div className="flex flex-col gap-3 p-3 overflow-y-auto max-h-[calc(100vh-220px)]">
        {orders.length === 0 && (
          <div className="px-4 py-10 text-center text-xs text-slate-500">
            {loading ? t('api.loading') : t('queue.empty')}
          </div>
        )}
        {orders.map((order) => {
          const isSelected = order.id === selectedId;
          const badgeStyle = BADGE_STYLES[order.status] ?? BADGE_STYLES.qabul;

          return (
            <div
              key={order.id}
              onClick={() => onSelect(order.id)}
              className={cx(
                'group relative cursor-pointer rounded-2xl border p-4 transition-all',
                isSelected
                  ? 'border-teal-400 bg-[#172238] shadow-lg ring-1 ring-teal-400/50'
                  : 'border-white/10 bg-[#0e1424] hover:border-white/20 hover:bg-[#12192e]'
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white">{order.customer}</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">#{order.id}</p>
                </div>
                <span className={cx('rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase', badgeStyle)}>
                  {t(`status.${order.status}`)}
                </span>
              </div>

              <p className="mt-2 text-xs font-medium text-slate-300">
                {order.apiSummary || orderSummary(t, order)}
              </p>

              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-teal-400">
                <Clock className="h-3.5 w-3.5" />
                <span>{orderTime(t, order)}</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Pastda: har bir holatdagi buyurtmalar soni */}
      <div className="grid grid-cols-2 gap-1.5 border-t border-white/10 p-2">
        {tabs.filter((tb) => tb.key !== 'barchasi').map((tb) => (
          <button
            key={`s-${tb.key}`}
            type="button"
            onClick={() => onTabChange(tb.key)}
            className={cx(
              'rounded-lg px-1.5 py-1 text-center transition',
              activeTab === tb.key ? 'bg-teal-400/15 ring-1 ring-teal-400/50' : 'bg-white/5 hover:bg-white/10'
            )}
          >
            <Count value={counts[tb.key] ?? 0} className="block text-sm font-extrabold leading-none text-white" />
            <span className="mt-0.5 block truncate text-[9px] font-bold uppercase tracking-wide text-slate-400">{tb.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}
